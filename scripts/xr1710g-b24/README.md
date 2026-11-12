# B24：2.4GHz 根因排查与底层候选修复

## 结论

当前尚未证明 2.4GHz 多流双向 TCP 吞吐异常已根治。B24 修正一个可独立复现的 NPU RX 描述符发布顺序缺陷，并补齐只读诊断；必须在实机默认窗口下与 B23 对照。不得把模型通过、编译通过或限窗后的均衡速度当成硬件验收通过。

默认不编入、不启用 xr1710g-tcp-window，未修改全局 TCP 窗口，未限速或改测试流 TOS。保留 B23 SKU/backoff、ADC、PCIe 主 Gen3×2/辅 Gen2×1、NPU 开启及现有加密/代理组件；不写 EEPROM/factory。

## 本轮实机证据：运行的是 B23

- HE20、信道1、电脑 P4 双向默认窗口 120 秒：上传117.924、下载8.369 Mbps。
- 同配置仅增加指向电脑的路由接收窗口65536，120秒：79.561/90.883 Mbps。结束后已删除临时路由。窗口影响的是路由器本机 IPv4 TCP 接收，并非转发 TCP 通用修复。
- 默认/接收 NAPI FIFO1/恢复默认各40秒：147.527/6.925、146.685/12.121、150.389/3.900 Mbps。已恢复所有线程原调度，不合入该上游候选。
- 按测试源端口过滤的打点，匹配样本：数据入口→mac80211出队 P99约0.127ms、最大0.201ms；入口→发送完成通知 P99约45.079ms、最大65.754ms。发送完成通知可能批量处理，不能直接等同空口时延。缓冲覆盖、样本缺失和打点扰动限制了结论。
- 历史手机也能复现，因此不是电脑NFA765独有的已确认故障。当前测试为电脑↔路由器本机，不能替代无线↔有线转发验收。

## 变更与参考

1. `142-mt76-order-npu-rx-buffer-ownership.patch`：NPU RX 新环未填槽先标记主机持有；补充描述符先写地址/元数据，dma_wmb后才清DONE；成功转移页面后清主机旧指针；既有停止/排空后的清理路径重新标记RX槽主机持有。仅适配YYH0221的发布顺序部分，保持当前 ndesc-1 容量、free-index、轮询预算和停止前提，不盲目摘取其整套重置/分片栈。此改动修复的是明确的内存顺序风险，尚无实机证据证明它导致本次吞吐异常。
   参考：[YYH固定提交](https://github.com/YYH2913/openwrt/tree/9e44788d769164dc9f691670add71dc466d99a4c/package/kernel/mt76/patches)，0221，原作者Yanghan Ye。
2. `143-mt7996-read-only-npu-queue-state.patch`：只读 `npu_queue_state`，记录共享token池、两条NPU RX环、各频段BE TX环。读时生成近似快照，无定时任务、无MCU查询。参考同一YYH提交0001，原作者Ryan Chen；适配当前共享PHY和debugfs私有指针。
3. DAWN解析合法bodyless拒绝/不支持/迟到测量报告时先检查rep-mode；不进入hearing map，不再误报缺正文；成功但畸形报告仍警告。实机捕获5GHz终端 `rep-mode=4` 且无正文，与当前hostapd `hostapd_ubus_notify_beacon_report(..., rep=NULL)` 实现一致。保留先前上游字段校验。主仓库持久来源是 patches/feeds/packages/net/dawn/031；030中的包修订统一为3，清洁feed重放及当前feed幂等检查均需通过。
4. procd为Airoha请求20秒看门狗超时，其余平台仍30秒。参考Linux `drivers/watchdog/airoha_wdt.c` 的最大超时公式，150MHz、32位计数器最多28秒；保留5秒喂狗。init/procd/upgraded共用默认宏。未伪造硬件最大值。

上游 [mt76 PR1164](https://github.com/openwrt/mt76/pull/1164) 用于调度对照；本机效果不足，不合入。未把不能适用的上游补丁当作已解决根因。

## 尚未修复及需区分的状态

- WAN6无link-local且DHCPv6重试：IPv4正常，未证实是运营商IPv6CP还是启动关系问题；没有关闭用户IPv6或重拨来消日志。
- factory nvmem-layout device-link告警：EEPROM和接口MAC读取仍正常，依赖关系原因待查；未删factory依赖或更改闪存布局。
- PPE stats -22：当前固件不提供相关统计时现有保护保留，显示unsupported/n/a，不等于NPU关闭，也不能伪造硬件统计。
- ADC Resource busy：已采样到锁竞争、尚未发查询；属于非阻塞读取策略。没有取消互斥、返回假温度或无限等待。
- KASLR缺随机seed、overlayfs能力降级等未假称修复；启动PCI桥总线重新分配本身不是PCIe掉线证据。

## 验证方法与成功条件

准备当前mt76后运行：

```sh
python3 scripts/xr1710g-b24/test-npu-publication.py --mt76-dir build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d --output /tmp/b24-publication-tests
```

模型覆盖11966组环长度/起始槽/部分补充失败/循环再填；旧代码负对照应复现发布风险，新代码不触发，ASan/UBSan应通过。它不模拟真实NPU，不证明硬件吞吐改善。

刷入后先确认没有proto242窗口路由和窗口服务，再保持同一信道/频宽/位置，以相同命令默认TOS和默认窗口分别P1、P4双向测120秒，多轮B23→B24→B23；记录上传、下载、每秒波动、重传、boot_id、温度及有无MT7996/PCIe新错误。再用手机、三频段及无线↔有线做回归。

```sh
ip -4 route show proto 242
cat /sys/kernel/debug/ieee80211/phy0/mt76/npu_queue_state
mkdir -p /tmp/b24-test
timeout 180 logread -f -F /tmp/b24-test/logread.txt -S 512 &
iperf3 -s -p 5298 -D --pidfile /tmp/b24-test/iperf.pid
```

客户端：`iperf3 -c 192.168.50.1 -p 5298 -B <无线IPv4> --bidir -P 4 -t 120 -O 2 -J --get-server-output`。日志轮转单文件512KiB，结束只停止测试PID并立即取回日志。需证明默认窗口下下行不再持续个位数，且没有把异常转移到上传、另一频段或NPU转发，才可称吞吐修复。

保留B23代码和镜像。补丁以固定B23提交48a7d50f为基线，附反向补丁；不是相对浮动GitHub最新。当前候选不自动刷机。
