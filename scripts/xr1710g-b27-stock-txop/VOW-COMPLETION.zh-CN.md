# B27 VOW 权重映射补全（153）

已合入实际 mt7996 驱动并通过交叉编译；未烧机，未宣称已解决 2.4GHz 双向吞吐或 Wi-Fi 消失。

## 依据

- XR1710G 量产 5.1.1.12 mt_wifi.ko：vow_variable_reset .text+0x301238 的普通量子表，及 .text+0x3011f4 的默认 AC 索引；vow_watf_is_enabled .text+0x2ffd24 独立读取 WATF 字段。
- [公开 SDK 固定版本](https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi)：feature/vow/ap_vow.c 的 vow_init_misc、set_vow_watf_sta_dwrr，profiles/ap_profile.c 的四级缺省值，include/hw_ctrl/cmm_fw_uni_cmd.h 的 DRR/feature 命令布局。没有整份复制厂商代码。
- 原厂镜像来源为用户提供的量产烧录器固件；模块 SHA256 为 04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0。

## 实现

仅 XR1710G 的 MT7996 路径：普通量子表改为 6/12/16/20/24/28/32/36（单位256µs），BK/BE/VI/VO 默认索引2/2/1/0；有效量子4096/4096/3072/1536µs。ATF 与 WATF 分开控制，WATF 默认关闭。其他机型保留已有映射。

可选 WATF 使用加载时参数 stock_watf=1，stock_watf_lv0 到 stock_watf_lv3 为逗号分隔的单播 MAC。四级量子4/8/12/16，命中 MAC 的全部 AC 使用同一级别；跨级重复时按原厂循环次序取最高匹配级。未匹配且使用默认 mac80211 权重时仍为2/2/1/0。参数校验完整后一次提交，非法 MAC、过长列表或内存分配失败不产生部分修改。

## 明确差异

mac80211 的数字权重不等于原厂 MAC 列表级别。显式非默认数字权重按“默认 AC 量子 × weight/256”选择最近硬件级别，这是兼容扩展，不能称原厂算法。MAC 列表匹配优先于数字权重。

当前每级最多16个 MAC，只支持加载时设置；避免在线切换全局量子表和多个 WCID 时发生部分更新。不支持原厂在线增删列表和自定义四级量子。列表跨无线重启保留，而原厂 vow_reset_watf 会在接口关闭时清空。未把这些接口差异标成逐项等价。禁用 stock_txop_policy 只回退动态 TXOP/BA，不改变此全局 VOW 模式；VOW 整体回退需撤销153并重编译。

## 验证与回退

completion-vow-tests.py 提取实际驱动函数，ASAN/UBSAN 检查普通/WATF量子表、AC默认值、每AC全部65535个数字权重、MAC匹配及优先级、非法配置保持旧值、WM报文长度/偏移、ATF/WATF独立位、其他机型兼容和MCU错误返回。命令模拟验证不能替代固件执行确认。实际 mt76 编译通过，strict checkpatch 零问题；fuzz=0正向应用和反向逐字节还原通过。

代码提交可单独 git revert 后重编译。未修改或替换 WM/WA 二进制，不能据此宣称固件内部调度已与原厂一致。
