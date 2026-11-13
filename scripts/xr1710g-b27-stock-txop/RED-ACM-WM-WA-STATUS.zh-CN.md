# RED/ACM 及 WM/WA 核实结果

## 已完成的 RED/ACM 逆向

重建代码为 retail-red-acm-model.py，不依赖厂商源码，不向设备发送任何命令。retail-red-acm-machine-code-tests.py 使用 Unicorn 2.1.4/pyelftools 0.33 模拟原厂量产 ARM64 机器码：red_setting_init .text+0x339b04、red_init .text+0x339b40、嵌套 ACM 发送函数 .text+0x339690。按 ELF 重定位加载数据；内存分配、日志、报文提交等主机服务由替身处理。实际 MCU、NPU 和 WM/WA 均未执行。

8 组验证覆盖普通容量、8192 软件 token、0/65535/16385 等源计数及发送失败。原始机器码生成的每份644字节报文与独立模型逐字节相同，初始化调用次序也一致。这里验证的是主机 ABI，不能据此确认当前固件内部实现。

布局：前12字节为 WA 参数头0x40/0/0，其后632字节为 ACM：op=2，version=0，length=632；TCP offset200，priority offset255；4路token、4路阈值；4×8 full/drop表；4×5 AC尾丢弃表。原厂初始化只填3个物理频段的4个AC（900/1500/1900/1900），第5队列与第4表行保持0。STA配置数量、34个bitmap字和256个STA控制字节初始化为0。源计数0或>16384归16384，最后一路可用软件token单独覆盖，阈值不随软件值覆盖。

默认 full 表15/30/45/60/75/95/100/107；drop表从已校验量产 ELF .rodata+0x28528 直接读取。代码拒绝处理不同哈希的模块，避免把其他版本偏移误当本版本。

原厂顺序：WM VOW tag0x18值2 → WA参数0x0e值1 → WA参数0x40+ACM_TOKEN_CONFIG → PBC NORMAL。20000/15000/20000µs 是主机侧 red_setting_init 的默认字段；不能因此臆造初始化会额外发送 WA target-delay 命令。

模拟发现原厂在底层 chip_cmd_tx 返回错误时仍继续走 PBC。移植应修正错误传播，不能复制这种成功假象。

## 目前还没有完成或启用的部分

当前 mt76 驱动仍保持 RED 关闭；本轮没有把离线模型冒充可用驱动补丁。

当前总token=16384，NPU预留8192；WED/NPU对token范围的分配方式不同。原厂mt7990.ko .text+0x0 的取数回调逐路复制同一common token容量（模块SHA256 f3ba471504068432b2242d800df990c2f719244945a91a4a2b8a76242237475a），但这不能证明当前新版WA的4路源编号与这些资源池完全对应。尚缺当前WA协议/资源编号的权威实现或受控硬件验证。因此未写入猜测配额，也未默认打开。

量产 RED TX report handler 的存在不等于已注册事件：此前唯一重定位引用位于 .eh_frame，尚未证明运行时分发。不能盲目新增错误event路由。

## WM/WA 的实际限制

量产WM为20240306143154（SHA256 1cb73cea57bebda2a2a8425028cb019f5026cc841ee6046925ead5035215d7ee），WA为20240207161506（b9fac549f36368c175a31e7e5638de2ceac33f93f79667ccef966d2299633629）。当前构建WM为20260721003035，WA为20260721002917；具体哈希及region见 evidence/WM-WA-binary-comparison.json。

已解析原厂WM的9个region与WA的3个region，feature均含ENCRYPT位。当前没有这些区域的明文、解密材料或内部算法源码，因此没有依据重写并证明内部调度与原厂一致。主机 ABI 一致、主机模拟通过和更换旧bin，均不能替代该证明。文件中额外未解释字节未被称为签名。

能够继续做的是主机协议兼容和硬件黑盒对照；要完成“全部WM/WA内部算法移植”，还需要可验证的明文/源码及其构建或签装条件。该要求目前确实未完成。

## 参考

用户提供的量产5.1.1.12 mt_wifi.ko，SHA256 04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0。

公开SDK交叉核对：[benboguan/mt799x 固定提交](https://github.com/benboguan/mt799x/tree/0e5bc821b821a30645404cb5584ad6cef6887474/mt_wifi) 的 feature/red/red_ctrl.c、include/feature/red/red.h、include/hw_ctrl/cmm_fw_uni_cmd.h、wlan_hwifi/chips/mt7990/mt7990.c。只据接口与观察结果独立重建，未整份搬运厂商文件。

复现模拟：在安装 unicorn==2.1.4 和 pyelftools==0.33 的Python环境执行 retail-red-acm-machine-code-tests.py --module <量产mt_wifi.ko> --output <结果目录>。无需连接路由器。源码仓库不包含原厂模块本体。
