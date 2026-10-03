# Airoha 透明桥 flowtable 本地适配

## 范围

本说明记录本仓库对 `firewall4` 透明桥 flowtable 的本地适配。它不替换
`firewall4` 的原始包说明，也不把上游提交说明作为本项目的功能承诺。

## 本地改动

- `PKG_RELEASE` 从 `4` 提升到 `5`，使新生成的 `firewall4` 包可以被升级系统识别。
- bridge flowtable 仍然只在 `nft -c` 能通过完整 bridge 规则检查时生成；内核不支持
  bridge flowtable 时继续使用普通 `inet` 防火墙路径。
- bridge 端口发现不再只检查已解析的 offload 设备。现在通过 ubus 的
  `network.device status` 解析 VLAN/bridge 的 lower device，再生成去重后的物理设备集合。

## 与 Airoha PPE 的关系

该改动只负责让 firewall4 选择正确的 bridge 设备，不能单独证明硬件转发已经生效。
AN7581 native L2B entry 的布局和学习 key 保留由
`9994-net-airoha-fix-native-l2b-entry-layout.patch` 负责；两者共同组成当前
XG2010G 透明桥 offload 的软件入口和 PPE 写入路径。

PON 注册、OMCI、光模块控制以及 `pon0` 上的普通三层 NAT 不属于本改动范围。
1710G 只有在 WAN 加入 LAN bridge 的 AP/透明桥模式下才可能受益。

## 运行时验收

在目标设备上应分别确认：

1. `nft list flowtable bridge fw4 fb` 包含实际 bridge lower device；
2. 对应 TC flower 规则显示 `in_hw`；
3. Airoha PPE/debugfs 能看到 native L2B entry；
4. 双向 LAN/VLAN 流量下吞吐和 CPU 占用相较软件转发有可重复改善。

静态补丁检查或成功生成固件不等于硬件 offload 已验证。
