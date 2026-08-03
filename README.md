<img src="https://avatars.githubusercontent.com/u/53193414?s=200&v=4" alt="logo" width="200" height="200" align="right">

# ImmortalWrt for Gemtek XR1710G

[![Build Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/build-firmware.yml?branch=master&label=Build)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/build-firmware.yml)
[![Sync Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/sync-upstream.yml?branch=master&label=Sync)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/sync-upstream.yml)
[![Upstream](https://img.shields.io/badge/upstream-immortalwrt%40e5ca16047f-blue)](https://github.com/immortalwrt/immortalwrt)
[![Synced](https://img.shields.io/badge/synced-2026--08--03%20merged-brightgreen)](#)
[![Kernel](https://img.shields.io/badge/kernel-6.18.41-red)](https://www.kernel.org/)
[![SoC](https://img.shields.io/badge/SoC-Airoha%20AN7581GT-orange)]()
[![License](https://img.shields.io/badge/license-GPL--2.0-green)](https://spdx.org/licenses/GPL-2.0-only.html)

基于 [ImmortalWrt](https://github.com/immortalwrt/immortalwrt) 为 Gemtek XR1710G（Brightspeed XR1710G）路由器定制的固件。

默认登录地址：http://192.168.1.1 或 http://immortalwrt.lan，用户名：**root**，密码：*无*。

## 设备规格

| 项目 | 参数 |
|------|------|
| **SoC** | Airoha AN7581GT (1.3GHz 4核CPU + 8核NPU) |
| **内存** | 2GB |
| **闪存** | 512MB |
| **网口** | 2×10G RTL8261BE + 2×1G AN7581 |
| **PWM风扇** | 新通 NCT7802 |
| **电源规格** | 12V 5A |

### 无线局域网 (MT7996AV BE19000)

| 频段 | 芯片 | 规格 | 最高速率 |
|------|------|------|----------|
| WLAN1 | MT7976GN | 2.4GHz 4×4 (Tx/Rx) 4096 QAM 40 MHz | 1376 Mbps |
| WLAN2 | MT7977BN | 5GHz 4×4 (Tx/Rx) 4096 QAM 160 MHz | 5.76 Gbps |
| WLAN3 | MT7977AN | 6GHz 4×5 (Tx/Rx) 4096 QAM 320 MHz (backhaul) | 10 Gbps |


## 固件特性

### 核心定制

- 独立设备树 [an7581-xr1710g-ubi.dts](target/linux/airoha/dts/an7581-xr1710g-ubi.dts)（不依赖公共 dtsi，含 PCIe 3.0 x2 模式配置）
- 11 个定制内核补丁（[target/linux/airoha/patches-6.18/](target/linux/airoha/patches-6.18/)）：
  - `303-01/02`: MediaTek PHY 校准修复
  - `675-01~04`: nft_flow_offload 桥接/VLAN/WDMA 支持（适配内核 6.18.41）
  - `910-02`: USB/PCIe 时钟修复
  - `910-04`: NPU MBQ 超时修复（100s→1000s）
  - `912`: PCIe 3.0 x2 链路支持（EN7581 Gen3 速度协商）
  - `990-01`: 桥接 FDB 漫游失效修复
- mt76 驱动补丁（[package/kernel/mt76/patches/](package/kernel/mt76/patches/)）：
  - `001`: mt7996 PS sync TLV 修复（backport 上游 `06b69763f2`，修复 5GHz+6GHz MLO AP 硬锁 RX NAPI 路径问题）
- base-files 定制：[01_leds](target/linux/airoha/an7581/base-files/etc/board.d/01_leds)、[02_network](target/linux/airoha/an7581/base-files/etc/board.d/02_network)、[03_wireless](target/linux/airoha/an7581/base-files/etc/uci-defaults/03_wireless)（SSID 分频段命名 + 30dBm 发射功率）、[airoha_fan](target/linux/airoha/an7581/base-files/etc/init.d/airoha_fan)、[99-ppe-reload](target/linux/airoha/an7581/base-files/etc/hotplug.d/net/99-ppe-reload)（无线接口创建时自动重载防火墙触发 PPE 绑定）、[platform.sh](target/linux/airoha/an7581/base-files/lib/upgrade/platform.sh)

### 预装 LuCI 应用（26 个，全部含中文翻译）

#### 设备专属（来自仓库 [package/](package/)）

| 应用 | 来源 | 功能 |
|------|------|------|
| `luci-app-airoha-npu` | [rchen14b/luci-app-airoha-npu](https://github.com/rchen14b/luci-app-airoha-npu) | SoC 状态监控 + 超频 |
| `luci-app-airoha-fancontrol` | [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) | 风扇速度/温度控制 |
| `luci-app-airoha-flowsense` | [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) | PPE 硬件 offload 监控 + 延迟检测（支持自定义 Ping 目标） |
| `luci-app-lucky` | [sirpdboy/luci-app-lucky](https://github.com/sirpdboy/luci-app-lucky) | Lucky（DDNS/反代/端口转发） |

#### 网络代理

| 应用 | 核心依赖 | 功能 |
|------|---------|------|
| `luci-app-openclash` | mihomo | Clash 图形化客户端 |
| `luci-app-passwall` | sing-box / xray-core / shadowsocks-rust / haproxy | 多协议代理客户端（含 Xray/SingBox/SS-Rust/Haproxy/Simple-Obfs/V2ray-Plugin） |
| `luci-app-zerotier` | zerotier | ZeroTier 虚拟局域网 |

#### DNS 相关

| 应用 | 核心依赖 | 功能 |
|------|---------|------|
| `luci-app-adguardhome` | adguardhome | AdGuard Home 广告过滤 |
| `luci-app-smartdns` | smartdns, smartdns-ui | SmartDNS DNS 加速/分流 |
| `luci-app-ddns-go` | ddns-go | DDNS-Go 动态域名（支持阿里云/Cloudflare/DNSPod） |
| `luci-app-ddns` | ddns-scripts | 传统 DDNS 脚本 |

#### 网络工具

| 应用 | 功能 |
|------|------|
| `luci-app-upnp` | UPnP 自动端口转发 |
| `luci-app-firewall` | 防火墙（firewall4/nftables） |
| `luci-app-arpbind` | IP/MAC 绑定 |
| `luci-app-mlo` | MLO（Wi-Fi 7 多链路操作） |
| `luci-app-package-manager` | APK 包管理器 |
| `luci-app-ttyd` | Web 终端 |
| `luci-app-msd_lite` | MSD Lite |

#### 系统工具

| 应用 | 功能 |
|------|------|
| `luci-app-autoreboot` | 定时重启 |
| `luci-app-watchcat` | 网络看门狗 |
| `luci-app-wol` | 网络唤醒 |
| `luci-app-vlmcsd` | KMS 激活服务 |
| `luci-app-rtp2httpd` | RTP 转 HTTP |
| `luci-app-udpxy` | UDP 组播代理 |
| `luci-app-wechatpush` | 微信推送通知 |
| `luci-app-wifihistory` | WiFi 历史记录 |

### 主要系统包

**网络核心**
- `dnsmasq-full`（完整版 DNS/DHCP）
- `firewall4` + `nftables`（nftables 防火墙）
- `wpad-mbedtls`（完整版，支持 802.11v/k/11ax）
- `odhcp6c` / `odhcpd-ipv6only`（IPv6）
- `ppp` / `ppp-mod-pppoe`（PPPoE）

**内核模块（kmod）**
- `kmod-mt7996-firmware` / `kmod-mt7996e`（MT7996 Wi-Fi 7 驱动）
- `kmod-crypto-hw-eip93`（硬件加密加速）
- `kmod-nft-offload`（硬件流量卸载）
- `kmod-br-netfilter` / `kmod-tcp-bbr`（桥接 Netfilter / BBR 拥塞控制）
- `kmod-hwmon-nct7802`（NCT7802 温度传感器）
- `kmod-i2c-an7581` / `kmod-leds-gpio` / `kmod-gpio-button-hotplug`
- `kmod-phy-realtek` / `kmod-mt76-connac` / `kmod-mt76-core`

**系统工具**
- `bash` / `coreutils` / `curl` / `ip-full`
- `htop` / `tcpdump` / `iperf3` / `ethtool-full` / `pciutils`
- `luci-theme-argon` + `luci-theme-bootstrap`
- `default-settings-chn`（中文默认设置）

**代理核心**
- `sing-box` / `xray-core` / `shadowsocks-rust-sslocal` / `shadowsocks-rust-ssserver`
- `haproxy` / `chinadns-ng` / `geoview` / `dns2socks` / `microsocks` / `v2ray-plugin` / `ipt2socks`

## GitHub Actions 工作流

| 工作流 | 触发方式 | 功能 |
|--------|---------|------|
| [build-firmware.yml](.github/workflows/build-firmware.yml) | 手动 (workflow_dispatch) | 构建固件并发布 Release |
| [sync-upstream.yml](.github/workflows/sync-upstream.yml) | 每 3 天定时 + 手动 | 同步 ImmortalWrt 上游 |

**构建配置**：仓库根目录的 [config.seed](config.seed) 是完整配置文件，Action 自动执行 `cp config.seed .config && make defconfig`。

**Release 格式**：
- Tag：`YYYYMMDD-<short-hash>`
- 名称：`YYYYMMDD - XR1710G Build (<short-hash>)`
- 选项：`release` / `prerelease` / `none`

## 下载

- [Releases 页面](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/releases)
- 固件文件：`immortalwrt-airoha-an7581-gemtek_xr1710g-ubi-squashfs-sysupgrade.itb`
- 升级方法：LuCI → 系统 → 备份/升级 → 刷写固件

## 本地构建（可选）

```bash
git clone https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G.git
cd ImmortalWrt-for-Gemtek-XR1710G
./scripts/feeds update -a
./scripts/feeds install -a
cp config.seed .config
make defconfig
make -j$(nproc)
```

构建环境要求：GNU/Linux 系统（Debian 11+ 推荐），AMD64 架构，至少 4GB RAM 和 25GB 可用磁盘空间。详细依赖请参考 [ImmortalWrt 官方文档](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem)。

## 致谢

### 上游固件
- [immortalwrt/immortalwrt](https://github.com/immortalwrt/immortalwrt) - ImmortalWrt 主项目
- [immortalwrt/luci](https://github.com/immortalwrt/luci) - LuCI Web 界面
- [immortalwrt/packages](https://github.com/immortalwrt/packages) - 社区软件包仓库
- [openwrt/routing](https://github.com/openwrt/routing) - OpenWrt 路由相关包
- [openwrt/mt76](https://github.com/openwrt/mt76) - MediaTek WiFi 驱动

### 参考项目
- [YYH2913/openwrt](https://github.com/YYH2913/openwrt) - XR1710G 6.18 内核集成参考（an7581-xr1710g-ubi.dts 基础结构）
- [hurrian/openwrt-w1700k](https://github.com/hurrian/openwrt-w1700k) - XR1710G PCIe 3.0 x2 补丁参考（912 Gen3 速度协商）
- [lvcdy/openwrt_xr1710g](https://github.com/lvcdy/openwrt_xr1710g) - XR1710G 早期移植参考（分区表、PHY 配置）

### LuCI 应用来源
- [rchen14b/luci-app-airoha-npu](https://github.com/rchen14b/luci-app-airoha-npu) - Airoha NPU 状态监控（PR #4 合并中文翻译）
- [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) - Airoha 风扇控制与 FlowSense（commit db3f1c8）
- [sirpdboy/luci-app-lucky](https://github.com/sirpdboy/luci-app-lucky) - Lucky 多功能工具

### 相关工具
- [JetBrains](https://www.jetbrains.com/) - 开发工具支持
- [SourceForge](https://sourceforge.net/) - 镜像托管

## 许可证

[GPL-2.0-only](https://spdx.org/licenses/GPL-2.0-only.html)（继承 ImmortalWrt）

## 赞赏

如果这个固件对你有帮助，可以请作者喝杯咖啡 ☕

<img src="c6ea388c976395326514814f80d512d5.png" alt="微信赞赏码" width="300">
