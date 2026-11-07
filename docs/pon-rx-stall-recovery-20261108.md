# XG-PON RX 停滞恢复修复（2026-11-08）

## 日志与根因

日志 `完整日志.txt` 在 16:53:18 和 17:24:16 附近出现
`int=0x8000 fifo=0x180`，随后 PPP LCP 心跳失联、PPPoE PADO 超时。
用户态 watchdog 检测时 ONU 仍处于 O5；重载 xPON 后 PPPoE 恢复。

驱动 `airoha_xpon_xgpon_rx_stall()` 原本在每次消费
`rx_stall_pending` 时都清空采样状态，并将 `rx_stall_since` 更新为当前时间。
持续的 MBI overrun IRQ 因此不断重启 30 秒计时，导致内核恢复无法到期。
已有 QDMA 描述符补充补丁和 IRQ 屏蔽措施不能消除这个恢复状态机错误。

这次修复让已经 armed 的 watchdog 保留采样基线和截止时间，首次读取到
有效 datapath 统计后开始计时。没有 RX 进展时可触发原有 MAC epoch reset；
真实 RX 进展、离开 O5 和重启次数退避仍按原规则处理。这个路径不依赖
本机 PPPoE，桥接模式也可以使用内核恢复。

这解决了接收停滞后的自动恢复被中断风暴阻止的问题；FIFO 最初为何溢出，
仍需要真机结合 QDMA 队列状态和流量压力继续验证，不能仅凭此日志确认。

## 用户态兜底

`files/usr/sbin/pon-link-watchdog` 优先检查 `pppoe`，并要求协议为 PPPoE。
当前 ONU 上网页面的 `internet-apply` 实际生成为 `network.wan`，因此没有
`pppoe` 拨号接口时，仅允许回退到带 `luci_wanup=1` 标记的 PPPoE `wan`。
这不会把普通以太网 WAN 当作 PON 会话。桥接配置没有本机 PPPoE 会话时，
清除故障计时并跳过用户态检测。

同时补充：

- 用 JSON 字段读取接口 up 状态，兼容紧凑 JSON。
- 在 10 秒采样后再次确认 PPPoE 仍未恢复，且没有切换为桥接。
- 用进程锁避免恢复过程超过 cron 间隔时重叠执行。
- O5 或 service_ready 等待超时后重新 ifup PPPoE，让后续自动重连继续工作。

## 源码与构建接入

驱动源码修复位于相邻的 `openwrt-pon-drivers` 仓库，
`airoha-xpon` 包版本从 r68 升至 r69。
本固件仓库的对应补丁为：

`patches/feeds/pon_drivers/airoha-xpon/100-keep-rx-stall-deadline-during-overrun.patch`

用户态修复位于相邻的 `OpenWrt_ONU_CONFIG` 仓库，daemon 包从 r2
升至 r3，并通过以下补丁接入固件：

`patches/feeds/onu_config/airoha-pon-daemons/100-reconcile-services-after-pon-recovery.patch`

OMCI agent 原本只有在等待 Alloc-ID 时才轮询映射，成功后会阻塞收包。
内核 MAC reset 清空映射且 OLT 没有发来新配置时，保留的 MIB 无法主动回写。
现在每秒核对一次，使用绝对截止时间避免持续请求或重传推迟检查；发现已应用
的映射消失时重新提交并清除旧应答缓存。临时读取失败也会继续核对，控制接口
被移除或替换时退出，由 procd 重新启动。MIB 本身保留，以便桥接和本机拨号
都能重建业务。

EPON OAM 也存在独立的恢复缺口：注销/重新注册后旧 IEEE/CTC 会话、认证及
VLAN 状态可能残留，业务就绪标志发布失败后也可能不再重试。现在无报文时仍
每秒检查 OAM carrier 及其变化计数，短暂掉线也会重置会话；CTC 重新协商时
清除旧认证和 VLAN 状态。业务就绪标志按内核实际值核对，读取或写入失败后
继续重试，控制接口被移除或替换时退出并由 procd 重启。

EPON 驱动的注销流程已经清除 service_ready 并拉低 OAM carrier，注册成功时
重建 LLID 数据通道并恢复 carrier，因此无需把 XG-PON 的 GEM 恢复逻辑套用
到 EPON。此日志来自 XG-PON，OAM 问题来自代码审查，仍需 EPON 真机验收。

现有 `scripts/apply-feed-patches.sh` 会在构建时应用两份补丁；feed 已含相同改动时
通过反向检查跳过。无需修改 feed URL。上游后续改变这些上下文时，仍需
按现有 feed 补丁流程更新或移除此补丁。

## 验证

在 WSL Ubuntu 中运行：

```sh
sh /mnt/d/GitData/ImmortalWrt-for-Pon/scripts/check-pon-link-watchdog.sh
sh /mnt/d/GitData/openwrt-pon-drivers/tests/check-rx-stall.sh
cargo test --locked --manifest-path /mnt/d/GitData/OpenWrt_ONU_CONFIG/airoha-pon-daemons/src/Cargo.toml
```

驱动测试提取生产函数并用主机 C 编译器编译，模拟统计与中断，覆盖持续
溢出、单次溢出、RX 恢复、空闲桥接、统计读取失败、退出 O5、IRQ 恢复和
重启次数退避。修复前代码在持续溢出的恢复断言处失败，修改后全部通过。
用户态测试用 mock 命令验证 PPPoE、桥接、等待窗口、并发和采样期间恢复。
Rust daemon 的 81 项测试通过，新增测试覆盖映射成功后仍定期核对、MAC reset
后无需新 OMCI 请求即可重建映射、正常映射不被重写、临时读取失败后的恢复。
OAM 测试覆盖 carrier 掉线/恢复及快速重注册、重新协商清除认证和 VLAN 状态、
内核清空业务就绪标志后的重新发布，以及发布失败后的重试。
daemon 的主机 release 构建也已通过。

另外使用本机已有的 AArch64 OpenWrt GCC 14.4.0 和 Linux 6.18.55 构建树，
交叉编译当前 optical frontend 与 xPON，完整链接生成 `airoha-xpon.ko`。
仅有原有缺失 MODULE_DESCRIPTION 的 modpost 警告。

这属于编译与状态机验证，尚未刷入硬件。该测试模块对应 6.18.55，不能直接
用于内核版本或 ABI 不匹配的设备；部署时应通过目标固件构建生成匹配包。

真机验收应检查桥接下用户态 watchdog 静默、内核仍能恢复 RX stall；本机
拨号正常时清除 `/tmp/pon-link-watchdog.down`；复现 overrun 后约 30 秒出现
`without downstream progress ... resetting the MAC epoch`，并恢复业务。
`Key_Control error=-110` 和 nlbwmon netlink 缓冲不足属于独立待查项。
