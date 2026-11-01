# AN7581/AN7583 桥接 PPPoE 硬件加速：六项落地核实报告

> 核实基线：本仓库 `build_dir/replay/linux-6.18.55` 内核树（已应用 `target/linux/generic/pending-6.18/`
> 与 `target/linux/airoha/patches-6.18/`）、`package/network/config/firewall4/`、
> `D:/GitData/OpenWrt_ONU_CONFIG/luci-app-onu`。
> 全部结论来自实读源码，非上游文档转述。

---

## 零、最重要的结论（先说，因为它否定了一个常见假设）

**本仓库内核树已经完整具备「桥接 PPPoE 硬件加速」所需的全部代码。它不能工作，唯一原因是内核配置项全是 off。**

```sh
# target/linux/generic/config-6.18
# CONFIG_BRIDGE_NETFILTER is not set      ← 桥 netfilter 总开关
# CONFIG_NF_CONNTRACK_BRIDGE is not set   ← 桥上建 conntrack（无此则无流可卸）
# CONFIG_NF_FLOW_TABLE is not set         ← flowtable 本体
# CONFIG_NFT_FLOW_OFFLOAD is not set      ← nft 下发通道
```

这四项全是 `not set`，是上游 OpenWrt 的默认（generic config 是全平台共用，默认最保守）。
`target/linux/airoha/an7581/config-6.18` 里也**没有**覆盖它们。

因此本报告的核心交付不是「写新代码」，而是**打开配置 + 把 userspace 锚点接上**。

---

## 一、六项逐条核实

### 1. 路径是桥接转发 —— ✅ 已具备

`luci-app-onu/view/onu/internet.js` 的 `mode='bridge'` 生成 `br-wanup`
（成员 = 运营商 VLAN 子接口 `ct-wanup` 或裸 `pon0` + 选定 LAN 口）。
`internet-apply` 的 `write_bridge_network()` 落地为 netifd bridge device，
并在 `/etc/internet.nft` 里按 EtherType 0x8863/0x8864 过滤。

**驱动侧对应 `PPE_PKT_TYPE_BRIDGE`（native L2B）**：
`airoha_ppe_flow_offload_replace()` 在 `addr_type == 0` 时选 `PPE_PKT_TYPE_BRIDGE`，
经 `airoha_ppe_foe_entry_insert_entry()` / L2B 提交。路径正确，无需改动。

### 2. 增加下发 bridge-family flowtable —— ✅ 代码已在，**配置未开**

**代码存在**（这是关键发现）：
`target/linux/generic/pending-6.18/` 有一整套 7 个桥卸载补丁，明确写着
"Adapted for Airoha AN7581 PPE offload"：

| 补丁 | 作用 |
|---|---|
| `675-01-net-export-br_fdb_find_rcu.patch` | 导出桥 FDB 查询给卸载层用 |
| `675-02-nft_flow_offload-add-bridging-support.patch` | **桥检测 + L2 转发路径**（`nft_flow_offload_is_bridging`、FDB 选路、MAC 提取） |
| `675-03-nft_flow_offload-add-DEV_PATH_MTK_WDMA-path.patch` | WLAN（WDMA）出口路径 |
| `675-04-nft_flow_offload-add-vlan-passthrough-support.patch` | VLAN 透传 |
| `675-05-br_netfilter-map-vlan-aware-bridge-PVID-to-VLAN-device.patch` | VLAN-aware 桥 PVID → VLAN 设备映射 |
| `675-06-netfilter-utils-nf_ip-checksum-network-offset.patch` | 校验和偏移 |
| `675-07-netfilter-bridge-add-conntrack-double-vlan-and-pppoe.patch` | **桥上 conntrack 支持 PPPoE 与双层 VLAN** |

这些补丁**已应用**到 `build_dir` 内核树（`nf_flow_table_path.c` 中 `nft_flow_offload_is_bridging`
在 77/316/554 行可见；`nf_conntrack_bridge.c` 中 `pppoe_present` / `PPPOE_SES_HLEN` 在 261-296、478-484 行可见）。

**userspace 侧**：原先的 `package/network/config/firewall4/patches/001-add-bridge-flowtable-support.patch`
已移除。内核 6.18.55 没有 `NFPROTO_BRIDGE` 类型的 flowtable 后端，且
`nft_flow_offload_validate()` 拒绝 IPv4/IPv6/INET 之外的 family，因此
`table bridge fw4 { flowtable fb ... }` 不可能生效，保留只会产生恒空的表。

**所以桥流量的硬件加速不走 flowtable**，而是由 AN7581 native L2B 的 QDMA RX
punt 学习路径完成（见 `docs/airoha-bridge-flowtable-offload.md`）。

### 3. FLOW_ACTION_PPPOE_PUSH —— ⚠️ 机制存在，但**前提是桥上 conntrack 能解析 PPPoE**

这是六项里最需要说清楚的一项。**`FLOW_ACTION_PPPOE_PUSH` 的唯一产生点**：

`net/netfilter/nf_flow_table_offload.c:720-733`（`nf_flow_rule_route_common()`）：

```c
other_tuple = &flow->tuplehash[!dir].tuple;
for (i = 0; i < other_tuple->encap_num; i++) {
        ...
        switch (other_tuple->encap[i].proto) {
        case htons(ETH_P_PPP_SES):
                entry->id = FLOW_ACTION_PPPOE_PUSH;      /* ← 唯一产生点 */
                entry->pppoe.sid = other_tuple->encap[i].id;
                break;
```

即：**只有当 flow tuple 的 `encap[].proto == ETH_P_PPP_SES` 时才产生该动作。**

而 `encap` 的填充在 `net/netfilter/nf_flow_table_ip.c:155-181`：

```c
static void nf_flow_tuple_encap(struct sk_buff *skb, struct flow_offload_tuple *tuple)
{
        ...
        case htons(ETH_P_PPP_SES):
                phdr = (struct pppoe_hdr *)skb_network_header(skb);
                tuple->encap[i].id = ntohs(phdr->sid);
                tuple->encap[i].proto = skb->protocol;   /* = ETH_P_PPP_SES */
                break;
}
```

**关键**：`nf_flow_tuple_encap()` 只被 `nf_flow_tuple_ip()` 调用（第 254 行），
也就是**必须先把帧解析到 IP 层**。桥上要走到这一步，前提是
`nf_conntrack_bridge.c` 的 `nf_ct_bridge_inner()` 能把
`ETH_P_PPP_SES → PPP_IP/PPP_IPV6` 这层剥开（补丁 `675-07` 正是干这个的，见其
`nf_ct_bridge_inner()` 与 `nf_ct_bridge_frag_restore()` 中重建 PPPoE 头）。

**结论**：
- 机制完整，`675-07` 提供桥上 PPPoE 解析，`nf_flow_table_offload.c` 提供 `PPPOE_PUSH` 生成；
- **但 `675-07` 的注释明确要求**："Using a conntrack zone is a hard requirement for the newly added
  encapsulations" —— **桥上 PPPoE 卸载必须配 conntrack zone**，否则不同 L2 封装的流会互相混淆；
- **驱动侧限制仍在**（`airoha_ppe.c:1785`）：`if (data.pppoe.num == 1 || data.vlan.num == 2) return -EOPNOTSUPP;`
  → 单 FOE 最多 1 层 PPPoE + 1 层 VLAN，双层 VLAN + PPPoE 会回落软件。

### 4. MTU 寄存器计入 L2/PPPoE 开销 —— ⚠️ 只计了 VLAN，**未计 PPPoE**

补丁 `920-16-net-airoha-Account-for-L2-overhead-in-PPE-MTU-configuration.patch` 当前只做：

```c
/* airoha_ppe.c airoha_ppe_set_mtu() */
len += VLAN_ETH_HLEN;                       /* 18 字节 */

/* airoha_eth.c airoha_dev_set_mtu() */
FIELD_PREP(WAN_MTU0_MASK, netdev->mtu + VLAN_ETH_HLEN)
```

**PPPoE 的 8 字节（`PPPOE_SES_HLEN = 6 + 2`）没有被计入。**
硬件寄存器按不含 FCS 的 L2 帧长比较（复位值 `0x05EA=1514` 印证），
所以 PPPoE 会话帧（最多 `mtu + 8`）在 MTU=1492 时会超出 `1492+18=1510` 的判据……

需要注意：`1492 + 18 = 1510 < 1492 + 8 + 18 = 1518`。
在 **VLAN + PPPoE 同时存在**时，`mtu(1492) + VLAN_ETH_HLEN(18)` 恰好等于 1510，
而实际最长帧是 `1492 + 8(PPPoE) + 18(VLAN)`；寄存器若按 1510 判，
**带 PPPoE 的满帧会被硬件丢弃**，症状是大包不通。
这是需要修的真缺口（见第四节）。

### 5. ingress VLAN 上下文解析 —— ✅ 已具备

补丁 `9993-net-airoha-pass-ingress-vlan-to-bridge-path.patch` 已存在，
在 `airoha_ppe_foe_prepare_bridge_subflow()` 中填充 `net_device_path_ctx`：
逻辑 VLAN 设备 → skb hw tag → 内联 VLAN 头 → ingress 桥端口 PVID（VLAN filtering 时）。
并明确"do not replace a tagged trunk frame with the trunk port PVID"。

配套的 `675-05`（bridge PVID → VLAN 设备映射）与 `675-04`（VLAN 透传）也已就位。

### 6. WLAN↔有线 —— ✅ 已具备

- `9990-net-airoha-bind-WLAN-bound-flows-on-PPE-driver-L2-cache-miss.patch`：
  PPE L2 cache 未命中时用 bridge FDB 兜底绑定 WDMA/GDM 出口，双向覆盖；
- `675-03-nft_flow_offload-add-DEV_PATH_MTK_WDMA-path.patch`：
  flowtable 侧识别 `DEV_PATH_MTK_WDMA` 路径。

两者构成完整的 WiFi↔有线桥卸载通路。

---

## 二、真正的缺口汇总

| # | 项 | 状态 | 缺口 |
|---|---|---|---|
| 1 | 桥接路径 | ✅ | 无 |
| 2 | bridge flowtable 下发 | ⚠️ | **内核 4 个 CONFIG 未开** |
| 3 | PPPoE_PUSH | ⚠️ | 机制完整；**需开配置 + 配 conntrack zone**；驱动限 1×PPPoE+1×VLAN |
| 4 | MTU 计 PPPoE 开销 | ❌ | **PPPoE 8 字节未计入**，需改驱动补丁 |
| 5 | ingress VLAN | ✅ | 无 |
| 6 | WLAN↔有线 | ✅ | 无 |

---

## 三、内核配置改动（第 2、3 项）

在 `target/linux/airoha/an7581/config-6.18`（及 `an7583`、`en7523` 若同用）追加：

```
CONFIG_BRIDGE_NETFILTER=y
CONFIG_NF_CONNTRACK_BRIDGE=y
CONFIG_NF_FLOW_TABLE=y
CONFIG_NF_FLOW_TABLE_INET=y
CONFIG_NFT_FLOW_OFFLOAD=y
# 桥 flowtable 需要 nft bridge 家族
CONFIG_NFT_BRIDGE=y
CONFIG_BRIDGE_EBT_* 按需
```

并在设备种子 `1710.config` / `2010.config` 里确保包被选上：

```
CONFIG_PACKAGE_kmod-nft-bridge=y
CONFIG_PACKAGE_kmod-nf-conntrack-bridge=y
CONFIG_PACKAGE_kmod-nft-offload=y
CONFIG_PACKAGE_kmod-nf-flow=y
```

> ⚠️ 改内核配置后按项目惯例必须
> `make package/kernel/airoha-pon/clean && make target/linux/clean`，
> 否则旧 vermagic kmod 残留导致 install 失败。

---

## 四、MTU 补丁（第 4 项，需要写代码）

把 `920-16` 扩展为同时计入 PPPoE 头。建议做法：

```c
/* airoha_ppe.c */
#include <linux/if_pppox.h>   /* 或直接用 PPPOE_SES_HLEN 的定义 */

/* airoha_ppe_set_mtu() */
len += VLAN_ETH_HLEN;
if (dev->flags & AIROHA_PRIV_F_PON)
        len += PPPOE_SES_HLEN;      /* 上行 PPPoE 会话，+8 */
```

更稳妥的做法是**按该 egress 设备上实际存在的 PPPoE 会话动态判断**，
而不是无条件加 8：PPPoE 与 IPoE 混用时无条件加会让 IPoE 白名单放宽 8 字节。

---

## 五、运行时验收（到设备上执行）

```sh
# 1. 配置已开（四项都要 y）
zcat /proc/config.gz | grep -E 'BRIDGE_NETFILTER|NF_CONNTRACK_BRIDGE|NF_FLOW_TABLE=|NFT_FLOW_OFFLOAD'

# 2. 桥 flowtable 真的生成了
nft list flowtable bridge fw4          # 应有 flowtable fb + devices + flags offload

# 3. conntrack 在桥上建了流，PPPoE 流带 encap
conntrack -L -o extended | grep -c HW_OFFLOAD

# 4. PPE 里有 BRIDGE 表项（含 pppoe_id）
mount -t debugfs none /sys/kernel/debug 2>/dev/null
cat /sys/kernel/debug/ppe/entries | grep -i L2B | head
cat /sys/kernel/debug/ppe/bind              # 聚合视图，含 DRAM 表项
cat /sys/kernel/debug/ppe/cdm1/bind         # 仅 CDM1 所属 SRAM 表项
cat /sys/kernel/debug/ppe/cdm2/bind         # 仅 CDM2 所属 SRAM 表项（AN7581 双 PPE）

# 5. 大包验证 MTU（第 4 项是否修好）
ping -M do -s 1464 -c 3 <对端>    # 1464+8+28 = 1500，PPPoE 满帧
```

---

## 六、边界与限制（勿越界承诺）

1. **驱动硬限制**：单 FOE 最多 1 层 PPPoE + 1 层 VLAN。双层 VLAN + PPPoE 必然回落软件。
2. **PPPoE 必须由下游主机终结**。本机若在同桥上再起 pppoe，路径变三层路由，
   走的是 HNAPT 而非 BRIDGE，本文全部结论不适用。
3. **conntrack zone 是硬要求**（`675-07` 明确声明）。桥上多种 L2 封装混跑时必须分区，
   否则流会串。userspace 需要在 nft 规则里配 `ct zone set`。
4. **本报告基于当前分支快照**。上游 merge 后请用
   `git diff <merge>^2 -- <file>` 重新核对行号与字段名。
5. **PON 路径是另一条 metadata 通路**（`airoha_ppe_pon_select_flow()` 处理 GEM/T-CONT），
   与本文纯以太桥接 PPPoE 不要混调。
