# XR1710G B27 r22：与上游的差异、修改依据及验证记录

本说明对应 2026-11-16 的 PR。比较基线是上游 `master` 和最新稳定发布 `20261115` 标签共同指向的 `9a70b25731dc64822dcb24cf9a7dbe7a84ed1ba1`；已构建、测试并交付的代码提交为 `4184aa261aac40c0364f867676e4339d4b5e4271`。后续本 PR 的说明/证据提交不改变该固件的生产源码。

这里比较可核验的标签源码，没有下载上游发布 ITB 做二进制对照。发布资产文件名中的提交短号与当前标签不同，因此不推断发布镜像一定具有标签源码中的每一处行为。

## 审阅范围与结论

本 PR 汇总当前本地相对于上游的完整差异，不将所有增量称为已确认缺陷或性能修复。在新增本说明和证据前，差异是 270 个文件、49,543 行增加、438 行删除；大量是主题、测试、反汇编核对和历史记录，不代表修复数量。

- 可单独评审的错误处理/兼容性修复：PPPoE 候选隔离与长度边界、认证文件失败传播、原厂独立 DSD 读取、BA 失败清理、DAWN 崩溃防护、QDMA 已投递描述符边界等。
- 需要板级回归的适配：DMA 池、PCIe/RTL8261、功率表、ADC/温度、NPU 数据路径。
- 需要性能与长期实机验收的候选：主机调度 147–156、2.4G UL OFDMA 144、hostapd 信标缓冲等。
- 配置/产品选择：Glass、默认简体中文、加密及代理包、看门狗、构建配置。它们不是上游必须采用的通用缺陷修复。

**已完成构建和离线验证；未证明 2.4GHz 满载双向失衡的根因或根治效果。** 本 PR 没有完整重写封闭 WM/WA 内部算法。请按模块评审，尤其不要只凭本机构建通过就把调度候选视为已完成硬件验收。历史文档描述各自当时的状态，当前范围和验证边界以本说明为准。

## 修改原因、分析依据与验证边界

### 1. PPPoE：拒绝的 PADO 不应污染最终连接

修改：[520/521 补丁](../../package/network/services/ppp/patches/)、[ppp.sh](../../package/network/services/ppp/files/ppp.sh)。

- 原因：发现阶段解析多个 PADO 时，如果先写共享连接对象再判断响应是否接受，被拒绝的 AC/响应可能残留 cookie、relay-session 等候选状态。改为每个 PADO 使用独立候选，仅在全部条件通过后提交。
- 长度依据：PPPoE 标签提供显式长度，AC 名称不保证以 NUL 结尾；直接让字符串函数扫描到 NUL 会越过标签边界。按标签长度有界复制并补终止符。
- 认证文件：创建、写入、移动或属主设置失败，应清理并上报，避免沿用旧凭据/半成品继续启动。没有改变正常成功路径的拨号参数。
- 当前测试：抽取实际打补丁后的完整选择/解析函数，使用真实 PPP 头，10,368 组候选组合、2,998 组 AC 名边界均通过 ASan/UBSan；实际 shell 函数的 11 组正常/失败/重试场景通过。IO、时钟、netifd 回调有模型替身，不是 ISP 拨号实测。

### 2. 原厂信息页：分区布局不匹配不等于序列号丢失

修改：[factory 持久 feed 补丁](../../patches/feeds/app_airoha/luci-app-airoha-factory/)。

- 已有现象：原厂分区版 `gemtek,xr1710g` 打开页面报 `vendor partition not found`。
- 依据：当前板级 DTS 将 `dsd` 暴露为独立 MTD；页面原路径寻找 `vendor`。独立 DSD 的文本偏移应相对于该 MTD 从 0 读取，不能套用另一布局的 NAND 绝对偏移。
- 处理：补载板型识别函数；在原厂板型且实际没有 legacy vendor 时使用独立 DSD；保留旧 vendor/UBI 路径，拒绝短读。该布局的编辑器明确只读，禁止落入不兼容的写入路径；不要求为了读取序列号升级 U-Boot。同步 POT/简体中文。
- 已有验证：历史后端模拟和前端行为检查，见 [factory 核验记录](factory-fix-in-images.json)。r22 两种实际 ITB 的后端、打包前端、中文 LMO 与审核产物逐字节一致，并检查后端可执行位、DSD 偏移及版本。
- 边界：本轮未刷 r22 验证页面显示，没有读写或改造原厂数据、MAC、EEPROM、U-Boot、分区布局。

### 3. 无线统计恢复：丢弃坏窗口，并允许局部自动恢复

修改：[mt76 154–156](../../package/kernel/mt76/patches/)、[测试源码](../../scripts/xr1710g-b27-stock-txop/)。

- 依据：ADM、MSDU、TX_STAT 是异步统计，缺项/重复输入、清零计数请求发送失败会使周期数据不配对。不能把一个窗口的不完整数据当成有效样本，也不能让一次失败永久关闭全设备动态策略。
- 处理：按 tag 记录发送结果，丢弃受影响窗口；必要时重新建立读清基线，后续有效输入自动恢复。可选 PER 的失败不扩散成其他统计的永久停用。
- AP MU EDCA：实际 hostapd IE → mac80211 AP 配置路径与 `conf_tx` 输入核对，AP 侧不能直接假定已有 STA 侧 MU 参数缓存；从信标输入维护配置并处理接口/复位生命周期。
- 当前测试：10 组窗口场景及已有 event/collect 回归；81 组实际 C 函数场景；9 组实际 worker 场景；60 组 AP MU EDCA 输入/畸形 IE/生命周期场景。依赖的锁、RCU、MCU IO、时钟使用替身，不代表完整内核执行。
- 明确限制：协议没有共享请求 ID，任意迟到回复的跨周期归属尚未证明；本修复不声称覆盖所有异步失配。历史 r20 的整机永久停用方案已撤回，不在当前代码。

### 4. NPU、QDMA、BA 与资源生命周期

- [NPU 138/139/142/143](../../package/kernel/mt76/patches/)：translated MSDU 交付、轮询/发送完成处理、描述符地址和元数据先写入，`dma_wmb()` 后再交出所有权；另加只读队列状态。顺序依据是生产者/设备共享描述符的发布约定，不以队列数较大直接断言硬件卡死。来源包括固定 [YYH 提交 9e44788d](https://github.com/YYH2913/openwrt/tree/9e44788d769164dc9f691670add71dc466d99a4c/package/kernel/mt76/patches)，保留补丁归属。边界及历史模型方法见 [B24 说明](../../scripts/xr1710g-b24/README.md)；模型不模拟真实 NPU。
- [QDMA 9999-17](../../target/linux/airoha/patches-6.18/9999-17-net-airoha-bound-rx-to-posted-descriptors.patch)：RX 消费只到实际已经提交的描述符，避免跨越未投递哨兵。r22 检查最终内核中的源码/对象与审核结果一致，不声称已证明它是压测异常根因。
- [BA 146](../../package/kernel/mt76/patches/146-mt7996-unwind-failed-ba-setup.patch)：RX 分配失败即返回；MCU 失败清理软件重排并尝试撤销硬件状态；TX 成功后才置聚合标志，失败在解锁后异步停止 BA。依据是当前 mt76 和 backports 的调用约定。历史 7 组实际函数故障注入及负对照见 [BA 说明](../../scripts/xr1710g-b26-ba-state-repair/README.md)。该测试未在本次文档提交时重复运行，不能标为新的实机结果。
- 137/141 修正 disassociation 队列选择和信道节点引用释放；145 对齐 A-MSDU 数量。128/129 等与上游共有的 NPU 恢复能力不重复算作新增功能。
- 固定 NPU v0.8 文件安装来源属于本地构建选择；二进制和实际镜像中的 SHA256 已记录，需维护者独立判断是否采用，不能由版本名称推定性能更好。

### 5. 调度候选与量产分析来源

[147–153](../../package/kernel/mt76/patches/) 涉及默认 TXOP 投票、near/far、配对 PER、MCLI TXOP、动态 BA/WTBL 锁和 VOW/AC 映射；144 为 2.4G HE AP UL OFDMA 开关，当前默认 true。

- 量产 XR1710G 5.1.1.12 模块 `mt_wifi.ko` SHA256：`04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0`；反汇编、符号位置、调用链及固定 SDK 对照见 [量产核对说明](../../scripts/xr1710g-b27-stock-txop/RETAIL-SCHEDULER-CONFIRMATION.zh-CN.md) 和 [来源/范围](../../scripts/xr1710g-b27-stock-txop/README.md)。
- 例如 TXOP 默认 187、MLO 包长 700 分支和 AP 高吞吐门槛来自特定初始化/调用路径，不能把 MLO 条件直接套入普通 AP，也不能为了 2.4G 测试降低原门槛。
- 主机侧独立实现不能推出 WM/WA 内部 RED/ACK/队列算法完全一致；没有盲目把 RED 参数从 0 改 1，没有更换旧原厂 WM/WA。
- 样本身份、固定来源提交、哈希和函数地址是分析依据；不是完整空口行为证明。跨客户端、三频段、长稳、重连/SER、公平性和功率合规仍需专门验收。

### 6. DMA、PCIe、RTL8261、功率表与温度

- 上游 928 已有 coherent pool；本地实质区别是首 1GiB 内动态分配（通用 1MiB，WLAN 扩为 16MiB），不是上游固定 `0x84a00000` 的 16MiB。r22 检查实际 DTB 和 NPU 内核配置，需对其他板型做回归。
- 929-04/05/06 将 XR1710G 原厂 PCIe2 模拟初始化与 RX 校准设为板级选择；748 处理 RTL8261 PCS reset 等待/Host SerDes 恢复。原厂 DTS、寄存器和跟踪依据见 [硬件核对材料](../xr1710g-stock-hardware-alignment/) 与 [10G 核对](../xr1710g-10g-stock-audit/)。这些历史文件不是 r22 新增实机端口验收。
- 135/136 涉及厂商 ADC 温度协议、缓存/错误退避、reset guard 和保留 mt76 首成员 union 布局；通过实际模块/符号核验。不让一次温度读取超时触发整机无线重置。
- 140、板级 SKU/BF backoff 表及功率刷新来自固定参考和量产表核对；r22 检查实际载荷，不以表已编入代替射频功率测量。139 等外部移植保留原作者信息。

### 7. DAWN、hostapd、风扇、迁移和看门狗

- DAWN：已有实机 `exit 139`、core 和 `blobmsg_get_u16 → hostapd_notify` 栈，缺字段/拒绝信标报告与空指针读取相符。回移 DAWN 固定提交 `168286e4222d` 等防护，另正确处理合法无正文的非成功测量；历史热部署后同类输入被拒绝且 respawn 不再增加。不是本轮 r22 新长稳结论。固定源链接及栈见 [历史异常分析](../xr1710g-B20-errors/异常修复与合并合理性检查.md)。
- hostapd：实机 socket Drops 与信标事件突发支持“仅增大该事件 socket 接收请求到 1MiB”的有界候选。不是整机内存不足证明，也没有实机量化此补丁的收益。
- 风扇按 hwmon 身份查找，读温失败请求全速，保留持久用户策略；历史行为模拟/硬件核对记录在上述目录。
- 配置迁移仅匹配缺失 2G htmode，或指定 PPPoE/wan6 旧物理绑定条件；已有配置不盲目覆盖。历史 12 个边界/幂等用例见 `docs/xr1710g-B20-errors/migration-test-results.json`。绑定修正不代表运营商 IPv6 已恢复。
- Airoha 32 位 watchdog 计数器在 150MHz 下最大约 28 秒，平台 procd 默认请求 20 秒；其他平台保持 30 秒。没有伪造硬件上限。
- 另有桥接 PPE TTL 保留和 debugfs helper 顺序修正；实际内核构建已通过，转发语义仍需要业务拓扑验收。

### 8. 构建和个人配置

[Glass](../../package/luci-theme-glass/) 1.2.0、[默认简体中文](../../package/xr1710g-ui-defaults/) 和 [r22 配置](../../configs/xr1710g-b27-r22.config) 是个人发行选择；代理/EIP93 集成及持久 feed 补丁也单列供维护者取舍。r22 检查实际模板、LMO、默认值、代理 ELF/架构和加密模块；离线存在性不等于代理可联网或硬件加速运行验收。

`xr1710g-tcp-window` 早期工具源码仍在，但 r22 配置未选中，包自身也默认 disabled。全局 TCP 没有锁为 64KiB；没有保留临时 HT20、FQ、限速来掩盖失衡。

## 本次 r22 已完成的构建与测试

完整记录：[构建/测试汇总](build-and-image-checks.json)、[源测试原始输出](source-tests.stdout.txt)、[镜像载荷](image-payload-verification.json)、[加密](crypto-verification.json)、[代理](proxy-verification.json)。这些是本地执行记录，**不是 GitHub Actions CI 结果**；`BUILD_ROOT` / `LOCAL_*` 表示本地归档位置，不是公开下载链接。

| 检查 | 已有结果 | 限制 |
|---|---|---|
| `make -j4 V=s` | 完整 world，exit 0 | r22 提交 4184aa2 |
| metadata / checksum | exit 0 | 两种设备镜像均生成 |
| 统计窗口 | 10 场景及 event/collect 回归通过 | 锁/RCU/时钟为替身 |
| 请求局部恢复 | 81 函数场景 + 9 worker 场景通过 | 实际 C 函数 + ASan/UBSan，MCU IO 为替身 |
| AP MU EDCA | 60 场景通过 | 实际选定函数/IE 宏，不是空口互操作 |
| PPP 认证文件 | 11 场景通过 | 实际 shell 函数，netifd 回调有替身 |
| PPPoE | 10,368 候选 + 2,998 长度边界通过 | 实际函数/头 + ASan/UBSan，不是 ISP 拨号 |
| 源码正反应用 | 上游 → 当前树匹配、反向检查通过 | 上游是真实祖先，重复补丁已处理 |
| 实际 ITB | FIT 哈希、兼容板型、分区表、内核/rootfs、模块/NPU/功率表、PPP、页面/中文、加密/代理通过 | 不是刷机/射频验收 |

固件 `20261116-B27-r22-upstream-glass-zhcn`，原厂分区 ITB 78,479,683 字节，SHA256：

```text
3c1d67e08eb9a0c056eee30a0c8d98cb4df06c6b003cdb860d6762e41bdd0cd6
```

原厂版与 UBI 镜像都做离线检查，不意味着 UBI 布局已完成实机支持；不改变上游关于 UBI 测试状态的提示。

### 复核步骤

固定代码提交 `4184aa2`（或本 PR 仅增加说明/证据后的提交），先按仓库正常流程准备 feeds，再根据 [feeds.lock.json](feeds.lock.json) 将各 feed checkout 到对应完整 SHA，安装 feeds，使用仓库的持久补丁自动应用机制。浮动 feed 的后续版本不能被当成本次相同构建。

```sh
cp configs/xr1710g-b27-r22.config .config
make defconfig
make -j4 V=s
make -r -j1 OPENWRT_BUILD=1 json_overview_image_info checksum

export B27_TEST_DIR=/tmp/xr1710g-b27-r22-tests
python3 scripts/xr1710g-b27-stock-txop/interval-window-tests.py
python3 scripts/xr1710g-b27-stock-txop/stat-query-send-worker-tests.py
python3 scripts/xr1710g-b27-stock-txop/ppp-authfile-tests.py
python3 scripts/xr1710g-b27-stock-txop/ppp-discovery-tests.py
python3 scripts/xr1710g-b27-stock-txop/ap-mu-edca-tests.py
```

测试需要准备完成的当前 mt76/PPP/backports/hostapd build_dir、宿主 Python3/GCC/ASan/UBSan。默认路径在各脚本开头；先编译再测试，不能指向尚未展开或其他版本的源码。发布文件含时间戳等构建因素，源码/feeds 固定不承诺跨主机 ITB 哈希必定相同。

## 已有实机证据及尚未解决的 2.4G 现象

以下是 **r21、单客户端无线到路由器本机** 的历史测试，不是 r22 已刷机结果，也不是与上游发布固件的 A/B。客户端为 Qualcomm FastConnect 6900，HE20、信道 6、协商 286.8Mbps，AP 信号约 -43 至 -47dBm；无有线端点。iperf3 TCP 每轮有效 20 秒、预热 2 秒，采用接收端吞吐。用户没有实际使用 2.4G 遇到业务故障，异常来自测试压载。

| 条件 | 上传/下载 Mbps | Ping 平均/最大 ms |
|---|---:|---:|
| 单向单流上传 | 104.5 / — | 126.5 / 293 |
| 单向单流下载 | — / 161.3 | 10.6 / 22 |
| 默认单流双向 | 112.6 / 3.3 | 169.1 / 398 |
| 默认四流双向 | 115.6 / 5.6 | 278.7 / 584 |
| 仅本次测试显式双端窗口 256KiB | 70.3 / 55.0 | 20.0 / 38 |
| 恢复默认窗口 | 98.5 / 13.2 | 83.2 / 205 |

原 12 轮 ICMP 305/305 回复；UDP 30Mbps 上传丢包约 0.109%、下载 0%。驱动策略 enabled/active 保持 1，三类查询失败 0、valid=0x7；无新增内核 reset/crash。它只能说明该区间没有观察到全局停用，不能证明所有失败恢复分支已在硬件触发。

后续定位进一步限制了结论：

- 仅临时服务端 `SO_RCVBUF=65536` 即改变两向分配，支持接收窗口/竞争是有效控制变量；但 TCP_INFO 采样接收队列中位数 0、最大约 11,680/29,200 字节，**不能据此认定应用读取不及时或整机缓冲过大就是根因**。
- 原生 Windows Socket 仍复现 157.8/7.3Mbps；临时 HT20 约 94.6/2.2Mbps，临时 FQ 约 144.4/12.6Mbps，均不满足修复验收，全部撤销。
- 相同电脑的两个独立进程经 DNAT+SNAT 返回电脑，双向约 43.4/24.7Mbps，平均/最大 22.4/48ms。每份数据经过无线两次，拓扑不同，不能冒充无线↔有线转发验收。
- NPU active、描述符 queued 的近似采样不等于驻留时间；未完成真实有线端点、另一客户端、跨频段和上游固件同条件 A/B，因此不能归因单一 Windows/NPU/无线驱动。

上述为本地原始 JSON/Ping/采样记录的摘要；含设备环境的完整原始采样归档未随 PR 上传。性能结论仍需维护者独立复测。没有通过限速、缩小全局窗口或关闭动态策略宣称修好了 2.4G。

## 上游重复内容与合并策略

上游已有的 126/127/128/129/132/133/134、928、929-03 等能力已核对，不列为本地新发明。127 是文件名/封装差异；128/129/929-03 的标签文件存在外层补丁封装，本地保留直接作用于目标源码的展开版，避免重复应用。这是源码应用路径分析，不推断上游发布二进制一定缺失这些能力。

本 PR 先汇总全部差异与证据。推荐先审查 PPP、factory、BA/DAWN 等边界清晰的修复，再单独评估板级/NPU 和调度候选；跨补丁依赖需保留，不能假定每一张都可独立摘取。个人主题/代理默认配置可独立取舍。
