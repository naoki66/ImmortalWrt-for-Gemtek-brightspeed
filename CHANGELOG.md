# 更新日志

本文件记录 Gemtek Brightspeed 固件仓库的重要功能、稳定性和维护变更。常规的
ImmortalWrt 上游合并不逐项展开，仅记录会影响本设备构建或运行行为的内容。

## 2026-10-02

### LuCI Airoha 应用拆分为独立 feed

- 将 `luci-app-airoha`、`luci-app-airoha-factory`、`luci-app-airoha-recovery`、
  `luci-app-netmode` 和 `luci-app-mesh-conf` 迁移到
  [`naoki66/luci-app-airoha`](https://github.com/naoki66/luci-app-airoha)。
- `feeds.conf.default` 新增 `airoha` feed；设备配置中的包名和选择符号保持不变，
  构建前通过 `scripts/feeds` 安装即可。

## 2026-10-01

### XG2010G FIT 动态扩容与产物检查

- 修正将当前 339-LEB `fit` 动态卷误当成固定分区上限的问题。U-Boot 和
  sysupgrade 都会保留 `fip`、`ubootenv`、`ubootenv2`、`factory`，删除
  `rootfs_data` 后按新镜像大小重建 `fit`；因此将构建上限调整为 U-Boot
  `0x90000000`/`0x94000000` 双缓冲允许的 64 MiB。
- GitHub Actions 和远程 world 构建现在逐一检查所选设备的 sysupgrade ITB，
  防止 `check-size` 删除超限镜像后仍把仅生成 manifest 的构建报告为成功。

## 2026-09-30

### XG2010G 固件生成与 ONU 包改名

- 将 XG2010G 配置选择从 `luci-app-pon` 更新为改名后的 `luci-app-onu`，并同步
  XR1710G 的隔离规则和文档引用。
- 禁用 XG2010G 的 initramfs 目标，避免并行构建时 initramfs 内核覆盖普通内核，
  随后又在 FIT 中追加 squashfs，造成固件尺寸重复并被 `IMAGE_SIZE` 检查删除。
- XG2010G 不再选择 `luci-theme-glass`，XR1710G 配置继续提供该主题。
- profile 隔离检查现在要求 `luci-app-onu`，并拒绝 XG2010G 配置重新启用
  initramfs。

## 2026-09-28

### XG2010G PON 用户态与 LuCI

- 将 `pon_userspace` feed 从 `pbs05/openwrt-pon-userspace` 切换到
  `naoki66/openwrt-pon-userspace`。
- 使用新版 `luci-app-pon` 的“网络 → ONU”菜单，按状态、硬件身份、认证配置、
  IPTV、语音和诊断组织页面。
- IPTV 页面、ACL、UCI 配置和应用服务已并入 `luci-app-pon`，从 XG2010G
  配置中移除已废弃的独立 `luci-app-iptv` 包选择。
- `pon_userspace` feed 和 `luci-app-pon` 仅由 XG2010G 的 `2010.config` 启用，
  XR1710G 的 `1710.config` 明确保持禁用。

## 2026-09-23

本条目覆盖 XR1710G 从 `20260916-e8702ccc61` 到 `b94f6f29b3` 的变更。同期
XG2010G 专属的 PON、ToD、BoB 和 PCM/语音功能不计入 XR1710G 运行面。

### 上游同步

- 合并 ImmortalWrt `master` 至 `b80b090e8e`，本地 merge commit 为
  `b94f6f29b3`；此前还通过 `669668ec3e` 和 `ba2d9bc4f3` 引入上游。
- Linux 6.18 从 `.44` 更新到 `.52`，包含 6.18.45 至 6.18.52 的稳定版
  修复，并同步刷新 Airoha、Realtek PHY 和通用内核补丁上下文。
- 引入 Airoha 上游改动，包括 Quantum Fiber Q1000K、RX ring 扩容、
  AN7583 PCIe Gen3 PHY，以及 phylink/PCS 相关修复。
- 引入 netifd、mac80211、procd、odhcpd、dnsmasq、dropbear 和 comgt
  等共享软件包更新；其中 mt76 TX worker CPU 绑定和流卸载修复对 XR1710G
  的无线与转发路径有直接影响。

### XR1710G 设备与网络

- 为 XR1710G 的 Airoha I2C 控制器设置 `airoha,airoha-i2c` 兼容项和
  400 kHz 总线频率，继续支持 NCT7802 硬件监控。
- 增加 AN7581 10G PCS link bring-up 修复，覆盖 JCPLL/TCLVAR、PCS
  restart 和按接口跟踪 PCS 状态。
- 同步 phylink PCS 到 v15 API：PCS provider 使用引用计数式
  acquire/release，PCS list 由 state mutex 保护，并补齐 PCS disable、
  link down 和 major configuration 强制重建路径。
- 修复 RTL8261BE/RTL8261N USXGMII SerDes reset work 与 PHY teardown
  的竞态：PHY 离开 running 状态时禁止并停用 delayed work，阻止旧 work
  在设备关闭后继续访问 SerDes 或重新排队。
- Airoha MAC 在共享 QDMA 停止后断开 PHY，避免重新打开接口时复用已被
  teardown 的 link state。
- 将 MT7996 板级默认值、无线缓冲区、PPE reload 和 packet steering
  移入 `airoha-an7581-mt7996-board`，由 XR1710G/W1700K 选择。
- 明确排除 PON firmware/manager、xPON、GPON IGMP、PON VLAN、ToD 和
  PCM/语音组件，避免 XG2010G 功能进入 XR1710G 镜像或内核配置。
- 对照 `immortalwrt_pon` 的 `675-01`、`675-02` 和 `675-09` 补充桥接
  conntrack 的 PPPoE、PPPoE-in-Q 和双层 VLAN（内层 802.1Q，外层
  802.1Q/802.1ad）跟踪；修复非零 network offset 下的 L3/L4 校验和计算。
- 在 XR1710G 的 XFRM/SOE flow offload 补丁之后检查 `nft_thoff()`：
  未解析 L4 偏移时跳过卸载，保留软件转发，避免双层 VLAN/PPPoE 流量
  被错误绑定到 PPE；现有 `meta l4proto { tcp, udp }` firewall4 规则不受影响。

### LuCI 与 Mesh

- `luci-app-airoha` 统一 NPU 与 FlowSense 页面，状态和端口拓扑按设备树
  生成，补充 CPU governor/max_freq 持久化、刷新时间、暗色主题和中英文翻译。
- `luci-app-mesh-conf` 增加 DAWN 客户端引导、802.11k/v/r 支持和 6 GHz
  频段补丁，并修复同步服务自愈、执行位和 SAE key 被空值覆盖的问题。
- 新栈 `airoha-ponctl`、`airoha-pond`、`luci-app-pon`、ToD PHC 和 EN7581
  PCM-SPI 语音功能仅进入 XG2010G 配置，不随 XR1710G 构建。

### 构建与版本

- 新增 `1710.config` 与 `2010.config` 双配置构建入口，GitHub Actions 可选择
  设备配置，release 名称和文件名会包含对应型号。
- 固件版本改为根据 `CONFIG_TARGET_PROFILE` 自动识别 XR1710G/XG2010G。
- 新增 Gemtek profile 隔离检查，在构建前检查配置，在构建后检查 kernel
  config 和 image manifest，防止 XR1710G 与 XG2010G 包集合互相污染。
- 远程构建脚本支持选择 1710 或 2010 配置，构建失败时会尝试带 `V=s`
  重新编译并保留详细日志。

### 验证

- `git diff --check` 通过。
- XR1710G 和 XG2010G 的 profile 隔离检查均通过。
- 本轮未执行完整固件构建。

关键提交：`4b4ed05f79`、`31eda9dc56`、`4ebc4c2c9b`、`759359070c`、
`b94f6f29b3`。

## 2026-09-14

### 上游同步

- 合并 ImmortalWrt `master` 至 `3e246256ce`。
- 对照 OpenWrt `main` `0d7bfcb7e31e` 复核 Airoha AN7581/AN7583 补丁集。

### Airoha 网络修复

- 移植 OpenWrt `002faeed3c91792a02abdb6f39b1a6b74052e992`：
  `net: airoha: grow the small RX rings`。
- 将强制送 CPU 的 RX ring 4 从 16 个 descriptor 扩大到 128 个，降低 PPPoE
  Discovery、LCP、IPCP、CHAP、DHCPv6 和 LLDP 等突发流量耗尽 RX ring 的风险。
- 将其他小型 RX ring 的默认 descriptor 数从 16 提高到 32，与厂商 SDK 默认值一致。
- 刷新 `310-10`、`916-02`、`920-12`、`920-13` 的补丁上下文，使其适配新的
  `RX_DSCP_NUM()` 定义；未改变这些补丁原有功能。

### 补丁清理

- 删除无消费者的 `303-01` 和 `303-02`。这两项只为未引入的 Airoha PHY
  软件校准系列准备导出符号、共享寄存器头文件和校准等待函数。
- 删除与上游 `221-01` 重复的 `0403` PM Domain Kconfig 修复，保留 `221-01`
  作为 `ARCH_AIROHA` 启用 `AIROHA_CPU_PM_DOMAIN` 的唯一实现。
- 保留 XR1710G 所需的 RTL826x SerDes、AN7581 USXGMII、PCIe 3.0 x2、NPU、
  PPE/flowtable、GPIO、MIB 统计和无 BL31 启动兼容补丁。
- 未引入 OpenWrt 的 `602-04`，因为该补丁仅提供 AN7583 PCIe PHY 驱动，
  XR1710G 的 AN7581 配置未启用该驱动。

### 验证

- 新增 RX ring 补丁与 OpenWrt 官方文件的 Git blob 均为
  `3a21a65022acaba07679f01663678afbccc9b640`。
- `git diff --check` 通过，Airoha 6.18 补丁目录未引入 BOM 或 CRLF。
- 按本次维护要求未执行固件或内核编译。

相关提交：`a6b69e04dc`。

## 2026-09-08

- 为 ucode 增加 `msleep`，并替换原有 `uloop.sleep` 调用，避免不必要的事件循环阻塞。

相关提交：`4974641d84`。

## 2026-09-07

- 新增 `scripts/set-build-version.sh`，在构建配置中写入日期、仓库提交和上游提交信息。
- 调整 Airoha NPU 与 FlowSense 页面：统一 VLAN 标签卸载、PPPoE 透传卸载文案，
  增加设备模式检测，并限制路由模式下不适用的桥接卸载操作。
- 移除 NPU 页面中的超频功能。
- 新增并完善 `luci-app-airoha-factory`，支持原厂序列号、MAC/BSSID 查看与修改，
  修复 MTD 分区识别、RPC 脚本权限和表单交互问题。
- 修复 MT7996 电源同步事件解析和 EEPROM 发射功率处理。
- 更新 RTL826x SerDes 与 Linux 6.18.44 相关补丁上下文。

对应版本标签：`20260907-ea01178178`。

## 2026-08-31

- 修复 XR1710G 的 AN7581 USXGMII 速率适配、RX 校准和可选 TX FIR 参数。
- 恢复并稳定 RTL826x 主机侧 SerDes 配置，改善 10G PHY 与 AN7581 PCS 的协商。
- 修复 Airoha MIB 统计丢失、AN7581 GPIO mux 和桥接本地流量的 PPE 分类。
- 完善 VLAN ingress、桥接 L2 fallback、DHCP 客户端标识和镜像内 `px5g` 支持。

对应版本标签：`20260831-131ef84fe9`。

## 2026-08-20

- 合并 YYH XR1710G Linux 6.18 集成，统一 AN7581/AN7583 内核补丁基线。
- 清理已进入 Linux 6.18.44 基线的回移补丁，并刷新仍需保留的 Airoha 补丁上下文。
- 保留 XR1710G 设备树、PCIe 3.0 x2、NPU/Wi-Fi 卸载、SOE/XFRM 和本地 LuCI 定制。
- 修复上游合并后自定义固件版本元数据被覆盖的问题。

对应版本标签：`20260820-a60889b870`。
