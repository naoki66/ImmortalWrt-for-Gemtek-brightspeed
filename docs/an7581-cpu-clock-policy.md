# AN7581 CPU 时钟策略

AN7581 子目标保留启动固件设置的 CPU 时钟，不由 Linux 改写 CPU PLL
或调用 CPU DVFS 接口。此策略覆盖 XR1710G、XG2010G、Nokia
XG-040G-MD/TF 以及其他共用 `an7581.dtsi` 的机型。

内核关闭 `CPU_FREQ`、`ARM_AIROHA_SOC_CPUFREQ` 和独立的
`AIROHA_CPU_PM_DOMAIN`；设备树不再声明 CPU 调频 provider、OPP、性能域
及依赖调频的 cooling map。保留 PSCI 多核启动、基础外设时钟、温度
监控和 120°C critical 过热关机。取消调频后没有 CPU 降频散热功能。

直接 PLL fallback/强制绕过 ATF 的 0401/0402 补丁已删除，板级强制
PLL 属性、MMIO 映射、1.25–1.4GHz 扩展 OPP、governor 启动参数和
调频 UCI defaults 一并移除。1710、2010、040、040-tf 配置不再选择
cpufreq 包，该包也不允许在 AN7581 子目标选用。

NPU LuCI feed 上游已移除页面调频控件，不再携带依赖旧页面结构的
`110-skip-cpu-controls-without-cpufreq.patch`。旧版 feed 启动脚本可能
仍等待约 15 秒后退出，但没有 policy 时不会应用调频设置，RPC 也会
拒绝调频请求。启动脚本和后端的进一步清理由 feed 源码负责。
跨平台通用包源码以及供其他 Airoha 子目标使用的原生驱动修复保留。
AN7583 的原生调频配置不变。

## 验证依据与边界

2026-11-07 的 XR1710G 四核 A/B/A 对照：两轮启动前禁用 cpufreq 均
通过观察和 CPU1 负载测试；中间恢复直接 PLL 调频后，50.72 秒在
CPU1 复现内核指针 bit63 清零故障。

2026-11-08 完全移除 CPU DVFS 的 KASAN 实验固件已完成正常 sysupgrade
和一次物理断电冷启动。启动无需 `cpufreq.off=1`，四核在线，PLL
保持启动固件的 1200MHz。两次启动均通过 CPU1 的 1000 次 fork/exec
和四核并行各 64MiB×20 轮内存测试。冷启动观察到 576.28 秒时没有
Oops/KASAN，Web、WAN 和三路 Wi-Fi AP 正常。

结果支持移除直接 PLL 调频作为当前规避方案，尚未定位到具体错误
指令，也未完成长期稳定性验证。1200MHz 是该 XR1710G 启动链的实测
初始频率，其他板型继续使用各自启动固件设置，不能一概宣称固定
1200MHz。XG2010G 和 Nokia 040 系列尚未完成此改动后的实机验证。

发布前已编译检查全部 11 个 AN7581 板级 DTS，均保留四个 PSCI CPU，
且不再含 CPU DVFS 节点或引用。四份 seed 均取消选择 cpufreq 包。

保留配置升级时，应移除旧实验留下的 `cpuoffline`/`cpucap` 启动脚本，
避免 CPU1 被另行下线；调频包移除后旧 UCI 值不会恢复内核调频能力。
