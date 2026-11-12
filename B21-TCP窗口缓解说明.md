# B21 2.4GHz 双向下行受压：TCP窗口缓解

## 证据及边界

B21 HE20正式两分钟166.66/5.58Mbps（客户端上传/下载）。本轮默认参数反复约165~170/3~9Mbps。仅路由器接收缓冲上限改为256KiB后105.30/82.78Mbps；修改发送缓冲或ACK defer未改善。全局参数已恢复，不能为了修复LAN测试而压低外网高RTT代理连接的缓冲。

同一客户端IPv4主机路由的window metric设为128KiB，118.47/66.68及122.91/62.29Mbps；设为64KiB，93.10/97.64Mbps；撤销后166.24/4.99Mbps。iperf命令仍默认TOS、P4双向、不设置-b或-w；TCP接收窗口确实受到策略约束，不把它表述成传输层完全无约束。

结果支持大接收窗口放大饱和上传时的排队与反向ACK竞争。没有直接读取客户端固件队列，不能把它认定为某个MT7996/Qualcomm驱动缺陷的最终根因。该方案是流控缓解，不是已证实的无线驱动根因修复，也不是Wi-Fi消失故障的解决证明。

## 实现

新增独立可选软件包，不修改mt76、NPU、PCIe、hostapd或全局TCP缓冲。软件包默认关闭，station_mac默认空，必须明确填写待处理客户端。当前路由器热修仅启用了电脑MAC对应的策略。

轮询iw关联及IPv4邻居信息，只有所选MAC在2.4GHz AP关联、并且未同时出现在5/6GHz AP时，才给其LAN IPv4主机路由添加window65536。使用proto242、metric42721标记自有路由，保留已有管理员主机路由；断开/漫游到更高频段、邻居地址变化或服务停止时清理自有条目。不改写转发TCP报文的窗口字段；路由表变化对硬件转发的回归仍需网线恢复后另测。

限制：仅该显式指定客户端、IPv4、路由器本机终止的TCP；不等同于互联网转发/IPv6/手机已修复。64KiB窗口可能限制高RTT的本地TCP连接吞吐。实际5/6GHz漫游尚未执行，控制路径由模拟测试覆盖。不会自动重载或切换无线。

## 参考

Linux6.18.60源码net/ipv4/tcp_output.c、tcp_input.c：TCP初始化使用RTAX_WINDOW及接收缓冲选择window_clamp。iproute2-7.3.0的ip route window参数使用该内核路由度量。

https://man7.org/linux/man-pages/man8/ip-route.8.html

这不是摘录其他路由器的射频校准，也不继承原厂工程备份设置。B21的YYH A-MSDU补丁未在本轮证明能解决吞吐，不能引用它作为此窗口策略的有效性证据。

## 验证及回退

控制路径模拟验证：指定2.4GHz关联、快速频段漫游、邻居IP变化、断开、管理员路由保留、同协议不同metric路由保留、停用、非法MAC，均通过。实际3分钟验证报告在独立交付包，不能用模拟验证替代无线实机验收。

热修停用：/etc/init.d/xr1710g-tcp-window stop；/etc/init.d/xr1710g-tcp-window disable；uci set xr1710g_tcp_window.main.enabled=0；uci commit xr1710g_tcp_window。

父提交111f7a898c8fc624c235218a041f8db5f109f5f1，B21固件未重新刷写。新增包未加入当前.config，因此没有虚构已编译B22固件。
