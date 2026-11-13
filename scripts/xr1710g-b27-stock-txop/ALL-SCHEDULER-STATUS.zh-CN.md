> 2026-11-13 离线逆向更新：原厂和当前 WM/WA 已解出可分析 payload；此前“加密导致无法继续”的限制已解除。已还原部分 ACM 配置、阈值换算及 VOW 命令分派，尚非全部算法等价。见 [WM/WA 逆向报告](wm-wa/README.zh-CN.md)。以下保留此前阶段记录。

# B27 原厂调度一致性核对（未完成全部移植）

目标：以用户提供的 XR1710G 量产 5.1.1.12 为依据，复现可核实的主机调度语义；不把调参、接口存在或编译通过等同于完整移植及实机修复。

## 原厂证据与来源

- 用户原厂烧录器镜像：`F:\123pan\Downloads\XR1710G原厂.BIN`；本次不是工程测试版本。
- 提取 rootfs SHA256：`1d762a823a89b0e0d1ece973edd0e7c35f68eb61f937ff13f2f4d194051df852`。
- 提取 mt_wifi.ko SHA256：`04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0`。
- 公开 SDK 辅助参考：https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi 。有 MediaTek proprietary 声明，补丁独立实现，没有拷入整份厂商代码。
- AN7581 SDK 交叉来源：https://github.com/Sirherobrine23/airoha_sdk_wireless/tree/828414b3db0af4ada1ddf086c9a13e3b57ce626d 。公开 SDK 与量产二进制存在差异，冲突时以量产证据为准。

## 一致性覆盖表

| 调度部分 | 量产/SDK证据 | 当前状态 | 尚不能声称一致的地方 |
| --- | --- | --- | --- |
| TxBurst 基线 | peak_adjust_init_mac_ad；mt7990_init_default 的 physical_dev+690=187；量产 profile TxBurst=1 | 147 实现 BE TXOP187，单位32us | 后续配置可覆盖能力值，187不是原厂实机运行读值 |
| MLO peak TXOP | peak_adjust_txop；平均 TX MPDU 长度<=700且 MU timer=0时为0，否则187 | 147实现判定，149修正目标BSS | main_entry统计取值和固件read-clear时序仍需实机对照 |
| 非MLO UL | spot AP/STA，平均RX MSDU>1000；AP高吞吐门槛500；MU判定 | 147实现 | 多个STA模式接口的首站门槛/累加顺序仍待补齐，不能标完全一致 |
| WCID选择 | MacTableMaintenance按WCID升序，spot AP取首个，cur_wdev取最后一个；main_entry与输出对象独立 | 149修正AP最小/最大WCID选择及主流量平局选择 | 多BSS共享WMM及MLO主站特殊覆盖顺序仍待核对 |
| 5GHz近远端 | vow_variable_reset 0x301280..0x30128c：开启、54/520Mbps；MacTableMaintenance 0x9f04..0x9f3c；同wdev avgTX包数>10 | 149增加第二遍收集，快慢站同时出现时投票TXOP0；退出撤销 | cfg80211速率表示与厂商getRate的取整、速率采样来源不同，属于语义移植，尚无实机逐周期对照 |
| MCLI TXOP | dynamic_txop_adjust；DL/UL分类、门槛16、UL时PRIO_MULTI_CLIENT=0 | 151已实现默认BESRA主机路径 | 已接入分类、独立投票及错误/reset恢复；多BSS/MLO与实机统计时序仍待验收 |
| MCLI CW/WRR | mcli_schedule_en、dl_wrr_en、CWmin4/5、CWmax6；SDK默认关闭 | 未移植 | 已确认整块分配清零、profile无启用覆盖、dl_wrr_en明确清零；mcli_schedule_en仍待排除全部初始化别名/宽写 |
| 动态BA/聚合 | dynamic_adjust_ba_winsize；量产BA<=64上限7，否则14，SDK额外有11；PER>35缩小、<15增大 | 未移植 | 此前按SDK推断basize进FW已纠正：量产真实回调0x1137d0直接RMW WTBL DW7；index不是mt76协商窗口；150已补齐配对PER输入，硬件执行仍未移植 |
| airtime fairness/AMPDU效率 | dynamic_airtime_fairness_adjust；dynamic_ampdu_efficiency_adjust_all；默认flags0x81跳过部分旧分支 | 现有mt76 VOW保留 | flags0x81不表示所有调度都关闭；默认和可选分支覆盖均未完成 |
| VOW/DRR | 原有mt76已有STA_ALL/DEFICIT_BOUND/QUANTUM_ALL/STA_PAUSE及feature control | 已有实现，未改写 | 表和默认索引已证实不同：原厂BE4096us、当前2560us；其余feature/恢复仍待逐项核对 |
| RED/ACM | red_init/red_setting_init；MCU_OFFLOAD分支模式2；VOW tag0x18开关；tag0x19函数存在但未找到有效事件引用 | 当前mt76仍关闭RED | 报告函数唯一重定位来自.eh_frame，未证实实际接入；ACM资源/ABI待核对，不能只把WA参数从0改1 |
| WM/WA内部调度 | 原厂与mt76分别通过各自MCU ABI控制闭源固件 | 未逆向完成 | 主机策略相同不能证明闭源内部算法和ABI相同；当前不能承诺全部调度与原厂完全一致 |

## 本轮代码与验证

- patch148：兼容 OpenWrt backports 的 CPTCFG_MAC80211_DEBUGFS，实际模块已确认包含 stock_txop_policy 接口，修复上一候选被宏裁掉的问题。
- patch149：AP首/末WCID选择、主流量平局选择、独立调度目标、5GHz近远端TXOP票及debugfs状态。
- 两补丁均通过 fuzz=0 正向应用、反向逐字节回退；checkpatch 0 errors/0 warnings。
- 提取当前实际 mt7996_stock_apply 函数进行 ASAN/UBSAN 故障注入，覆盖近远端进出、10/11包门槛、54/520Mbps边界、未知速率、MU、MLO、MCU失败重试、关闭、reset重发及停止beacon。
- mt76编译通过；编译模块含工作函数、近远端收集函数、debugfs控制接口及near_far输出。详见 module-verification.json。
- 本轮没有刷机、切网、重启无线，没有路由器实测。未生成标称“全部原厂调度一致”的正式固件。

## 回退

- 原始B26：8004ae29ebae2268168f74cc472ee7c9156928f2；保留tag xr1710g-B26-before-stock-policy。
- 当前工作分支：xr1710g-B27-complete-stock-scheduler。分支名称表示工作目标，不代表已完成。
- 本轮修改单独提交；可先保存后续工作，再revert该提交。148、149也可在对应前像上分别反向应用，须按149→148顺序。

## 必须说明的结论

当前只是已核实主机逻辑的分阶段实现，**没有达到“原厂全部调度算法一致”**。缺口包括MCLI、动态BA、RED/ACM、VOW字段与WM/WA内部行为。不能把这一阶段的构建、单元测试当成2.4GHz问题已根治，也不能将上一候选固件当作通过本轮验收的固件。

## 追加核实说明

2026-11-13追加静态核实已纠正动态BA回调及RED反馈调用的旧推断，详见 `RETAIL-SCHEDULER-CONFIRMATION.zh-CN.md`（F盘对应“量产调度追加核实报告.zh-CN.md”）。本次仅更新研究证据与文档，没有新增驱动实现、固件构建或实机测试。

## 代码补全进展

150/151现已合入：配对TX_STAT失败计数与有效PER、默认BESRA MCLI TXOP投票。模块编译、实际函数ASAN/UBSAN测试和补丁逐字节回退通过。详见 `HOST-SCHEDULER-COMPLETION.zh-CN.md`；未完成项与实机验收仍保留，不能将历史核对报告的“仅文档更新”当作本轮状态。
