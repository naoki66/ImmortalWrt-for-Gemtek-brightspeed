# B27：量产默认主机 TXOP 自动策略

基线：B26 8004ae29ebae2268168f74cc472ee7c9156928f2；同时保留已提交的 BA 失败清理 146（5e5474b、6000335）。新增 147，mt76 包 release 13。

## 范围与结论

本版将已核实的量产默认 **主机侧 TXOP** 改成自动策略，替换此前手动场景回放初稿。不是修改几个静态 TXOP 参数。此时仅有离线测试与构建验收，不能认定已根治 2.4GHz 双向下行低速，也不能声称完整移植了原厂驱动及 WM/WA 内部调度。

| 原厂行为 | B27 对应实现 | 验证/限制 |
|---|---|---|
| TxBurst=1；BSS/peer 建立时 DEFAULT vote | XR1710G AP/STA 默认开；BE TXOP=187（5984us） | 原厂初始化 + profile + SDK 调用链；不是 APTxop=0 |
| 周期采集/平滑每站统计 | 每设备约1秒查询 ADM、MSDU、TX_STAT，独立统计缓冲；EWMA；非WED路径不重复累计通用站点计数 | 额外请求新 tag 1；当前 WM 的实际回复需刷入后验收 |
| MLO 主流站平均 TX MPDU 长度 <=700 且无 MU 时 TXOP0 | 按 band 选平均字节数最大的站，使用真正 MPDU 数；否则187 | 不用 MSDU 冒充 MPDU；缺失 MPDU 时回默认187 |
| 普通 AP 的 500Mbps 资格门槛 | 原样保留 `(avg_tx+avg_rx)>>17 >=500` | 2.4GHz 较低吞吐可能不会触发 UL vote，不能调低门槛后称与原厂一致 |
| AP UL：平均RX MSDU >1000 且MU timer0 | 高优先级 UL vote=0；否则撤销 | RX包数0走 rx_bytes>tx_bytes*10 分支 |
| STA/APCLI UL | 平均RX MSDU>1000 置 UL0，否则撤销 | 保留高吞吐资格门槛 |
| 多个策略的优先级仲裁 | DEFAULT、UL 独立投票，高优先级覆盖；退出恢复 DEFAULT | mt76 每 link/BSS 独立；无共享 BSS 索引的多个 wdev |
| 状态切换后写EDCA | 调现有同步 EDCA_UPDATE；保留hostapd queue_params | 没有改远端终端的WMM广播参数，也没有按TCP包改AC |
| 自动退出与接口生命周期 | 流量结束撤销UL；最后接口删除取消工作；固件恢复更换统计epoch、重发EDCA | 重连清除旧统计；MCU失败恢复软件状态并下周期重试 |
| 原厂默认 flags=0x81 | 移植上述默认实际会执行的分支 | AIFS调整及旧2.4GHz TXOP_FE路径默认不生效，未强行打开 |

## 未完成的“完整原厂移植”部分

原厂另有 MCLI CW/WRR、near/far、公平性、RED 和聚合算法。它们并不都属于默认 TXOP 路径，不能拿本次默认 TXOP 移植冒充这些功能已经完整移植。

- MCLI 独立开关在量产 profiles 中没有开启；SDK的初始化保持0，WRR默认0。当前没有新增可开启 MCLI 的完整实现。SDK头文件门槛16，不应把旧注释中的32写成已确认的量产门槛。
- 自定义非默认 EnAdjust/TxCountTh/TxPktSizeTh 模式、sim_* 手动注入及旧 TXOP_FE 模式未移植。
- WM/WA 内部 RED、队列控制与 ACK 处理并无可验证的完整源码；没有替换二进制、没有宣称逆向完成。
- 普通AP、STA及MLO真实链路行为都需实机验证；离线场景测试不等于射频硬件验收。

因此：**默认主机 TXOP 路径已实现自动化，但用户要求的全部原厂调度完整移植仍未完成。** B27 是验证候选版。

## 来源与指针证据

量产样本：用户提供 F:/123pan/Downloads/XR1710G原厂.BIN，量产5.1.1.12，不是工程备份。提取 Squashfs SHA256：1d762a823a89b0e0d1ece973edd0e7c35f68eb61f937ff13f2f4d194051df852；mt_wifi.ko SHA256：04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0。

- `peak_adjust_init_mac_ad` 0x297b54：flags=0x81；adapter+440 为 physical_dev，0x297ba8 从 physical_dev+690 读取 TXOP。
- `physical_device_add_mac_adapter` 0x380fd8..0x380fdc：physical_dev=外层对象+64，存入 adapter+440。
- `physical_device_add_main_device` 0x37fd6c、0x37ff04..0x37ff08：以同一 physical_dev 调芯片初始化表回调。
- `mt7990_init_default` .text.unlikely 0xfb70..0xfb94：w5=0x00bb0100，写 physical_dev+688；little-endian 下 +690 半字=0x00bb=187。这里是初始化默认值，不是读取实体原厂运行值。
- `peak_adjust_txop` 0x297c10；700字节条件仅在 MLO 路径，不能套到普通AP。
- `hw_set_tx_burst` 0x37f730 及其仲裁，优先级位图取最高有效优先级；同优先级相同BSS合并取最大level。

公开 SDK 用于接口及调用链交叉核对，独立实现没有拷贝整份厂商源文件入仓：

- https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi
  - common/performance/cmm_peak_adjust.c
  - ap/ap.c；hw_ctrl/hw_ctrl.c；hw_ctrl/hw_ctrl_ops_v2.c
  - chip/mcu/cmm_fw_uni_event.c；include/hw_ctrl/cmm_fw_uni_event.h（tag1：wcid16、reserved16、attempts32、failed32）
  - include/peak_adjust.h；include/ap/ap.h；include/ap/ap_vow.h；include/tr.h
- https://github.com/Sirherobrine23/airoha_sdk_wireless/tree/828414b3db0af4ada1ddf086c9a13e3b57ce626d

本次没有借YYH/LEDE名称为上述187或700分支背书；这些值来自本次量产模块及MTK SDK交叉核实。下载URL、文件SHA256在来源记录中。

## 关闭与回退

VIF 的 mac80211 debugfs 目录新增 root-only `stock_txop_policy`，读操作仅显示状态，不触发MCU温度读取。写 `0` 请求撤销覆盖，自动工作随后将未修改的hostapd EDCA下发；写 `1` 恢复自动策略。需再次读取确认 error=0、active=0/1。接口重建后按量产默认开启。

示例（先用 find 确认实际AP接口，不能把phy编号等同于频段）：

```sh
find /sys/kernel/debug/ieee80211 -name stock_txop_policy
cat /sys/kernel/debug/ieee80211/phy0/netdev:接口名/stock_txop_policy
echo 0 > /sys/kernel/debug/ieee80211/phy0/netdev:接口名/stock_txop_policy
```

源码回退用交付的 B27-rollback-to-B26.patch，在干净B27树中先 `git apply --check` 再应用；不使用硬重置覆盖其他修改。固件回退仍需正常 sysupgrade 流程，本次不会自动刷机。

## 测试方法及验收标准

1. 有线管理链路优先；不自动切电脑网络。记录boot_id、iw dev、station dump、logread/dmesg、上述策略状态、固件版本。
2. iperf3每种至少2分钟：单流上行、单流反向、`-P 4 --bidir`、单流`--bidir`；电脑流量显式绑定2.4GHz接口IP。记录两向吞吐、重传、协商速率与信号。
3. 同时每2秒读一次策略状态；确认events_bytes/msdu/mpdu持续增长。tag1缺失时停止把MLO分支标为实机通过。
4. 用同一固件写0/1做配对对照，保持频宽、位置、功率、TCP参数相同。关闭生效需error=0且active=0，开启需active=1。观察闲置/大包上行/双向/结束后的TXOP切换及恢复。
5. 三频各测，检查MT7996消息超时、PCIe AER/CmpltTO、SER、BA错误、温度异常；日志保存在有线电脑，路由器本地只用/tmp并轮转限额。不重启设备来掩盖错误。
6. 2.4GHz低速必须以双向接收端吞吐复测判定；只有离线测试通过、没有断线或TXOP改变，均不能称问题已解决。

构建方式：清理mt76后重新编译驱动，再make world；保留已有工具链及未修改软件包缓存，不是全量清空重建。驱动文件、实际FIT/rootfs/module、固件bin哈希及设备DTS做离线一致性核验，不能替代实机测试。
