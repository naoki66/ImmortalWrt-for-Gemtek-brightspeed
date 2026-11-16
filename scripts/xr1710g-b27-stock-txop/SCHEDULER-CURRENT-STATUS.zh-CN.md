> 2026-11-13 离线逆向更新：原厂和当前 WM/WA 已解出可分析 payload；此前“加密导致无法继续”的限制已解除。已还原部分 ACM 配置、阈值换算及 VOW 命令分派，尚非全部算法等价。见 [WM/WA 逆向报告](wm-wa/README.zh-CN.md)。以下保留此前阶段记录。

# B27 调度补全当前状态

本轮确实新增了驱动代码，但用户要求的“全部调度与原厂一致”尚未全部完成。

| 项目 | 当前结果 | 验证边界 |
| --- | --- | --- |
| 配对PER与MCLI | 已有150/151 | 主机测试及模块编译通过，实机未验收 |
| 动态BA写入 | 152，提交6986033 | TID0 WTBL写入、锁、协商/复位/禁用恢复；保守限制初始索引，非逐位等价 |
| VOW默认权重 | 153，提交cecb9b1 | 原厂表与AC默认索引、ATF/WATF分离；数字权重是明确的兼容扩展 |
| WATF四级MAC规则 | 153 | 可选加载时列表，默认关闭；在线增删/自定义量子/接口关闭清列表未实现 |
| RED/ACM | 主机报文逆向及原厂ARM模拟完成 | 8组644字节逐字节一致；尚未移植为启用的mt76驱动路径 |
| WM/WA内部算法 | 未完成 | 原厂算法区域加密，缺明文与算法源码，不能证明等价 |

152和153实际驱动编译通过，checkpatch strict均零问题，补丁fuzz=0正反应用及逐字节恢复通过。实际生成mt7996e.ko SHA256为86c8776d0bda207f4c3c0a0826b3eb509b5102305392ce3b32baeed1471275e7。模块存在新增BA/VOW函数及WATF参数。测试不能替代固件执行和路由器压测，本轮未刷机。

详细实现、参考出处、差异和回退：

- [动态BA](DYNAMIC-BA-COMPLETION.zh-CN.md)
- [VOW](VOW-COMPLETION.zh-CN.md)
- [RED/ACM及WM/WA](RED-ACM-WM-WA-STATUS.zh-CN.md)

五组驱动实际函数测试分别为completion-event-tests.py、completion-collect-tests.py、completion-state-tests.py、completion-ba-tests.py和completion-vow-tests.py；使用ASAN/UBSAN。RED报文模型和原始ARM机器码对照独立提供。原始构建日志保存在F:/openwrt/wifi-fix27-scheduler-completion/152-mt76-build.log与153-mt76-build.log。

回退本轮驱动改动：先git revert cecb9b1，再git revert 6986033，之后重新编译。更早150/151另有依赖和独立提交，不混为本轮回退。离线反向补丁须在对应基线上应用；git diff或文件删除不会卸载已运行的驱动。
