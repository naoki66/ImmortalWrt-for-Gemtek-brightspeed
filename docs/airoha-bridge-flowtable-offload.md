# Airoha 透明桥 flowtable 本地适配

## 结论（2026-10-22）

当前内核（6.18.55）**不支持 bridge-family flowtable**，因此本仓库不再生成
`table bridge fw4` / `flowtable bridge fw4 fb`。桥接流量的硬件加速由 AN7581
native L2B 路径完成，与 `nf_tables` flowtable 无关。

依据：

1. `net/netfilter/nf_flow_table_inet.c` 只注册 `flowtable_ipv4`、`flowtable_ipv6`、
   `flowtable_inet` 三种类型，没有 `NFPROTO_BRIDGE` 类型；
2. `nft_flow_offload_validate()` 对 IPv4/IPv6/INET 之外的 family 直接返回
   `-EOPNOTSUPP`；
3. `nf_flowtable_parse_hook()` 把 hooknum 固定为 `NF_NETDEV_INGRESS`、pf 固定为
   `NFPROTO_NETDEV`；桥接行为是在 `nft_flow_route()` 中由
   `nft_flow_offload_is_bridging()` 在运行时判定的，不存在 bridge 专用的 hook 后端。

因此 `nft add flowtable bridge ...` 必然报 `No such file or directory`（ENOENT），
`table bridge fw4` 即使创建也永远是空表。保留该脚手架只会造成“已启用桥接卸载”的
误判，故已移除：

- 删除 `package/network/config/firewall4/patches/001-add-bridge-flowtable-support.patch`；
- 删除 `/etc/hotplug.d/net/50-fw4-bridge-reload`。

## 与 Airoha PPE 的关系

透明桥的 L2 转发加速由 `9994` / `9999-net-airoha-ppe-l2b-encap-decode` 系列补丁
实现：QDMA RX 上报未绑定条目后，驱动解析完整的
Ethernet + VLAN(1~2 层) + 可选 PPPoE 封装，填写 native L2B 条目并绑定。
该路径不依赖 nft flowtable，也不依赖 br_netfilter。

`inet` 表的路由/NAT 卸载（IPv4/IPv6）仍由 `firewall4` 的
`flow_offloading` / `flow_offloading_hw` 选项控制，与本次移除的 bridge 脚手架无关。

## 运行时验收

1. `nft list tables` 中不应再出现 `table bridge fw4`；若出现，说明旧配置残留，
   执行 `/etc/init.d/firewall reload` 即可清理。
2. 桥接转发产生的 L2B 条目在 PPE debugfs 中可见，且状态为 `BND`；
3. 双向 LAN/VLAN 流量下，CPU 侧收包数应远小于总包数。
