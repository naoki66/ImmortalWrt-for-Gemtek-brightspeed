# AN7581/AN7583 PPE 对「桥接网口下游 PPPoE 拨号」的硬件加速

## 一、结论先行

下游用户从桥接网口自己 PPPoE 拨号时，要吃到 PPE 硬件加速，必须**同时**满足四层条件：

1. **流量路径必须是「桥转发」**（`PPE_PKT_TYPE_BRIDGE` / native L2B），而不是三层路由；
   因为拨号主机在桥内，PPPoE 会话终结在主机侧，本机不终结该 PPPoE 会话。
2. **firewall4 必须下发一条 bridge-family flowtable**（`table bridge fw4 → flowtable fb`，
   `flags offload`），把 bridge 端口纳入 offload device 集合。仅配 `flow_offloading_hw=1`
   但只有 `inet` 表时，纯 L2 桥流量不会进 PPE。
3. **TC flower 规则必须携带 `FLOW_ACTION_PPPOE_PUSH` 动作**，驱动据此把 PPPoE
   Session-ID 写进 FOE 的 `pppoe_id` 字段、把 `ib1.PPPOE` 置位、把 L2 etype 设为
   `ETH_P_PPP_SES`。这是「PPPoE 能硬件转发」的关键，普通 L2B 桥转发不涉及这一路。
4. **PPE egress MTU 必须计入 L2/L3 开销**（VLAN_ETH_HLEN + PPPoE 8 字节头），否则
   带 PPPoE 封装的长帧会被硬件按 MTU 直接丢弃。

其中第 3 点是本问题与「普通透明桥 offload」的本质区别。下面逐项展开。

---

## 二、PPPoE 在 PPE 中的数据结构

驱动把 PPPoE 会话信息拆成三处：

| 位置 | 字段 | 含义 |
|---|---|---|
| `hwe->ib1` | `AIROHA_FOE_IB1_BIND_PPPOE` (bit, 来自 `data->pppoe.num`) | 标记该 FOE 是 PPPoE 会话帧 |
| L2 MAC info | `AIROHA_FOE_MAC_PPPOE_ID` = `data->pppoe.sid` | PPPoE Session-ID |
| L2 etype | 在 `data->pppoe.num` 非零且非 PON/DSA 路径时置 `ETH_P_PPP_SES` | 让 PPE 按 PPPoE 以太类型封装 |

对应代码（`drivers/net/ethernet/airoha/airoha_ppe.c`，`airoha_ppe_foe_entry_prepare()`）：

```c
val = FIELD_PREP(AIROHA_FOE_IB1_BIND_STATE, AIROHA_FOE_STATE_BIND) |
      ...
      FIELD_PREP(AIROHA_FOE_IB1_BIND_PPPOE, data->pppoe.num) |   /* ① PPPoE 标志 */
      AIROHA_FOE_IB1_BIND_TTL;
hwe->ib1 = val;
...
} else if (data->pppoe.num) {
        l2->etype = ETH_P_PPP_SES;                              /* ③ etype */
}
...
l2->src_mac_hi = FIELD_PREP(AIROHA_FOE_MAC_SMAC_ID, smac_id) |
                 FIELD_PREP(AIROHA_FOE_MAC_PPPOE_ID, data->pppoe.sid); /* ② SID */
```

**约束（必须记住）**：`airoha_ppe_flow_offload_replace()` 中对 PPPoE push 的合法性判断是

```c
case FLOW_ACTION_PPPOE_PUSH:
        if (data.pppoe.num == 1 || data.vlan.num == 2)
                return -EOPNOTSUPP;   /* 只能 push 一次，且不能同时压两层 VLAN */
        data.pppoe.sid = act->pppoe.sid;
        data.pppoe.num++;
        break;
```

即：**单个 FOE 最多承载一层 PPPoE + 一层 VLAN**。若现场是
「VLAN(外) + VLAN(内) + PPPoE」三层叠加的拨号方式（部分运营商 IPTV/上网双栈场景），
这一路会被直接判 `-EOPNOTSUPP`，回落到软件转发——这是设计限制，不是 bug。

---

## 三、桥接场景下 FOE 是如何被建立的

### 3.1 两个入口

| 入口 | 函数 | 触发时机 |
|---|---|---|
| 显式 TC flower | `airoha_ppe_flow_offload_replace()` | nft `flow offload` 规则下发 |
| cache-miss 兜底 | `airoha_ppe_foe_prepare_bridge_subflow()` | PPE L2 cache 未命中时的软路径学习 |

桥接 + PPPoE 主要走**第一条**：firewall4 生成的 bridge flowtable 会在桥 forward 链上
`flow offload @fb`，nft 计算出 egress 动作（含 VLAN push / PPPoE push / redirect）后
以 flower 形式下发，`airoha_ppe_flow_offload_replace()` 解析：

- `addr_type == 0` → `offload_type = PPE_PKT_TYPE_BRIDGE`
- `FLOW_ACTION_REDIRECT` → `odev`（真实 egress GDM/PPE 设备）
- `FLOW_ACTION_VLAN_PUSH` → `data.vlan`
- `FLOW_ACTION_PPPOE_PUSH` → `data.pppoe`

然后调用 `airoha_ppe_foe_entry_prepare(eth, &hwe, odev, PPE_PKT_TYPE_BRIDGE, &data, ...)`。

### 3.2 egress 设备解析

`airoha_ppe_foe_entry_prepare()` 里 `odev` 经 `airoha_ppe_get_wdma_info()` 分流：

- 命中 WDMA（WiFi）→ 走 `FE_PSE_PORT_CDM4` + `IB2_NBQ`;
- 否则要求是合法 `airoha_gdm_dev` → 得到 `*egress_dev`，并据端口类型选 PSE port：
  - LAN GDM → `FE_PSE_PORT_GDMx`（x=端口号，4 单独处理），并置 `IB2_FAST_PATH`（下行快速路径）；
  - 非 LAN（uplink / GDM2 loopback）→ `pse_port = 2`（GDM2 回环上传）。

**这解释了为什么「桥接下游拨号」能加速**：拨号主机的流量对本机来说是
**桥内 L2 转发**，PPE 只需要在 LAN-GDM ↔ uplink-GDM2 之间做 FOE 直通，
不需要本机参与 PPPoE 会话状态机。

### 3.3 cache-miss 兜底路径

`airoha_ppe_foe_prepare_bridge_subflow()` 用于 L2B 表未命中但 bridge FDB 已知的场景
（补丁 `9990-...-bind-WLAN-bound-flows-on-PPE-driver-L2-cache-miss.patch`）：

```c
master = airoha_ppe_foe_get_bridge_master(skb->dev);
if (!master) return false;
...
err = __dev_fill_forward_path(&ctx, eh->h_dest, &stack);
if (err || stack.num_paths < 2 || stack.path[0].type != DEV_PATH_BRIDGE)
        return false;
egress = (struct net_device *)stack.path[1].dev;   /* 桥下一跳 = 真实 egress */
```

`airoha_ppe_foe_get_bridge_master_rcu()` 支持三种 ingress 形态：bridge master 本身、
bridge port、以及 **VLAN-over-bridge 的 vlan_dev**（下游 PPPoE 常配 `eth0.x` VLAN，
再在该 VLAN 上起 pppoe，所以这一路是必需的）。

---

## 四、配置落地（三步）

### 4.1 内核/包层

本仓库 `target/linux/airoha/an7581/config-6.18` 已含：

```
CONFIG_NET_AIROHA=y
CONFIG_NET_AIROHA_NPU=y
```

flowtable 相关（`NF_FLOW_TABLE`、`NFT_FLOW_OFFLOAD`、`NFT_FLOW_OFFLOAD` bridge family、
`NETFILTER_XT_*`）由 generic config 提供；bridge-family flowtable 依赖
`915-01-net-netfilter-flowtable-Add-the-capability-to-offloa.patch` 等补丁带来的
backport 能力。firewall4 侧需 `001-add-bridge-flowtable-support.patch`（本仓库已带）。

### 4.2 UCI 配置

`/etc/config/firewall`：

```
config defaults
        option flow_offloading '1'
        option flow_offloading_hw '1'      # ← 生成 `flags offload`，缺此项只会软件加速
```

本仓库对 XR1710G 已由 `target/linux/airoha/an7581/base-files/etc/uci-defaults/`
下的 `18-xr1710g-firewall-defaults` 自动置这两项。

### 4.3 桥/VLAN 配置要点

- **必须启用 bridge flowtable**：firewall4 通过 `/sys/class/net/*/brport` 发现 bridge 端口，
  并检查其 lower device。若下游 VLAN 子接口是 PPPoE 承载口，需保证 VLAN 设备正确挂在
  桥端口之上，`resolve_lower_devices()` 才能解析出物理设备。
- **`nft -c` 必须能通过**：内核不支持 bridge flowtable 时 firewall4 会**静默降级**为
  普通 `inet` 表，此时 L2 桥流量不进 PPE。这是最常见的「配了却没效果」原因。
- **PPPoE 由下游主机终结**：本机不要在该桥上再建 pppoe 接口去抢占会话，
  否则路径从 L2 桥转发变成三层，PPE 走的是 HNAPT 而非 BRIDGE 类型。

---

## 五、MTU / 开销陷阱（关键）

补丁 `920-16-net-airoha-Account-for-L2-overhead-in-PPE-MTU-configuration.patch`
修正了 PPE egress MTU 与 WAN MTU 寄存器：

```c
/* airoha_ppe_set_mtu(): 寄存器比较的是不含 FCS 的 L2 帧长 */
len = max(netdev->mtu ...);
len += VLAN_ETH_HLEN;                       /* 计入 VLAN 头 */
... FP_EGRESS_MTU_MASK(index), len ...

/* airoha_dev_set_mtu(): WAN 侧同理 */
FIELD_PREP(WAN_MTU0_MASK, netdev->mtu + VLAN_ETH_HLEN)
```

硬件 MTU 寄存器复位值 `0x05EA = 1514` 印证它按 L2 帧长比较。
**对 PPPoE 的影响**：PPPoE 会话帧 = 以太(14) + PPPoE(6) + PPP(2) + payload，
实际 L2 长度比裸 IP 帧多 8 字节。若 MTU 寄存器未计入该开销，
1492 字节的标准 PPPoE MSS 长帧会被硬件判超长丢弃，
表现就是**「大包 ping 不通 / 网页打不开，小包正常」**。

若现场 PPPoE MTU 除以 1492 外还有额外封装（如再套一层 VLAN），
需确认寄存器预置值覆盖到 `mtu + VLAN_ETH_HLEN + PPPOE_HLEN`；
当前驱动按 `+ VLAN_ETH_HLEN` 处理，VLAN+PPPoE 同时存在时余量最紧张。

---

## 六、运行时验收清单

在目标设备上依次确认，**缺一步就不能声明「硬件加速已生效」**：

1. **bridge flowtable 存在且设备正确**
   ```
   nft list flowtable bridge fw4
   ```
   期望：`fb` flowtable 且 `devices` 含实际 bridge lower device、有 `flags offload`。

2. **PPPoE 会话流进了 flower 且 in_hw**
   ```
   tc -s filter show dev <egress-gdm> ingress      # 或 nft -a list ruleset 看 handle
   nft list ruleset | grep -n "flow offload"
   ```
   期望：对应 PPPoE 5 元组规则出现 `in_hw` / `hw` 标记。

3. **PPE 里有 FOE（尤其 IB1.PPPOE / pppoe_id）**
   ```
   cat /sys/kernel/debug/airoha_ppe*/...            # 视 debugfs 节点而定
   ```
   期望：能看到 `PPE_PKT_TYPE_BRIDGE` 表项，且 `pppoe_id` 与现场 SID 一致。

4. **吞吐 / CPU 对比**
   双向 iperf3 下，offload 命中时 `top`/`mpstat` 的软中断 CPU 占用应有可重复下降，
   吞吐接近线速。**静态补丁检查或成功出固件都不等于硬件 offload 已验证。**

---

## 七、常见失败模式对照表

| 现象 | 根因 | 处理 |
|---|---|---|
| 小包正常、大包丢 | PPE MTU 未计入 L2/PPPoE 开销 | 确认 `920-16` 补丁已合入 |
| 完全没进 PPE，CPU 满载 | 无 bridge flowtable，仅 `inet` 表 | 开启 `flow_offloading_hw`，确认 `nft -c` 通过 |
| 规则下发即 `-EOPNOTSUPP` | 两层 VLAN + PPPoE 超限 | 改单层 VLAN 或接受软件转发 |
| PPPoE 不上线 / 会话被抢 | 本机也在桥上起了 pppoe | 移除本机 pppoe 接口，让下游主机终结 |
| VLAN 子接口拨号不通 | ingress VLAN 上下文缺失，FDB 用了桥 PVID | 确认 `9993-...-pass-ingress-vlan-to-bridge-path` 已合入 |
| WiFi↔有线 单向不通 | L2B 未命中且未走 bridge fallback | 确认 `9990` 补丁已合入 |

---

## 八、边界与限制

- 本说明基于本仓库 `target/linux/airoha/patches-6.18/` 与内核 `6.18.55`
  构建树内 `drivers/net/ethernet/airoha/airoha_ppe.c` 实读，非上游文档承诺。
- AN7581 为双 PPE，AN7583 为单 PPE；CPU port 分配由
  `099-09-...-Select-default-ppe-cpu-port-in-airoha_dev.patch` 决定
  （7581: PPE1→CDM1 / PPE2→CDM2；7583: 按 QDMA 选 CDM1 或 CDM2 分摊）。
  该差异影响满载时的收包分布，不影响 PPPoE 单流是否被 offload。
- PON（`AIROHA_PRIV_F_PON`）路径有独立的 GEM/T-CONT 元数据选择
  （`airoha_ppe_pon_select_flow()`），与本文的纯以太桥接 PPPoE 场景是**两条不同的
  metadata 通路**，不要混淆调试。
- 若上游合并带入改动，请以 `git diff <merge>^2 -- <file>` 重新核对本文涉及的
  具体行号与字段名。
