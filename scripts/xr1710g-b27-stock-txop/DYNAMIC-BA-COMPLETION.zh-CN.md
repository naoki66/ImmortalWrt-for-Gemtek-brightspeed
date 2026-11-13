# B27 动态 BA 写入补全（152）

已实现到驱动源码，尚未烧机或完成硬件验收，不能据此宣称 2.4GHz 吞吐问题已解决。

依据：XR1710G 量产 5.1.1.12 的 mt_wifi.ko（SHA256 04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0），dynamic_adjust_ba_winsize 的间接回调 .text+0x1137d0，以及同一模块的 TX_STAT 计数路径。公开 SDK 同名函数走另一条接口，未直接复制该实现。

实现：仅 TID0，PER>35 时索引>7则右移，否则>3减1；PER<15则递增。BA<=64 上限7，其余14。使用配对 TX_STAT attempts/failed，缺失或异常样本不写。WTBL DW7 低4位读改写并读回，保留其他 TID。BA 停止、重新协商、SER epoch、WCID 重建后旧状态作废；关闭 stock_txop_policy 后恢复本轮协商的基线。

明确差异：为避免超过协商 BA 窗口，实际上限还受固件初始索引约束。因此是带边界保护的主机侧重建，并非逐位复制原厂。wtbl_lock 覆盖所有主机侧组选择事务（airtime、RSSI、fixed GI、BA），不能证明排除固件内部异步改写。

验证：实际驱动函数的 ASAN/UBSAN 测试覆盖阈值、上限、其他 TID 保留、停止/重协商/复位、禁用恢复、异常读取和写失败重试；并发模拟 10000 次跨组访问。event/collect/state/BA 四组回归通过。mt76 实际交叉编译通过，checkpatch strict 零问题，150—152 fuzz=0 应用和反向逐字节还原通过。

复测：记录 stock_txop_policy 中 stock_ba_updates/errors/skips，配合各客户端每秒 PER、BA 状态、吞吐及 dmesg，做 2.4/5/6GHz 单向和双向对照。没有有效 PER 或未协商 TID0 时计数不变是预期。关闭策略后验证恢复基线。禁止用低吞吐本身证明本补丁有效。

回退：提交相互依赖，优先 git revert 对应提交并重编译；仅对匹配的 151 源码可直接反向应用 152。不要在路由器上用本文件尝试寄存器写入。
