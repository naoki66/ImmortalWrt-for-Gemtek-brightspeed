# 更新日志

本文件记录 XR1710G 固件仓库的重要功能、稳定性和维护变更。常规的
ImmortalWrt 上游合并不逐项展开，仅记录会影响本设备构建或运行行为的内容。

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
