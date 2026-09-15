# LuCI VLAN 界面设计规范与配置一致性修复

> **现状说明（重要）**：`package/luci-app-mesh-conf` 已重写。它现在只做两件事 ——
> 原生 802.11s 无线 mesh，以及有线场景下在局域网内发现同型号设备并同步
> `/etc/config/wireless`（含 802.11k/v/r）。**VLAN 编辑器已整体移除**，页面不再读写
> `bridge-vlan`。
>
> 因此本文里关于「两个页面编辑同一份 bridge-vlan 模型」的部分，只剩
> `switch-vlan` 一侧还在生效；`meshconf.js` 仍然沿用本文的设计 token（所以
> `tokencheck.js` 依旧适用），但 §1.1 的端口互读问题、§4 的端口标记一致性、
> `portcheck.js` 所校验的 `vlan_port_role()` 都已随功能一起下线 —— `portcheck.js`
> 现在检测不到该函数会输出 `SKIP` 而不是失败。保留本文作为 token 与设计决策的
> 唯一事实来源。

适用范围（历史）：`/cgi-bin/luci/admin/network/switch-vlan`（上游 LuCI 的交换机视图）与
`package/luci-app-mesh-conf`（本仓库的 Mesh 组网页）。两个页面曾经编辑的是**同一份**
`/etc/config/network` 的 `bridge-vlan` 模型，因此必须共用一套设计语言，并且必须
对配置有完全一致的读法与写法。

文档里的所有色值、字号、间距都是唯一事实来源；`meshconf.js` 的 `var css` 与
`switch-vlan.css` 是它的两份镜像（见文末「为什么是两处镜像而不是一个共享文件」）。

---

## 1. 问题诊断

### 1.1 视觉不一致（改前）

| 维度 | switch-vlan | meshconf（改前） |
| --- | --- | --- |
| 颜色来源 | LuCI 主题变量（`--background-color-*` / `--text-color-*` / `--border-color-*` / `--primary-color-high`），跟随主题 | 硬编码 GitHub Primer 调色板（`--nm-*`），**完全忽略主题** |
| 深色模式 | `:root[data-darkmode="true"]` 覆盖 | 运行时读取 `document.body` 背景色亮度后拼字符串 |
| 字号 | `em`，相对 LuCI 主题基准字号 | 固定 `font-size:13px` + 自带 `font-family` |
| 圆角 | 2px / 4px | 8 / 9 / 10 / 12px |
| 间距 | `em` 松散刻度 | px 硬编码 |
| 断点 | 720px | 900px / 760px |
| U / T 语义 | 青绿 `#0d9488` / 琥珀 `#d97706` 药丸按钮 | `<select>` 纯文本 `U` / `T`，无颜色 |

结论：两个页面既不是同一套颜色，也不是同一套字号与圆角，深色模式还各有一套机制。
其中「跟随主题」这一条最关键——meshconf 的固定调色板让它在一台深色主题的路由器上
与旁边所有页面都不像同一个产品。

### 1.2 配置不一致（改前，逐条有证据）

| # | 现象 | 证据 | 后果 |
| --- | --- | --- | --- |
| 1 | meshconf **读不懂**官方页面写的端口标记 | 上游 `tools/bridgevlan.js` 的 `formatPortSpec()` 把 untagged/PVID 端口写成**裸端口名**（`lan3`），tagged 写成 `lan3:t`；而本页的 `vlan_ports_of()` 只识别 `*:u*` 和 `*:t*` | 在官方页面配好的 `lan3`（或 `lan3:*`）在本页显示为「未加入」；本页一旦「应用」就会把该端口从 bridge-vlan 里**静默删除** |
| 2 | `option local` 从未被写入 | netifd 对缺失的 `local` 取默认值 **true**，官方视图有 Local 勾选框（`parseLocal()`），本页没有这个概念 | 本页生成的 bridge-vlan 与官方页面的显示语义靠默认值巧合对齐；一旦有人在官方页面取消 Local，本页仍会去建 `br-lan.<ID>` 接口，而 netifd 根本不会创建该设备 |
| 3 | DHCP 服务器开关**永远是未勾选** | `buildVlanRow()` 里 `dhcp.checked = false` 写死；`getStatus()` 也没有回传该状态 | 只要重新「应用」任意一次 VLAN 改动（哪怕只是加一个网段），`apply_vlans()` 就会对未勾选的网段写 `dhcp.<iface>.ignore='1'`，**把已在运行的 DHCP 服务器关掉** |
| 4 | 本页允许「同一端口在两个 VLAN 里都是 U」 | 官方 `bridgevlan.js` 的 `checkUnsupportedConfig()` 把它判为不支持并**整页拒绝渲染**；本页 `vlanErrors()` 只查了 ID 范围与重复 | 本页能写出一份官方页面拒绝显示的配置 |
| 5 | 端口网格列出的端口比官方页面多 | 后端 `bridge_port_list()` 返回 br-lan 的全部成员，前端只过滤了 `bat0` | `wlan0` / `phy0-ap0` / `mesh0` 这类虚拟接口被当作交换机端口给出 U/T 选项；写进 `bridge-vlan.ports` 是无意义的 |
| 6 | 端口标记拼写与全树其它写入方不同 | 改前写 `"${port}:u*"`；官方视图写裸 `lan3`；`config_generate` 也写板级原样值 | 同一份配置里出现两种风格 |

---

## 2. 设计 token

颜色分两层：**表面 / 文字 / 边框映射到 LuCI 主题变量**（主题自己决定明暗，我们只
决定语义），**语义强调色自己定义**（主题没有这一层）。

### 2.1 浅色

| token | 值 | 用途 |
| --- | --- | --- |
| `--ds-surface` | `var(--background-color-high,#fff)` | 卡片、输入框 |
| `--ds-surface-sunken` | `var(--background-color-medium,#f6f8fa)` | 次级底板、表头 |
| `--ds-border` | `var(--border-color-low,#d8dee4)` | 分隔线、普通边框 |
| `--ds-border-strong` | `var(--border-color-medium,#b8c0c8)` | 选中态描边 |
| `--ds-text` | `var(--text-color-high,#1f2328)` | 正文 |
| `--ds-text-muted` | `var(--text-color-low,#5c6773)` | 辅助文字 |
| `--ds-primary` | `var(--primary-color-high,#0969da)` | **仅限非文字**：焦点环、边框、勾选框强调 |
| `--ds-primary-text` | `#0969da` | 蓝**文字**、白字底色徽标（主题主色不保证对比度） |
| `--ds-ok` / `-tint` / `-line` | `#1a7f37` / `rgba(26,127,55,.08)` / `rgba(26,127,55,.35)` | 正常状态 |
| `--ds-warn` / `-tint` / `-line` | `#bc4c00` / `rgba(188,76,0,.08)` / `rgba(188,76,0,.35)` | 警告 |
| `--ds-error` / `-tint` / `-line` | `#cf222e` / `rgba(207,34,46,.08)` / `rgba(207,34,46,.40)` | 错误、冲突 |
| `--ds-info` / `-tint` / `-line` | `#0969da` / `rgba(9,105,218,.08)` / `rgba(9,105,218,.35)` | 信息 |
| `--ds-focus-ring` | `rgba(9,105,218,.32)` | **焦点光晕**专用：3px `box-shadow`，故意比 tint 浓 |
| `--ds-accent` / `-tint` | `#6f42c1` / `rgba(130,80,223,.10)` | Mesh / 标签 |
| `--ds-untagged` / `-tint` | `#0f766e` / `rgba(13,148,136,.10)` | **U**，青绿 |
| `--ds-tagged` / `-tint` | `#92400e` / `rgba(217,119,6,.10)` | **T**，琥珀 |

### 2.2 深色

`:root[data-darkmode="true"]`，只覆盖语义强调色 —— 表面与文字已经由主题变量带走。
深色下 tint 用 `.18` 而不是 `.08`：`.08` 的淡洗在深色底上根本看不见。

```
--ds-ok:#4ac26b  --ds-warn:#e3934a  --ds-error:#f47067  --ds-info:#4d9cf6
--ds-primary-text:#4d9cf6  --ds-accent:#a98bf5
--ds-untagged:#2dd4bf  --ds-tagged:#fbbf24   （tint 一律 alpha .18）
--ds-focus-ring:rgba(77,156,246,.45)
```

### 2.3 对比度实测（WCAG 2.2）

用脚本按 WCAG 相对亮度公式计算，tint 先与底色 alpha 合成再测（即按实际绘制结果）。
下表由 `scripts/luci-ui-checks/contrast.js` **从样式表解析 `--ds-*` 后**算出，
可重跑复核（33 组配对，全部达标）。

| 前景 | 背景 | 实测 | 要求 | |
| --- | --- | --- | --- | --- |
| `#1f2328` | `#ffffff` | 15.80:1 | 4.5 | ✅ |
| `#5c6773` | `#ffffff` | 5.76:1 | 4.5 | ✅ |
| `#5c6773` | `#f6f8fa` | 5.42:1 | 4.5 | ✅ |
| `#1a7f37` ok | `#edf5ef` | 4.57:1 | 4.5 | ✅ |
| `#bc4c00` warn | `#faf1eb` | 4.52:1 | 4.5 | ✅ |
| `#cf222e` error | `#fbedee` | 4.71:1 | 4.5 | ✅ |
| `#0969da` info | `#ebf3fc` | 4.64:1 | 4.5 | ✅ |
| `#6f42c1` accent | `#f3eefc` | 5.72:1 | 4.5 | ✅ |
| `#0f766e` **U** | `#e7f4f3` | 4.86:1 | 4.5 | ✅ |
| `#92400e` **T** | `#fbf1e6` | 6.36:1 | 4.5 | ✅ |
| 白字 | `#0969da` 徽标 | 5.19:1 | 4.5 | ✅ |
| 白字 | `#0f766e` / `#92400e` | 5.47 / 7.09:1 | 4.5 | ✅ |
| 白字 | `#1a7f37` / `#bc4c00` / `#cf222e` / `#6f42c1` | 5.08 / 5.03 / 5.36 / 6.51:1 | 4.5 | ✅ |
| 深色：`#f0f3f6` | `#1e1f22` | 14.80:1 | 4.5 | ✅ |
| 深色：`#a7adb5` | `#1e1f22` | 7.29:1 | 4.5 | ✅ |
| 深色：`#2dd4bf` **U** | `#1e1f22` | 8.85:1 | 4.5 | ✅ |
| 深色：`#fbbf24` **T** | `#1e1f22` | 9.87:1 | 4.5 | ✅ |

**焦点指示器分层实测**（把 `box-shadow` 的透明色先与表面合成，再按实际绘制结果测）：

| 图层 | 合成后 | 底色 | 实测 | 承担的要求 | |
| --- | --- | --- | --- | --- | --- |
| 3px 光晕 `rgba(9,105,218,.32)` | `#b0cff3` | `#ffffff` | 1.61:1 | 补充提示，**不**承担 3:1 | ○ |
| 1px 主色边 / 2px 描边 `#0969da` | — | `#ffffff` | 5.19:1 | 3.0（SC 2.4.11） | ✅ |
| 3px 光晕 `rgba(77,156,246,.45)` | `#335781` | `#1e1f22` | 2.21:1 | 补充提示，**不**承担 3:1 | ○ |
| 1px 主色边 / 2px 描边 `#4d9cf6` | — | `#1e1f22` | 5.81:1 | 3.0（SC 2.4.11） | ✅ |

> 光晕为什么可以只有 1.6:1：它**不是**合规依据。焦点态是三层叠加 —— 3px 淡光晕
> （柔和过渡，鼠标点击也好看）、1px 主色边框、键盘触发时额外的 2px 主色描边。
> 后两者都是 5.19:1 / 5.81:1，单独任一层就已满足 SC 2.4.11 的 3:1。
> 反过来说，**不能**只留光晕：所以上一版把 `--ds-info-tint`（alpha `.08`，合成后仅
> **1.12:1**）拿来当 3px 焦点环是错的，本次换成专用的 `--ds-focus-ring`（`.32`，
> 1.61:1，是前者 1.44 倍），并且拆掉了 `:focus{outline:none}` —— 它与
> `.meshconf-page :focus-visible` 同族但特异性更高（`.nm-field input:focus` = 0,2,1 >
> `.meshconf-page :focus-visible` = 0,2,0），会把全局键盘描边一起吃掉，属于 SC 2.4.7
> 回归。现在键盘焦点由 `:focus-visible` 显式补回描边。
> 这两个数（1.12 / 1.61）由 `scripts/luci-ui-checks/ringcheck.js` 算出并断言。

**在上游 switch-vlan 中实测出的缺陷**（本次一并修掉）：

| 前景 | 背景 | 实测 | 要求 | 处置 |
| --- | --- | --- | --- | --- |
| `#0d9488` U | `#e2f2f1` | **3.25:1** | 4.5 | 改 `#0f766e` |
| `#d97706` T | `#faecdc` | **2.75:1** | 4.5 | 改 `#92400e` |
| `#8250df` 标签 | `#f0eafb` | **4.29:1** | 4.5 | 改 `#6f42c1` |
| `#3c8dbc`（主题主色）当文字 | `#ffffff` | **3.67:1** | 4.5 | 蓝文字一律改用 `--ds-primary-text`，主题主色只用于非文字 |

> 把 U/T 的两个色值调深，视觉上色相不变（青绿仍是青绿、琥珀仍是琥珀）；它们同时
> 被用作边框与实心底，调深对这两种用途也只会更安全。`#b45309` 作为 T 的文字色是
> 4.50:1 —— 刚好压线，因此选 `#92400e` 留出余量。

---

## 3. 字体方案

一条规则：**只用 `em`，不写 px，不覆盖 `font-family`。**

LuCI 主题决定基准字号（bootstrap 13px、material 14px…），写死 13px 就等于
在一个 16px 的主题里整体小一号；而 `rem` 又会因为主题通常不给 `html` 设字号而
跳回 16px。所以相对刻度只能用 `em`（switch-vlan 本来就是这么做的）。

| token | 值 | 用途 |
| --- | --- | --- |
| `--ds-fs-xs` | `.8em` | 表内注释、徽标、图例 |
| `--ds-fs-sm` | `.88em` | 辅助文字、提示、表格正文、按钮 |
| `--ds-fs-base` | `1em` | 正文、输入框、字段标签 |
| `--ds-fs-lg` | `1.1em` | 区块标题、统计数值 |
| `--ds-fs-xl` | `1.35em` | 统计主数值 |
| `--ds-fs-2xl` | `1.6em` | 页面标题 `h2` |

等宽字体只用于设备名、VLAN ID、配置预览：`ui-monospace, SFMono-Regular, Consolas, monospace`。

**`em` 会逐层叠缩**：`.nm-table` 是 `.88em`，里面的 `.nm-mono` 再乘 `.8em` 就只有
`0.70em`（13px 基准下约 9px）。因此对「表格 / 键值对里再嵌一层」的元素显式回补：

```css
.nm-table .nm-mono, .nm-table .nm-state, .nm-table .nm-tag, .nm-kv-item .nm-mono { font-size: .95em; }
```

---

## 4. 布局、间距与圆角

| token | 值 | 说明 |
| --- | --- | --- |
| `--ds-sp-1` … `--ds-sp-5` | `.25em / .5em / .75em / 1em / 1.5em` | 4 级间距刻度，全部 `em` |
| `--ds-r-sm` | `4px` | 输入框、小徽标、分段控件 |
| `--ds-r-md` | `6px` | 卡片、端口瓦片、行容器 |
| `--ds-r-lg` | `8px` | 区块卡片、拓扑画布 |
| `--ds-r-pill` | `999px` | 状态药丸 |

- **网格**：一律用 `repeat(auto-fit, minmax(<min>, 1fr))`，不写媒体查询。
  表单 `.nm-form` 最小 190px、选项卡 `.nm-choices` 最小 240px、AP 卡 260px、
  信息格 148px、端口 11em（沿用 switch-vlan）。
- **断点只有一个**：`720px`，与 switch-vlan 相同。改前 meshconf 用 900/760 两个
  断点，导致同一窗口宽度下两个页面切换形态的时机不一样。
- **触控目标**：分段控件的每个按钮 `min-width:26px; min-height:24px`，满足
  WCAG 2.2 SC 2.5.8 的 24×24 最小目标。

---

## 5. 组件清单

| 组件 | class | 状态 |
| --- | --- | --- |
| 区块卡片 | `.nm-section` | 默认 |
| 状态药丸 | `.nm-pill` | 默认 / `.ok` / `.warn` / `.info`，均带 `currentColor` 圆点（非纯色传达） |
| 警告横幅 | `.nm-banner` | 默认(warn) / `.bad`(error) / `.info` |
| 选项卡 | `.nm-choice` | 默认 / hover / `.active` / `.disabled` / `:focus-within` |
| 输入字段 | `.nm-field` | 默认 / `:focus`(主色边 + 3px `--ds-focus-ring` 光晕) / `:focus-visible`(额外 2px 主色描边) / `:disabled` / `.hidden` |
| **端口出口分段控件** | `.nm-port-set` + `.nm-port-opt` | `—`(不加入) / `U` / `T`，`aria-pressed` + `data-role`，键盘可操作 |
| 端口瓦片（Switch 页） | `.svc-port-tile` | 默认 / hover / `.selected` / `:focus-visible` |
| VLAN 行 | `.nm-vlan-row` / `.svc-vlan-row` | 默认 / `.removed`(虚线) / `.conflict`(错误边) |
| 表格 | `.nm-table` | 表头下沉底板、`.num` 右对齐 |
| 高级参数 | `.nm-details` | 收起 `▸` / 展开 `▾` |
| 空态 | `.nm-empty` | 虚线框 + 居中提示 |

**两个页面的 U/T 交互为什么形式不同**：switch-vlan 是「先多选端口、再整批赋 U/T」
的两段式，所以用 `Select ports` / `Assign membership` 两组三态按钮；meshconf 是一
行一个 VLAN、逐端口点选，所以用一格里 `— / U / T` 的分段控件。**模型相同
（off / untagged / tagged）、颜色语义相同、同一端口只能有一个 untagged 的规则也
相同**，只是控件形状服从各自的操作流程。

---

## 6. 无障碍检查清单

- [x] 正文对比度 ≥ 4.5:1，非文字 UI ≥ 3:1（数据见 §2.3）
- [x] 焦点可见：`.meshconf-page :focus-visible` 与 `#switch-vlan-view *:focus-visible`
      统一 2px 主色描边；表格内按钮用 `outline-offset:-2px` 避免被裁掉
      （WCAG 2.2 SC 2.4.7 / 2.4.11）
- [x] 输入框不吞掉键盘焦点环：原来的 `:focus{outline:none}` 特异性高于全局
      `:focus-visible` 规则，会把键盘描边一并取消；现改为
      `:focus`(主色边+光晕) 与 `:focus-visible`(补回 2px 描边) 两条并存。
      光晕用专用 `--ds-focus-ring`（合成后 1.61:1），合规由 5.19:1 的边框/描边承担
- [x] 焦点环对比度实测见 §2.3「焦点指示器分层」；不存在只靠 3px 淡光晕承担 3:1 的情况
- [x] 不只靠颜色传达状态：状态药丸带圆点 + 文案；冲突 VLAN 行除描边外附
      `title` 说明具体端口（SC 1.4.1）
- [x] 分段控件是真正的 `<button>`，带 `aria-pressed` 与 `role="group"` +
      `aria-label`，可用键盘操作
- [x] 触控目标 ≥ 24×24（SC 2.5.8）
- [x] 语义化优先：`<button type="button">`、`<summary>`、`<label>` 包裹控件；
      没有为了样式而改用 `div`
- [x] 深色模式不再靠运行时猜：`data-darkmode` 是主题自己声明的属性
- [ ] **未覆盖**：拓扑 SVG 的 `aria-label` 只有整体描述，节点级信息仍以文本表格
      （`.nm-table`）形式并列提供；如需完整等价文本需另做

---

## 7. 配置一致性修复

### 7.1 后端 `root/usr/libexec/rpcd/luci.meshconf`

1. **端口标记解析改为与上游同语法**（新增 `vlan_port_role()`）：
   `port` / `port:u` / `port:u*` → untagged；`port:t` / `port:t*` → tagged；
   `port:ut` → 两者；`port:*` → 只有 PVID，两者都不是；非法 → `n`。
   **验证**：把该函数与上游 `tools/bridgevlan.js` 里真实的 `parsePortSpec()` 源码
   分别抽出，对 17 个标记逐一比对，17/17 一致。
2. **写入改为规范拼写**：untagged 写裸端口名（去掉了 `:u*`），与官方视图的
   `formatPortSpec()`、以及 `config_generate` 的写法统一。
3. **显式写 `option local`**，并真正按它决定是否建接口：
   - `local=1`：照旧建 `br-lan.<ID>` 接口 + DHCP + 防火墙区域成员；
   - `local=0`：纯二层透传，**不建接口**，并把此前遗留的同名接口（连同 dhcp 段与
     区域成员）删掉——否则它会挂在一个 netifd 不会创建的设备上；
   - VLAN 1 恒定 `local=1`（管理地址就在 `br-lan.1` 上），`vlan_sync_lan_device()`
     里合成的管理 VLAN 同样补写 `local=1`。
4. **拒绝无法无损往返的标记**：新增 `vlan_foreign_specs()`，br-lan 上出现
   `port:ut` 或 `port:*` 时拒绝应用并给出具体标记；`getStatus()` 新增
   `vlan_foreign` 字段，前端在「当前状态」区提前显示横幅，而不是等点了应用才报错。
5. **拒绝跨 VLAN 的 untagged 冲突**：新增的 `vlanErrors()` 对应检查 + 后端
   `apply_vlans()` 的**写前预检**（整份 payload 先校验完再动 UCI，避免校验失败时
   在 rpcd 会话里留下半套已改但未 commit 的配置，被下一次调用顺带 commit）。
6. **回传真实状态**：`vlan_list()` 新增 `"local"` 与 `"dhcp"`；`dhcp` 由
   `dhcp.<iface>.ignore` 与 `.dhcpv4` 推导。前端据此初始化勾选框，
   消除「重新应用会把 DHCP 服务器关掉」的数据损坏路径。
7. **端口列表只保留物理端口**：新增 `is_physical_lan_port()`，排除
   `bat0` / `mesh_*` / `wl*` / `wlan*` / `phy*` / `br-*` / `tun*` / `tap*` /
   `ppp*` / `wg*` / `gre*` / `sit*` / `6in4*`。这些接口同样被 netifd 塞进 br-lan，
   但没有一个能承载本页要写的 tagged 出口。

### 7.2 前端 `htdocs/.../meshconf.js`

- 字段名对齐 LuCI 网络页用词：`IPv4 地址` / `IPv4 子网掩码` / `IPv4 网关` /
  `DNS 服务器` / `启用 DHCPv4 服务器` / `接口名（UCI 名称）`——同一个值在两个页面
  上叫同一个名字。
- 新增「本机终止（分配地址）」勾选框；取消勾选时地址字段整体隐藏
  （没有 `br-lan.<ID>` 就没有地址可配），并显示说明。VLAN 1 勾选框固定勾选且禁用。
- 端口单元格由 `<select>` 改为 `— / U / T` 分段控件；选择 U 时**自动**把该端口从
  其它行的 U 中移出（与官方视图 `applyUntaggedVlanToSelection()` 的行为一致），
  违规配置则由校验兜底。
- 每行按 `untaggedOwners()` 标记冲突（描边 + `title`）。
- 焦点样式拆成两条：`:focus` 只给主色边 + 3px `--ds-focus-ring` 光晕，
  `:focus-visible` **额外**补回 2px 主色描边。原因是原来的
  `.nm-field input:focus{outline:none}`（(0,2,1)）特异性高于全局
  `.meshconf-page :focus-visible`（(0,2,0)），会把键盘描边一起取消 —— 同一个坑，
  上游 switch-vlan 里也有（见 §7.3）。

### 7.3 上游 `view/network/switch-vlan.css`（feed 补丁）

`patches/feeds/luci/.../view/network/102-align-switch-vlan-design-tokens.patch`：

- U/T 文字色 → `#0f766e` / `#92400e`（对比度 3.25→4.86、2.75→7.09）
- 键盘焦点可见性规则（见下），端口瓦片圆角 4→6px、输入框圆角 2→4px

**焦点规则为什么要写成这样**：上游有三处 `:focus { outline: none }`，其中一处
`#switch-vlan-view input[type="text"]:focus` 特异性 (1,2,1)，而
`.svc-port-label` / `.svc-vlan-label` 是 `<input type="text">`、
`.svc-vlan-id-input` 是 `<input type="number">`，**都被它命中**。于是：

- 加一条「顺手的」`#switch-vlan-view input:focus-visible`（(1,1,1)）会**输**给它，
  patch 应用成功、却什么都没改变 —— 键盘用户依然看不到焦点；
- 正确做法是**镜像上游选择器**使特异性打平（(1,2,1)），再把规则块放在**文件最末**，
  靠源码顺序赢下平局。所以这段必须留在 EOF。

同时保留 `:focus` 上的 `outline: none`：鼠标点击只显示主色边框（上游原本的视觉意图），
焦点环只为 `:focus-visible`（键盘）恢复。

**验证**：在临时 git 仓库（根 = feed 根）中以构建脚本完全相同的方式
（`git -C <feed root> apply` 读 stdin）对上游原文件执行，`--check` 与应用均通过；
另用一个极小的层叠求值器模拟「键盘/鼠标焦点在哪个元素上、哪条 `outline` 胜出」，
见 §10 第 8 条。

---

## 8. 已评估但**未**改动

| 项 | 结论 |
| --- | --- |
| 给 meshconf 补一个「只保留物理桥成员」的 feed 补丁 | **不需要**。原本的推断是 `bat0` 会让 `findActiveBridge()` 的全端口 `switch`/`ethernet` 检查失败、把 switch-vlan 整页拦成「不支持的配置」。核对了 `luci-base/.../network.js` 的 `Device.getType()`：它**没有**对 batman-adv 的特判，`bat0` 落到 `else return 'ethernet'`，因此该检查是通过的。既有的 `100-skip-wireless-bridge-members.patch` 已经处理了真正会失败的那一类（`getType()==='wifi'` 的 VAP）。 |
| 由 meshconf 补写 `option vlan_filtering '1'` | **不做**。`tools/network.js` 里该选项的默认值由「是否存在 `device` 匹配的 `bridge-vlan` 段」推导，而 `bridgevlan.js` 的 `isVlanFilteringEnabled()` 也把「存在 bridge-vlan」视为已开启。meshconf 单独写它只会制造差异，不多任何行为。 |
| 上游样式里全部圆角统一到刻度 | **只做了端口瓦片与输入框**。VLAN 行的圆角是以 `4px 0 0 4px` 形式写在首尾单元格上的，需要四处联动修改；收益小、上游漂移后的 rebase 成本高，故留白。 |
| 给「纯透传网段」做完整的图形化流程 | 后端已支持 `local=0` 且前端可表达，但校验目前会拦下「本机终止关闭 + 本页仍要建接口」的组合并提示改用网络页管理。做成端到端可用的透传编辑流程还牵涉 `vlan_sync_lan_device` 与 SSID 绑定侧的联动，不在本次范围。**注意与 §11「桥级全部透传」区分**：后者是**整座桥不做任何 `bridge-vlan` 分段**，一键切回即可，已实现；这里未做的是**单个网段**（`br-lan.<ID>` + `local=0`）的逐段透传编辑。 |

---

## 9. 为什么是两处镜像而不是一个共享文件

两个页面分属两个包：`luci-mod-network` 来自 feed 补丁，`luci-app-mesh-conf` 是本仓库
的包，**两者都可能单独存在**（mesh-conf 可以卸载）。让上游样式去 `require` 一个由
本包提供的文件会把两个包的安装关系绑死；反过来让本包依赖 feed 里的文件同理。
因此选择：**取值在本文档中唯一定义，两边各自内联同一份 token 块**，并在两处代码里
互相指向本文件。代价是改色值要改两处，收益是任一页面都能独立工作。

---

## 10. 交付物与验证方式

| 交付物 | 位置 |
| --- | --- |
| 本规范 | `docs/design-luci-vlan-ui.md` |
| 前端（样式层 + VLAN 段 + 校验 + 横幅） | `package/luci-app-mesh-conf/htdocs/luci-static/resources/view/meshconf/meshconf.js` |
| 后端（解析 / 书写 / local / 校验 / 端口集） | `package/luci-app-mesh-conf/root/usr/libexec/rpcd/luci.meshconf` |
| 上游样式补丁 | `patches/feeds/luci/.../view/network/102-align-switch-vlan-design-tokens.patch` |
| 校验脚本（可重跑） | `scripts/luci-ui-checks/`，用法与覆盖范围见该目录 `README.md` |

补丁是**生成**出来的，不是手写的：改动写进 `scripts/luci-ui-checks/make-css-patch.js` 的
`REPLACEMENTS` / `FOCUS` 再重新生成。直接编辑 `.patch` 会在下次生成时被覆盖。

已执行的校验（脚本均可重跑，全部通过）：

1. **JS 语法**：按 LuCI 的加载形态（`new Function` + `'use strict'`）解析通过。
   这一步抓到一个真实问题：CSS 里的 `\25B8` 转义在 `'use strict'` 下是非法八进制
   转义，已改回字面字符。
2. **Shell 语法**：`bash -n` 通过（`luci.meshconf`、`meshconf-fix`）。
3. **端口标记解析一致性**：与上游 `parsePortSpec()` 真实源码逐例比对，17/17 一致。
4. **feed 补丁可应用性**：对上游原文件按构建脚本的方式 `git apply --check` + `apply`
   均通过（100 与 102 两个 LuCI 补丁；其余非 LuCI 补丁无本地快照，报 SKIP 而非 FAIL）。
5. **配色对比度**：按 WCAG 相对亮度公式实测，33 组配对全部达标；同时定位并修正了
   上游 switch-vlan 中 4 处不达标色值。

   > 这里的数字**从样式表里读 token 再算**，不是把值抄进脚本。最初那版脚本自己带了一份
   > tint 的 alpha 副本；当样式表最终定在 `.08` 时那份副本已经过期，脚本开始报**不存在的
   > 失败**（也在按**已经不再使用**的值给绿灯）。改成从 `meshconf.js` 解析 `--ds-*` 之后，
   > 脚本、本文档与线上取值三者一致 —— 正是本次要消除的那类不一致。

6. **token 接线自检**：脚本解析样式表，核对「声明 vs 引用」——43 个 `--ds-*` 声明、
   43 个被引用，无引用未声明、无重复声明；174 条 CSS 字面量的花括号全部配平；
   并断言没有任何 `:focus` 规则残留 `outline:none`（防止 §6 那条回归再出现）。
7. **焦点指示器分层对比度**：把光晕的透明色先与表面合成再测 —— 光晕 1.61:1（仅作
   补充），边框/描边 5.19:1（浅）/ 5.81:1（深），达标图层为 0 缺失。脚本同时把上一版
   被否掉的候选值（`--ds-info-tint` `.08` = 1.12:1）也测出来并**断言它确实不达标**，
   免得日后有人"觉得也够用"再改回去。
8. **层叠求值（改前 vs 改后）**：写了一个约 150 行的迷你 CSS 层叠求值器 —— 解析规则、
   按 (id, class, type) 算特异性、对一棵小元素树做后代选择器匹配、最后判定哪条
   `outline` 胜出，并区分是**靠特异性**还是**靠源码顺序**赢的。注意必须支持属性选择器：
   第一版求值器把 `[...]` 直接丢掉，于是「决定性的一条规则」根本没参与比较，
   却给出了全绿结果 —— 属于**假阳性**，修好后才可信。

   | 元素（键盘焦点） | 改前 | 改后 |
   | --- | --- | --- |
   | `.svc-port-label` `<input type=text>` | `outline: none` ❌ | 2px 主色描边 ✅（靠源码顺序胜过上游 `input[type="text"]:focus`） |
   | `.svc-vlan-label` `<input type=text>` | `outline: none` ❌ | 同上 ✅ |
   | `.svc-vlan-id-input` `<input type=number>` | `outline: none` ❌ | 2px 主色描边 ✅ |
   | `.svc-port-tile` / 表格内 `.cbi-button` | 无声明（靠主题默认） | 2px 主色描边 ✅ |

   同一套求值器也确认改后**鼠标**点击时仍是 `outline: none`（保留了上游的视觉意图）。

**未在本机验证的**（本机无路由器运行环境）：真机上 netifd 对 `local=0` 的实际表现、
分段控件在目标 LuCI 主题下的渲染效果、以及端到端的 apply → reload 流程。建议按
以下顺序在设备上复核：先在网络页确认 br-lan 的 `bridge-vlan` 由官方视图写好后，
打开 meshconf 页确认端口 U/T 显示与官方一致（不要点应用），再改一个非管理网段验证
`local` / `dhcp` 往返。

---

## 11. 向导的默认策略（阶段 2）

本节记录向导「开箱即用」的默认值。原则是：**默认配置不要求操作者理解 `bridge-vlan`
模型，也不需要逐项设置就能组网**；需要精细控制时再显式切换。

### 11.1 二层默认「全部透传」

不启用 VLAN 分段时，**不需要任何设置**：没有 `bridge-vlan` 段的节点，`bat0` 作为
`br-lan` 的**普通成员**本身就承载全部流量，全网一个子网。

- 后端新增 `apply_flat_bridge()`：删除 `br-lan` 上全部 `bridge-vlan` 段、删除
  遗留的 `br-lan.<ID>` 接口（跳过 `lan`）、回填已收集的物理端口。
  这是**从 filtered 模式回到 flat 的唯一出口**，由 `callApplyVlans(payload, 'flat')` 触发
  （自定义分段走 `callApplyVlans(payload, 'custom')`，两条路径显式区分，不依赖后端默认值）。
- 前端 `renderVlanSection()` 给出 flat / custom 二选一卡片，**默认 flat**；
  仅当桥确实处于 filtered 且存在 VLAN 时才默认 custom。
- ⚠️ **顺序坑**：`network.lan.device` 必须在调用 `ensure_lan_bridge()` **之前**
  设为 `br-lan`。否则 `ensure_lan_bridge()` 会把 `network.lan.device` 的旧值
  （如 `br-lan.1`）当作**字面端口**重新加回桥成员。
- filtered 模式下 `trunk`（bat0 是否跨节点透传各 VLAN）**默认视为开启**——
  flag 缺失即按 `bat0:t` 处理，只有显式 `0/false/no/off/disabled` 才排除。
  这样"逐 VLAN 新建"不会得到一台不互通回程的机器。

### 11.2 回程：默认有线，无线仅 5G/6G

- 默认选中**有线回程**（`br-lan` 整桥作 `batadv_hardif`，bat0 开桥环路避免）。
- 无线回程**只允许 5G/6G**：后端 `apply_mesh()` 读 `wireless.<radio>.band`，
  非 `''/5g/6g` 直接返回 `success:false` 并说明原因；前端 `backhaulCandidates`
  只保留 `band === '5g' || '6g'`（**不再回退成全量 radio**），有 6G 时优先，
  无候选或缺 `wpad-mesh` 时把 radio 选择置灰并给出原因。
- 参考实现（`orangeyoo/XR1710G-OpenWrt-iStoreOS-Community` 的 `MESH-GUIDE-ZH.md`）
  是 **6G-only**，其信道/EHT160 默认值**未照抄** —— 本向导明确要求 5G/6G 皆可。

### 11.3 无线覆盖：一个开关，不再编辑 SSID

`generate_child_config()` **整份复制** `/etc/config/wireless`，因此 SSID / 加密 /
密钥**根本不需要本页重写**。于是：

- 删除逐 SSID 编辑器，改为**只读**覆盖摘要 `coverageRows()`（每 radio 一行，
  显示 SSID 名与信道信息），配合单个 `apSyncInput` 勾选框。
- 该勾选框的**语义随角色反转**：主/对等设备为「下发各 radio 的无线配置…」（默认勾选），
  子设备为「接受主机各 radio 的无线配置…」（默认勾选）。取消即保留本机当前 AP 设置。
- `getStatus()` 新增 `ap_sync_set` 以区分**「用户主动取消勾选」**与**「从未设置」**——
  仅后者才按默认勾选处理，避免把有意取消的节点又拉回下发。
- 频道规划改为独立的「仅应用频道规划（不改动 Mesh）」按钮，不再与 Mesh 应用耦合。
- `ap_configs` 允许为空 `[]`（后端对空 per-radio payload 放行），前端也不再收集
  per-SSID 内容。

### 11.4 移除配置备份与回滚

`backup_configs` / `backup_rotate` / `list_backups` / `restore_backup`、三处调用点、
`getStatus()` 的 `backups` 字段、ACL 的 `listBackups` / `restoreBackup`、前端
`renderRollbackSection` 整套 UI，共**五处**全部移除。改配置前请自行在设备上备份
（`/etc/config/`）。

### 11.5 校验

`scripts/luci-ui-checks/` 全套 exit 0：`syncheck`（2372 行）、`tokencheck`（43/43）、
`portcheck`（17/17）、`contrast`（33 组 0 失败）、`ringcheck`（0 缺失）、
`make-css-patch`（3395 bytes / 4 hunks，**与阶段 1 字节一致**）、
`applycheck`（2 applied、2 skipped、0 failed）、`cascadecheck`（0 失败）。
另：`bash -n` 后端 exit 0；ACL 为合法 JSON；`backup|listBackups|restoreBackup`
在后端与前端**引用数均为 0**。

> `cascadecheck.js` 读的是**补丁产物**而非仓库文件（产物只存在于 `make-css-patch.js`
> 建的临时 `feedsim` 仓库里）。它现在**无参数时自动解析该路径**，被指向
> `snapshot/switch-vlan.css` 会提示"这是改前基线，键盘行预期失败"。
