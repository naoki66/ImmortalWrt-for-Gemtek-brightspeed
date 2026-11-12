# XR1710G 量产功率表移植（B23）

## 来源与选择依据

来源是已提取的 XR1710G **量产 5.1.1.12** rootfs，文件 `lib/modules/5.4.55/mt_wifi.ko`，不是工程机备份。模块 SHA256：`04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0`。
`etc/wireless/l1profile.dat` → `mt7990.1.dat` → `mt7990.b0/b1/b2.dat`；三频段均为 `SkuTableIdx=3`、`SKUenable=1`、`BFBACKOFFenable=1`。

反汇编证据（模块 .text 偏移）：

- `RTMPSetProfileParameters` 0x179760 读取 `SkuTableIdx`；0x17d270–0x17d298 将解析值直接写入 adapter+0x10831f2，无减一。
- `mt7990_init` 0x10c950 注册功率表索引回调 0xf9300；回调 0xf9310–0xf9314 原样返回上述字节。
- `MtPwrFillLimitParam` 0x385234–0x3853c8 按零基索引取 `pcptrSkuTbl`；索引 3 的重定位指向 **Sku_04**。backoff 数组同理选择 **Backoff_04**。
- 0x38565c–0x38566c 复制 SKU **417** 字节；0x3856fc–0x38571c 复制 backoff **494** 字节。每记录前两字节为频段和信道，记录步长 496，共 117 条。
- `MtPowerLimitFormatTrans` 0x384adc–0x384af0 将文本 dBm 左移一位；小数路径补半 dB，二进制表已经使用 **0.5 dBm**。不再次乘二。

不能使用旧式 `mt7990-sku.dat` / `mt7990-sku-bf.dat` 示例文件替代上述内置表。也不能将配置值 3 误认为符号 `_03`。

## 转换与作用

共导入 2.4 GHz 14 条、5 GHz 44 条、6 GHz 59 条记录。两种 XR1710G 分区布局共用 `an7581-xr1710g-stock-power.dtsi`。`board` 是设备功率上限回退节点，不修改国家码，也不放宽 cfg80211/regdb 或 EEPROM 的上限。

- SKU：CCK 4、OFDM 8、HT20 8、HT40 9、VHT 4×12、HE 7×12、EHT 16×16。mt76 使用共享 HT/VHT 的 4×10 MCS 数组；已逐条确认 HT20/40 和对应 VHT 前 8/9 项完全一致。VHT 每组最后两字节不支持且为协议填充，发送时仍保留 mt76 的两字节零填充。
- 原厂数组 SKU 417 字节后还有数据，但原厂发送函数只复制前 417 字节；不把额外部分误当当前接口支持的扩展。
- backoff：CCK 5、OFDM 5、OFDM BF 4，随后 16 组 RU，每组非 BF 15 + BF 15。DTS 拆成 `paths-ru` / `paths-ru-bf`，驱动发送时按原顺序交织恢复，共 494 字节。
- 0x7e 保留为原厂未用项标记，不解释成实际 63 ℃ 或发射功率设置。
- 不提供原厂未覆盖信道的虚构值。不导入厂商额外提功率/PSD 修正命令；采用原始值作为上限，因此不是对原厂射频行为的完整复刻，6 GHz 等场景可能更保守。

驱动参考：YYH `https://github.com/YYH2913/openwrt`，提交 `9e44788d769164dc9f691670add71dc466d99a4c` 的 0006/0007，适配当前 mt76 `0936617dc529ff9da0385221d3fa6de732231177`。另修复新增 MT7996 提前返回分支遗漏 `of_node_put` 的引用泄漏，已通过提取真实函数的回归测试复现并验证。保留当前 ADC、NPU、PCIe 等修改。新增表只负责板级限功率，**不能恢复每台机器丢失的 EEPROM 校准，也不能据此声称已解决双向吞吐或 Wi-Fi 消失**。

## 重现与验证

运行 `python3 scripts/xr1710g-power-tables/extract.py /path/to/mt_wifi.ko /tmp/xr-power`（需要 pyelftools），比较输出 DTSI 与仓库版本。输出含原始 BIN、符号文件偏移、SHA256、117 条解码记录。
构建前验证表项完整性和驱动路径计算；构建后从两种 ITB 内嵌 DTB 再逐项校验，防止只改源码未入镜像。

实机验证需刷入候选后执行：确认版本；三频段启动无 MCU TXPOWER 错误；记录各频段 `iw phy ... info`/`iw ... station dump`、hwmon 和 dmesg；相同位置、信道、带宽与对端，分别测单向/反向/双向 iperf3，并采集断连及 PCIe 错误。2.4 GHz 使用默认 TCP 窗口/P4/双向至少 180 秒，与 B22 161.13/3.97 Mbps 对比；需控制信道差异。未实测前仅称候选。

回退代码可应用交付目录的 B23→B22 反向补丁；回退固件使用已留存的 B22 原分区 ITB。不写 factory、DSD、EEPROM 或 bootloader。
