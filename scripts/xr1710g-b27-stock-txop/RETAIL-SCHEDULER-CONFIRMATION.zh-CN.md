# B27 量产调度追加核实报告

本报告依据用户标注为量产的 XR1710G 原厂烧录器镜像，分析提取的 5.1.1.12 驱动。它记录静态证据，不代表已在运行中的原厂路由器逐项读回，也不代表已经完成移植。

本次只核实和更新文档：未修改驱动、未生成新固件、未刷机、未切网、未加载原厂模块。

## 一、结论与此前判断的纠正

| 部分 | 本次确认 | 当前 B27 状态 |
| --- | --- | --- |
| 动态 BA | 量产真实回调直接读改写 WTBL DW7；0～14 是硬件窗口索引 | 未移植；此前按 SDK 推断“继续通过 AsicUpdateBASession 进 FW”的说法不适用于量产回调 |
| MCLI TXOP | 多客户端 TXOP 路径独立存在，不受 CW/WRR 总开关控制 | 未移植；不能用已有 peak TXOP 代替 |
| MCLI CW/WRR | 开关非零才每三秒处理；初始化明确 dl_wrr_en=0 | 未移植；mcli_schedule_en 默认关闭证据较强，但初始化的全部别名/宽写覆盖尚未排除 |
| VOW | 原厂与 mt76 的 quantum 表及默认 AC 索引不同，BE 有效时间片为4096/2560微秒 | 尚未对齐；不能只把表整体乘二 |
| RED/ACM | 原厂初始化启用，当前 mt76 显式关闭 RED | 未移植；报告函数存在，但尚未找到有效事件引用 |
| WM/WA | 原厂与当前构建使用不同二进制；区域标志均含加密位 | 内部算法未确认一致，主机移植不能消除这项差异 |

## 二、证据来源及启动配置链

- 原始镜像：`F:\123pan\Downloads\XR1710G原厂.BIN`。
- 提取 rootfs SHA256：`1d762a823a89b0e0d1ece973edd0e7c35f68eb61f937ff13f2f4d194051df852`。
- 原厂 mt_wifi.ko SHA256：`04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0`。
- 辅助 SDK：[benboguan/mt799x 固定提交](https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi)。量产回调与 SDK 不同时，以量产反汇编为准。未把厂商专有源码或原厂模块并入仓库。
- 交叉来源：[airoha_sdk_wireless 固定提交](https://github.com/Sirherobrine23/airoha_sdk_wireless/tree/828414b3db0af4ada1ddf086c9a13e3b57ce626d)。
- `etc/wireless/l1profile.dat` 的 INDEX0 指向 `mt7990.1.dat`；后者的 BN0/BN1/BN2 分别指向 `mt7990.b0.dat`、`mt7990.b1.dat`、`mt7990.b2.dat`。该入口有 `TestModeEn=0`。
- 三份普通 band 配置均有 `RED_Enable=1`、`VOW_Airtime_Fairness_En=1`，`VOW_WATF_Enable=` 为空。SDK 解析器只有值非空才覆盖 WATF。没有找到 `VOW_Mcli_Schedule_Enable` 配置覆盖。
- 镜像同时带有 slt/cert 配置；本报告没有把这些测试配置当作启动配置依据。上述链仅证明镜像内置入口，运行时 overlay 或控制程序仍可能覆盖。

## 三、动态 BA：已核实的量产真实路径

`dynamic_adjust_ba_winsize` 在 0x8580 处的函数通过 chip_dbg+112 间接调用。`mt7990_chip_dbg_init` 的 0x114f94/0x114f9c 装入 .text+0x1137d0，0x115024 将其存入 +112。

真实回调位于 `.text:0x1137d0..0x1138a4`。该地址没有独立的正确函数符号，objdump 显示成 `chip_get_sta_tx_cnt+0x190`，不能按显示名称判断用途。

已追踪的动作：

1. `halWtblReadRaw(ad,wcid,0,7,1,&value)` 读取 DW7。
2. 取 `(value >> (tid*4)) & 0xf`。新索引超过14，或与旧值相同，则退出。
3. 对该 TID 的4位字段做读改写。
4. 向 `0x820d4370` 写 `(wcid>>7)&0x1f` 选择组。
5. 向 `0x820d801c | ((wcid&0x7f)<<8)` 写回 DW7。

量产主机规则：只处理已建立 TX BA 的 TID0；协商 BA<=64 时索引上限7，否则14。初始索引15恢复到上限；PER>35 时，大于7右移一位，大于3则减一；PER<15 且未达上限则加一。公开 SDK 还含<=256上限11的分支，量产这里没有，不能照搬。

`UserCfgInit` 的0x1c2c8c/0x1c2c94构造0x23010010，0x1c2cc0写入：对应 threshold16、aggManualEn1、下降阈值35；0x1c2cc8写15。默认 aggManualEn 为真，不应误写成只有多客户端才调 BA。

公开 SDK 的 `chip_set_ba_winsize` 调 `AsicUpdateBASession`，末参1是 amsdu。**此前把该 SDK 路径当量产真实回调的推断已撤回。** mt76 的 `params->buf_size` 是协商窗口数量，不是此处4位索引，不能互相代入。

移植前还缺：PER分母及统计周期对应、TID0与MLO映射、索引到实际窗口数量的完整对应、FW是否异步覆写、组选择与其他WTBL读写的锁、站点删除/重连/SER后的恢复。不在这些条件未确认时直接写寄存器。

## 四、MCLI：不能把两套开关混为一谈

### 默认参与的多客户端 TXOP

量产 `MacTableMaintenance` 的0x9e8c起仍执行多客户端 TXOP。有效 DL+UL 客户端数至少16且主流量为UL时，对 PRIO_MULTI_CLIENT 投 TXOP0；退出资格或变DL后撤票。TALOS2的SPL特例不适用于本机的BESRA4。

分类使用分阶段整数运算，例如 TX 大于 `((tx+rx)/10)*(70/10)`；RX判定依据上一周期平均包长采用50%或70%。DL优先于UL，平均RX包长在分类后更新。直接改成一次乘除的百分比会改变边界。

资格包含平均包数>10或平均字节>2560，5/6GHz字节门槛为12800，并须方向匹配。TCP计数门槛默认0；若允许非零配置，需要真实TCP/ACK计数，不能拿总包数代替。

### 可选 CW/WRR

0x9fe4 读取 adapter+0x130bb28 的 mcli_schedule_en，为0跳过；非零且周期可被3整除才处理。还要求流量客户端数与TCP合格数均至少16。

已核实默认 CW：DL CWmin4/CWmax6，UL CWmin5/CWmax6；`UserCfgInit:0x1c2980` 明确清 dl_wrr_en 为0。只有该WRR开关开启才切换 FOLLOW_HW1/WRR1，退出需恢复之前保存的值。

`AdapterBlockAllocateMemory:0x392a80` 对分配块执行 memset0；配置/脚本中未找到上述MCLI启用覆盖，SDK也未见默认设1。这支持 mcli_schedule_en 默认为0，但不等于已静态证明所有初始化别名/宽存储均不覆盖。该项继续保留限定，不能为了“完整移植”而默认强开。

## 五、VOW：具体差值

表值单位均为256微秒；原厂 uni_cmd_vow_set_sta 原样复制8字节表，未发现额外除二转换。

| 项目 | 量产默认 | 当前 mt76 构建 |
| --- | --- | --- |
| 全局 quantum 表 | 6,12,16,20,24,28,32,36 | 3,6,8,10,12,14,16,18 |
| BK/BE/VI/VO 默认索引 | 2,2,1,0 | weight256 时3,3,2,1 |
| 对应时间片，微秒 | 4096,4096,3072,1536 | 2560,2560,2048,1536 |
| ATF | 初始化与三band配置启用 | 启用 |
| WATF | 镜像配置为空、默认0有证据，仍需完整初始化排除 | feature命令启用 |
| 默认调度类型及模式 | FOLLOW_ALGO0/SRR0 | FOLLOW_POLICY0/SRR0 |

最后一行名称不同但数值相同，不能仅凭名称判定不同算法。原厂表证据是 `vow_variable_reset:0x301238..0x30126c`，64位常量0x24201c1814100c06；AC索引在0x3011f4..0x301220。

原厂 `mt7990_init:0x10d12c/0x10d1c0` 设置 VOW_GEN_BESRA=4。动态 airtime fairness 中 VOW_GEN>=FALCON3 会将 shrink 置假；不应把老FRR缩短分支默认强开。还需逐字段比对 keepQuantum、SER keep26、deficit bound、pause及退出恢复，才能实施完整VOW补丁。

## 六、RED/ACM：初始化已证实，事件反馈不能假定

量产 `red_setting_init` 默认 enable1、target20000微秒、ATM_on15000微秒、off20000微秒。`red_init` 仅 inf_num0 运行一次；MCU_OFFLOAD 能力分支通过 WM VOW tag0x18发模式2，WA `MtCmdCr4Set(14,enable,0)`。

ACM初始化读取四个token来源，值为0或超过16384时归为16384；priority offset255、TCP offset200，通过 ACM_TOKEN_CONFIG 发WA，并设置PBC NORMAL。**这些是原厂资源条件下的值，不能将16384无条件照抄到当前WED/NPU资源池。** 当前 mt76 初始化以 `MCU_WA_PARAM_RED,0,0` 关闭RED。

报告函数 `UniCmdExtEventRedTxReportHandler` 的确编入模块，范围0xcdac4..0xcddc8，局部符号。对整个函数范围的重定位扫描只找到一条，来源 section23 已确认是 `.eh_frame`；整个反汇编中也未找到函数外跳入其范围的直接分支。其他原厂 .ko 没有该符号的外部引用。

因此：目前没有找到它的有效事件注册或调用证据；不能再把它描述为量产必经反馈链，也不能仅据此断言函数在所有条件下绝对不可达。`UniEventVowHandler`处理的airtime报告不能作为RED注册证据。WA内部RED仍可能独立运行，不能因报告回调无引用而推断RED关闭。

SDK报告布局初步确认为输入header132字节、输出tag0x19 header136字节及每站8字节，但输入逐站结构、事件类型、长度验证和当前FW ABI仍需核实。不能只把当前RED参数从0改1后声称完成RED/ACM移植。

## 七、WM/WA：主机策略无法保证内部算法相同

| 固件 | 原厂构建标记 | 当前源码 staging 构建标记 |
| --- | --- | --- |
| WM | 20240306143154 | 20260721003035 |
| WA | 20240207161506 | 20260721002917 |

四个文件哈希均有记录，见同目录 `WM-WA-binary-comparison.json`。这里“当前”指构建目录，未通过本轮SSH读回实机，不能当作实机版本证明。

按mt76的36字节trailer和40字节region描述解析：WM9区域、WA3区域，全部区域 feature bit0 置位；`mt76_connac_mcu.h`定义该位为 ENCRYPT。不能直接将这些原始文件当明文代码反汇编并声称还原了内部调度。

区域边界检查合理，但文件中仍有36～156字节的未解释部分，已以 unparsed_bytes_before_region_table 记录。未将其未经证实地命名为签名，也未宣称整个私有格式已完整验证。不以替换旧原厂WM/WA来强求一致。

## 八、额外发现：固定GI的WTBL地址疑点

原厂BESRA硬件头将GI放DW6，BA索引放DW7。当前 mt76 固定GI分支却修改DW7的31..24或15..12；本次获取的公开 openwrt/mt76 master 也同样如此，证据URL与内容SHA256保存在 `upstream-fixed-gi-check.json`。

这只在显式固定GI路径触发；正常自动速率会提前返回。尚未证明芯片修订差异与寄存器版本适配，**不把它定为当前自动速率2.4GHz问题的根因，也未据此修改DW地址**。加入动态BA前必须先消除两者字段是否冲突的疑点。

## 九、实现顺序与验收边界

1. 先补全上述ABI、统计和生命周期核实；独立实现主机策略，不导入厂商整份专有文件。
2. MCLI TXOP 与现有优先级投票合并；CW/WRR保留与原厂相符的默认开关及回退值。
3. VOW应同时核对表、默认索引、WATF与feature字段；不能仅乘二时间片。
4. 动态BA先确认硬件索引、PER与同步机制，再实现重连/SER恢复。
5. RED最后接入，先确认实际事件/WA自主管理模式与token预算；不以猜测报告入口补全协议。
6. 新补丁需正反应用、驱动编译及故障注入；之后才做双向多流、长期负载、重连/SER实机验收。

以上均不能替代实机验证。目前没有证据证明2.4GHz问题已经根治，也没有达到“全部调度与原厂一致”。

## 后续代码进展

本文件保留核实时的历史状态。后续150/151已补齐PER输入及默认MCLI TXOP，详见 `HOST-SCHEDULER-COMPLETION.zh-CN.md`；其余未确认项没有自动解除。
