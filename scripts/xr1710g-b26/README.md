# B26 上游合并合理性审查与验证边界

## 结论

B25 的 2.4GHz 多流双向 TCP 下行异常仍存在。本次只合入 MTK 正式发布的硬件 A-MSDU 数量上限对齐补丁，作为 B26 独立候选；没有证据将它称为根治补丁。B26 未刷机、未完成候选固件的实机验收。

## 参考来源与取舍

- MTK WiFi7 4.3 Formal Release：`mediatek/mtk-openwrt-feeds@9b5754e3a361635595ea31a14176b14169e69d18`，目录 `autobuild/unified/filogic/mac80211/25.12/files/package/kernel/mt76/patches`。
  https://github.com/mediatek/mtk-openwrt-feeds/tree/9b5754e3a361635595ea31a14176b14169e69d18/autobuild/unified/filogic/mac80211/25.12/files/package/kernel/mt76/patches
- 实际合入 `0012-mtk-mt76-mt7996-update-max_amsdu_num.patch`，原作者 Shayne Chen，2026-01-22，原提交 `c6fd5767d61b601dbc4d7a91f12c7a39c2726ec0`。保持原补丁正文与署名，仅变更本地文件排序名。将 STA_REC_HW_AMSDU 的 max_amsdu_num 从 8 改为 31，按厂商说明与 Logan 的硬件能力一致；不是把每个包强制聚合成 31 个子帧。对端协商的最大 MPDU 字节长度仍按原代码选择，不扩大其协商长度。
- 未改客户端窗口、TCP 拥塞控制、DSCP、NPU、无线 bin、PCIe、EEPROM；B25 的 UL OFDMA 候选保留，确保 B25→B26 只比较一个驱动行为变化。
- MTK 0010（重连后 DL OFDMA 失效）：当前 mt76 已无该错误断开命令，不重复合入。
- MTK 0031（每频段 token 上限）：针对跨频段共享 token 池争用，本次 2.4G 单频测试 token 未耗尽，没有适用证据，不合入。
- MTK 0025 critical packet mode：明确排除 is_mt7996，不能拿来声称修复本机。
- MTK 0057 QoS 映射：当前已有 DSCP 映射实现，不能把旧代码覆盖回去；默认 DSCP 0 的复现也不支持其为本次根因。
- MTK 0065/RRO BA 删除竞争：特定 WED/RRO 会话生命周期，不直接套用 Airoha NPU。
- MTK 0066/0071：当前已有 WED/NPU TX 状态触发聚合会话保活；本轮异常时 TID 0 双向聚合会话均在，暂无 BA 未建立的证据，不为凑补丁引入整套事件路径。
- MTK 0053/0054：厂商 vendor/debug 大补丁包含大量认证、手动 RU、固定 trigger、寄存器操作，未整包导入。
- YYH：正确检查板子分支 `xr1710g@058cf5fba7c2f6a5d5967b087df8b0e980ab7156` 以及已采用的 `xr1710g-6.18-integration@9e44788d769164dc9f691670add71dc466d99a4c`；默认 main 是上游镜像，不代表该项目板子实现。其 PS_SYNC 处理已在当前代码中存在，不重复套用旧补丁。引用 https://github.com/YYH2913/openwrt/tree/xr1710g 。
- LEDE `80122feac964` 的 6.18 mt76 使用 2026-09-01 的 be5ce791，早于当前 2026-10-28 的 0936617d；其附加补丁没有此次 MT7996 HE20 双向故障的直接修复，不进行整包驱动降级。引用 https://github.com/coolsnowwolf/lede/tree/80122feac964/package/kernel/mt76 。
- OpenWrt mt76 当前检查到 HEAD 0936617dc529ff9da0385221d3fa6de732231177，与当前驱动基底一致。引用 https://github.com/openwrt/mt76/commit/0936617dc529ff9da0385221d3fa6de732231177 。
- 同芯片 ASUS BT8、GL BE14000 及 XR1710G 量产固件：延续 B25 已归档对比；它们的动态 TXOP/RED 依赖调用条件、私有固件和加速路径，未确定这些条件前不搬默认值。不能把模板 DAT 当作实际运行值，也不能因公开正式 bin 较旧就替换当前较新的无线 bin。

## 本轮在线定位

原始记录目录：`F:\openwrt\wifi-fix26\runtime\20261113-081817`。

电脑无线绑定 192.168.50.157，SSH 使用有线；信道 6 / HE20，P4，每组 30 秒，忽略前 2 秒，无限速、默认 socket 窗口与 TOS。吞吐取接收方有效值，均正常退出。

| 模式 | 上传 Mbps | 下行 Mbps |
|---|---:|---:|
| 单向上传 | 170.504 | — |
| 单向下行 | — | 199.217 |
| 双向 | 176.474 | 2.760 |

在负载采样点：TID 0 RX/TX BA 均已建立；未见 PS_STA 状态、驱动省电缓存 bitmap 为 0、各 AC 省电缓存为 0；软件 AQM 队列采样为空。该结果不支持“缺省电同步”或“聚合会话根本没建立”为本轮原因。瞬时采样不能排除短时状态变化。

现有 TX MSDU 直方图只有 1～8 桶，而且部分硬件统计来自共享计数，不能据它推断逐频段 31 子帧的实际使用情况或称上限 8 已确定造成异常。

此前双端时间戳显示：客户端发出的 TCP ACK 在 AP 硬件接收之前已出现显著等待，AP 接收后软件处理很快。这仍指向空口竞争/终端上行队列与 ACK 饥饿，但没有完整空口 trace 或固件调度计数，尚未证明具体哪条调度算法有错。手机同样复现，不归咎单一电脑网卡驱动。

测试脚本已停止自己的 iperf 服务；未重启无线、未切换 Wi-Fi、未修改持久配置。

## 构建、回退与验收

基线 B25 c0ff60f7732152db3df56df3aac78e1d3fa9b6a9；独立 B26 分支和回退标签，生成正反向源码补丁。只清理重编 mt76 并执行 world，复用工具链及无关包缓存，不能称从零全构建。

编译通过和离线镜像验收不等于实机吞吐修复通过。烧录仍由用户决定；不自动升级。

B26 需在相同信道、带宽、位置，以默认窗口的 P4 双向 120 秒与单向测试对比 B25；还需 5/6GHz 回归及日志检查。判定应看双向合计吞吐、下行改善与两方向排队，不以牺牲上传或限窗换来的数字作为根治；没有实测前始终标为候选。若无改善，应回退本次独立提交，继续空口/固件调度定位。