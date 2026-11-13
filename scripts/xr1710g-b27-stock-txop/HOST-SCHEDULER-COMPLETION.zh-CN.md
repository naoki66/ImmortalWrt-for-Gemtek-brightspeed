# B27 主机调度补全：PER 与 MCLI TXOP

本次已修改并合入驱动源码，新增150、151两份补丁，mt76包release从14升到15。仅XR1710G的现有stock_policy路径使用这些逻辑。没有刷机、访问路由器、切网或重启无线；本次完成mt76模块编译，没有生成整机升级镜像。

## 已完成

| 补丁 | 实现 | 边界 |
| --- | --- | --- |
| 150-mt7996-retail-paired-tx-per.patch | 保留同份TX_STAT的attempts/failed，区间PER有效性判断、epoch清理、两个reset状态下的事件屏蔽、主流量站诊断 | 没有写WTBL或开启动态BA |
| 151-mt7996-retail-mcli-txop.patch | 方向分类、客户端资格、默认16门槛、独立MCLI TXOP0投票、目标选择、退出与错误重试 | 没有启用可选CW/WRR；没有实现TALOS2专用SPL逻辑 |

### PER

计算来自配对固件计数，不从TX-free重试累计值反推。零尝试、失败数大于尝试数、缺少TX_STAT和乘法可能溢出的区间标为无效；合法0% PER保持有效。采样间隔不合理、epoch变化或缺少基础采样时清理旧结果。多个配对TX_STAT可在当前收集区间累加，不混用字节数作为分母。

调度器仍依靠现有轮询；没有增加MCU请求种类或频率。诊断缓冲改成PAGE_SIZE堆分配，避免增大内核栈。

### MCLI

- 采用原厂分阶段整数运算：总字节先除10，再乘7；RX门槛由上一周期RX平均包长是否小于256决定为50%或70%。DL优先决定主流量方向。
- 未知信道时不计入合格客户端，避免猜成2.4GHz。收发方向分别计数。资格为平均包数>10或平均字节超过2.4GHz的2560、5/6GHz的12800。
- 接口按最大WCID选目标，主流量按最大TX+RX字节数选站、平局取较小WCID。统计在低吞吐过滤前计入，避免把已有peak门槛误套到MCLI。
- 合格DL+UL计数达到16且主流量UL时投独立MCLI TXOP0票；主流量DL或不足16时撤销；达到门槛但主流量暂不能分类时，保留同目标同epoch的旧票。这一保持行为来自原厂分支，不能简单写成“非UL就清零”。
- 目标迁移时旧接口撤票；reset后不保留无依据的旧票；MCU失败沿用既有回滚及下轮重试机制。关闭stock_txop_policy时退出本策略。
- 没有强开原厂默认关闭证据较强的可选CW/WRR，也没有为非零TCP门槛伪造报文计数。

这仍是量产默认主机语义的分阶段实现。多BSS共享WMM、MLO和实机统计时序仍需对照；不能宣称每种厂商配置组合已完全等价。16客户端规则本身也不能证明单客户端2.4GHz低速已解决。

## 参考依据

- 用户量产5.1.1.12提取的mt_wifi.ko，SHA256：`04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0`。
- 量产PER：UniEventAllStaUnsolicitHandler的0xd6b24..0xd6b34。
- 量产MCLI：MacTableMaintenance的0x9e8c..0x9ef0及其UL/DL分支；UserCfgInit的0x23010010初始化常量中门槛16。BESRA4不走VOW_GEN_TALOS2分支。
- [benboguan/mt799x固定提交](https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi)：ap/ap.c的dynamic_txop_adjust、方向分类和avg_pkt_len_calculate；chip/mcu/cmm_fw_uni_event.c的TX_STAT处理。
- SDK中的注释仍出现32客户端，量产默认值为16；本次没有把过时注释当默认值。补丁独立实现，未复制厂商整份专有文件。

## 验证结果

1. 两补丁fuzz=0正向应用后的五份源码与实际编译源码逐字节一致；按151→150反向应用后与pre150逐字节一致。
2. checkpatch严格检查：两份均0 errors、0 warnings、0 checks。下游patch以--no-signoff检查，未伪造用户签署。
3. ASAN/UBSAN测试从实际驱动源码提取event、collect、apply函数，使用主机侧内核接口替身执行：
   - paired PER有效0、空样本、失败大于尝试、累计、整数边界、epoch清理及两个reset状态。
   - 字节/MSDU/MPDU报告缺失、异常样本、长间隔及上一周期RX包长的实际执行顺序。
   - MCLI资格边界、15/16客户端、UL进入、DL退出、未分类保持、目标变化、reset清票、MCU失败重试、关闭恢复。
   - 原有AP/MLO、MU、近远端、停止beacon及TXOP恢复回归。
4. `make -j6 package/kernel/mt76/compile V=s`退出0；实际mt7996e.ko含stock事件、采样与工作函数，以及新增PER/MCLI诊断字符串。apply可能被编译器内联，未要求独立符号存在。

这些是源码、主机状态测试与模块构建验证，未替代路由器硬件验收或吞吐测试。

复测命令（WSL源码根目录）：

```sh
python3 scripts/xr1710g-b27-stock-txop/completion-event-tests.py
python3 scripts/xr1710g-b27-stock-txop/completion-collect-tests.py
python3 scripts/xr1710g-b27-stock-txop/completion-state-tests.py
```

可通过B27_MT76_DIR指定驱动目录，通过B27_TEST_DIR指定测试输出目录。测试从实际源码提取函数，不读取旧研究快照。

## 后续实机检查

本轮没有进行以下实测。后续固件包含150/151并烧录后，读取对应VIF debugfs的stock_txop_policy：

- band_main_wcid用于关联主流量站；必须同时查看per_valid，不能单看per=0。
- mcli/dl_clients/ul_clients/main_mode用于核对16客户端进入与退出。普通单客户端测试预期不会触发MCLI票。
- 原有enabled、active、txop、updates、failures和error用于查看应用与重试。
- 关闭接口可回退到hostapd EDCA基线；该开关沿用B27原有机制，不能用于回退未实现的RED/VOW策略。

不在未取得完整基线时自动关闭加速、切换无线或改写校准数据。2.4GHz、5GHz、6GHz双向长期负载与重连/SER均仍需实机验收。

## 仍未完成

动态BA的WTBL执行、索引到窗口映射、FW并发及会话恢复；MCLI可选CW/WRR与非零TCP计数；VOW全局表/索引/权重语义及WATF完整初始化；RED事件/ACM资源；WM/WA内部调度。

PER输入缺口已补齐，但此前整体合并核对中的其余缺口仍然成立。不能将本轮描述为“原厂全部调度一致”，也不能保证已根治2.4GHz双向问题。

## 回退

150和151分别提交；回退顺序为先151后150。离线补丁也需按151→150反向应用，并重编译模块或固件；删除文件不会撤回已加载到路由器内存的驱动。本轮未加载或刷入新模块。

实际构建模块SHA256：`3ff014a5df121674d9c1344546404f07e6eee41b42badd6a445dde70af3e02a3`。
