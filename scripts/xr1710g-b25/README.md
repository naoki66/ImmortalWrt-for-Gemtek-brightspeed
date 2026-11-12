# B25：2.4GHz 上行 OFDMA 候选

本版针对 2.4GHz 多流双向 TCP 下载极低的一个具体配置差异。尚未实机验收，不能宣称吞吐问题已根治。

## 修改

在 mt7996_mcu_sta_muru_tlv 中补充 cfg.ofdma_ul_en。仅 MT7996、AP 模式、2.4GHz、HE 终端生效，且当前链路必须存在有效频道。保持上行 MU-MIMO 原状，不强制固定速率、RU 用户数、BSRP 间隔或认证模式。5/6GHz 不受本次候选改动影响。

新增 mt7996e 模块参数 ul_ofdma_2g，默认 Y；参数使用 READ_ONCE 在站点配置时读取。改为 N 后，需要让目标终端重新关联才会重建 STA_REC_MURU。参数值仅表示候选策略，不能证明已产生空口 OFDMA trigger。

参考：MediaTek 官方 feed 固定提交 e9aa8e9ff36255fc16de98981e3e541d23a39d1f 下 0042-mtk-mt76-mt7996-add-vendor-commands-support.patch。其开启所有 MU/RU；本版仅提取上行 OFDMA 位，约束到本次异常频段与 AP/HE 场景，使用当前树已有 STA_REC_MURU 格式，不整包合并旧 SDK。

https://github.com/mediatek/mtk-openwrt-feeds/blob/e9aa8e9ff36255fc16de98981e3e541d23a39d1f/autobuild/autobuild_5.4_mac80211_release/mt7988_wifi7_mac80211_mlo/package/kernel/mt76/patches/0042-mtk-mt76-mt7996-add-vendor-commands-support.patch

XR1710G 量产 5.1.1.12、ASUS BT8 58601、GL.iNet BE14000 4.9.2 的配置模板具有上行 OFDMA 开关；模板并不等于实机运行状态。完整来源与反证在本地 wifi-fix25/official-firmware/同芯片正式固件对比.md。

上游 issue 870 说明单个开关不保证触发调度，因此本版是需要验证的候选。没有假设官方代码缺两个位就一定是根因，也没有开启曾存在延迟/挂死历史的上行 MU-MIMO。

## 保留

B24 的已有补丁、SKU/backoff、ADC 温度处理、PCIe 主 Gen3×2/辅 Gen2×1、NPU、代理与加密组件。无线 WM/WA/DSP/ROM patch 不更换。不加入 TCP 64KiB 限窗服务，不改全局窗口，不改测试 TOS/优先级。不改 EEPROM、factory 或分区。保留现有网络配置的 sysupgrade 不会强制改动 LAN 地址。

## 构建与回退

以 B24 提交 9f30e48f9351f256bc40e41ed61ee6ae2308188a 为固定基线，单独 B25 分支，保留 B24 镜像。补丁包同时提供 B24→B25 和 B25→B24 源码补丁。应用/回退前先 git apply --check，修改源码后必须重新编译 mt76 并生成镜像；源码回退不等于路由器已回退。

## 烧录后验证

1. 核对固件版本和 /sys/module/mt7996e/parameters/ul_ofdma_2g，应为 Y。
2. 保持相同位置、信道、HE20，默认 TCP 窗口、默认 TOS，2.4GHz 分别测试单向与 P1/P4 双向 120 秒。记录每方向 Mbps、重传、每秒波动、boot_id 与日志。
3. 使用有线管理时，将参数临时改为 N，让无线终端手动重新连接，再测相同命令；恢复 Y、重新关联，再复测。不要仅比较不同时间一次随机结果。无线是唯一管理链路时，不在无恢复安排下自动断开终端。
4. 临时参数回退命令：echo N > /sys/module/mt7996e/parameters/ul_ofdma_2g；仅影响后续站点配置，不是立即更新所有已关联站点。恢复用 echo Y。参数路径缺失或写失败应停止并查明，不能把命令提交当作生效。
5. 日志写 /tmp，使用 logread -f -F /tmp/b25-test/logread.txt -S 512，限制文件大小；结束按 PID 停止，及时取回。不要无限写入 overlay。
6. 回归 5/6GHz、温度、PCIe/NPU、WAN。若新增 MCU 超时、SER 或无线消失，先关闭候选并重新关联；必要时回退保留的 B24 原分区镜像。

此次交付仅生成固件，不自动刷机，不把离线构建通过等同实机稳定性通过。