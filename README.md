<img src="https://avatars.githubusercontent.com/u/53193414?s=200&v=4" alt="logo" width="200" height="200" align="right">

# ImmortalWrt for Gemtek XR1710G

[![Build Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/build-firmware.yml?branch=master&label=Build)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/build-firmware.yml)
[![Sync Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-XR1710G/sync-upstream.yml?branch=master&label=Sync)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-XR1710G/actions/workflows/sync-upstream.yml)
[![Upstream](https://img.shields.io/badge/upstream-immortalwrt%409507037475-blue)](https://github.com/immortalwrt/immortalwrt)
[![Synced](https://img.shields.io/badge/synced-2026--08--07%20merged-brightgreen)](#)
[![Kernel](https://img.shields.io/badge/kernel-6.18.41-red)](https://www.kernel.org/)
[![SoC](https://img.shields.io/badge/SoC-Airoha%20AN7581GT-orange)]()
[![License](https://img.shields.io/badge/license-GPL--2.0-green)](https://spdx.org/licenses/GPL-2.0-only.html)

基于 [ImmortalWrt](https://github.com/immortalwrt/immortalwrt) 为 Gemtek XR1710G（Brightspeed XR1710G）路由器定制的固件。

默认管理地址：http://192.168.50.1 或 http://immortalwrt.lan，用户名：**root**，密码：*无*。

首次启动的无线网络为 `ImmortalWrt-2G`、`ImmortalWrt-5G` 和 `ImmortalWrt-6G`，统一初始密码为 `12345678`。2.4GHz 使用 WPA2，5GHz 使用 WPA2/WPA3 混合模式，6GHz 使用 WPA3；首次登录后请及时修改管理密码和无线密码。

## 设备规格

| 项目 | 参数 |
|------|------|
| **SoC** | Airoha AN7581GT (1.3GHz 4核CPU + 8核NPU) |
| **内存** | 2GB |
| **闪存** | 512MB |
| **网口** | 2×10G RTL8261BE + 2×1G AN7581 |
| **PWM风扇** | 新唐 NCT7802 |
| **电源规格** | 12V 5A |

### 无线局域网 (MT7996AV BE19000)

| 频段 | 芯片 | 规格 | 最高速率 |
|------|------|------|----------|
| WLAN1 | MT7976GN | 2.4GHz 4×4 (Tx/Rx) 4096 QAM 40 MHz | 1376 Mbps |
| WLAN2 | MT7977BN | 5GHz 4×4 (Tx/Rx) 4096 QAM 160 MHz | 5.76 Gbps |
| WLAN3 | MT7977AN | 6GHz 4×5 (Tx/Rx) 4096 QAM 320 MHz (backhaul) | 10 Gbps |


## 固件特性

### 核心定制

- 独立 XR1710G 设备树 [an7581-xr1710g-ubi.dts](target/linux/airoha/dts/an7581-xr1710g-ubi.dts)（基于公共 `an7581.dtsi` 与 `an7581-npu-mt7996.dtsi` 扩展，含 PCIe 3.0 x2 模式配置）。
- 关键内核与网络补丁（完整列表见 [target/linux/airoha/patches-6.18/](target/linux/airoha/patches-6.18/) 和 [target/linux/generic/pending-6.18/](target/linux/generic/pending-6.18/)）：
  - `303-01/02`：MediaTek PHY 寄存器与校准支持。
  - `675-02~05`：nft_flow_offload 桥接、WDMA 与 VLAN-aware bridge/PVID 映射。
  - `910-02`、`912`、`913`：USB/PCIe 时钟、PCIe 3.0 x2 链路与复位修复。
  - `910-04`、`921`：NPU MBQ 超时与 NPU 固件加载修复。
  - `915-01`、`916-02`、`9990`、`9993`、`9999-11`：PPE/flowtable 硬件卸载、WLAN 流绑定、VLAN ingress 与 XFRM 流支持。
  - `920-*`、`920-cpufreq`、`990-01`：Airoha 网络、MTU、CPU 频率与桥接 FDB 漫游修复。
- 无线栈补丁：
  - [mt76 patches](package/kernel/mt76/patches/) 中的 `001`（mt7996 PS sync TLV/MLO 稳定性）与 `9993`（operating-mode rate control）。
  - [mac80211 patch](package/kernel/mac80211/patches/subsys/411-mac80211-export-link-sta-capability-limits.patch) 与 [hostapd patches](package/network/services/hostapd/patches/)（6GHz、EHT、radio mask 及多 VAP 稳定性）。
- 启动与设备定制：`03_wifi_defaults`（SSID、加密方式、US 区域码）、`03_wireless`（射频参数）、`18-xr1710g-firewall-defaults`（默认软件/硬件 flow offload）、`99-ppe-reload`（无线接口创建后重载防火墙）、`packet-steering.sh`（Wi-Fi worker/CPU 亲和性）、风扇服务、升级平台脚本，以及独立 [luci-app-airoha-recovery](package/luci-app-airoha-recovery/) U-Boot HTTP Recovery 页面。

### 网络与无线默认行为

- 默认 LAN 地址为 `192.168.50.1`；IPv6 使用 SLAAC/EUI-64，关闭 DHCPv6/NDP 与 RA DNS/附加标志，减少国内网络环境下的兼容性问题。
- 默认开启 firewall4 软件 flow offload 与硬件 flow offload；VLAN-aware bridge、PPPoE 和 AP 模式的 NPU/PPE 加速可在 NPU 页面按需启用，并由 FlowSense 展示运行状态。
- 三个无线射频默认启用：2.4GHz 为 HE20/自动信道/28dBm，5GHz 为 EHT160/信道 36/30dBm，6GHz 为 EHT320/信道 37/30dBm。
- FlowSense 提供 Router/AP 模式、VLAN/PPPoE/AP 加速状态与自定义 Ping 延迟检测；NPU 页面提供 PPE/Frame Engine、CPU 频率与安全超频控制；风扇页面提供实时温度、RPM/PWM 曲线与自定义曲线。

### 预装 LuCI 应用（25 个，含中文界面）

#### 设备专属与仓库内置（来自 [package/](package/)）

| 应用 | 来源 | 功能 |
|------|------|------|
| `luci-app-airoha-npu` | [rchen14b/luci-app-airoha-npu](https://github.com/rchen14b/luci-app-airoha-npu) | SoC/NPU 状态、加速开关与超频控制 |
| `luci-app-airoha-fancontrol` | [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) | 风扇速度/温度控制与曲线 |
| `luci-app-airoha-flowsense` | [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) | PPE 硬件 offload、VLAN/PPPoE/AP 状态与延迟检测 |
| `luci-app-airoha-recovery` | 本仓库 | 一键重启进入 U-Boot HTTP Recovery（一次性触发） |
| `luci-app-lucky` | [sirpdboy/luci-app-lucky](https://github.com/sirpdboy/luci-app-lucky) | Lucky（DDNS/反代/端口转发） |

#### 网络与远程接入

| 应用 | 功能 |
|------|------|
| `luci-app-zerotier` | ZeroTier 虚拟局域网 |
| `luci-app-ddns-go` | DDNS-Go 动态域名（支持阿里云/Cloudflare/DNSPod） |
| `luci-app-ddns` | 传统 DDNS 脚本 |
| `luci-app-upnp` | UPnP 自动端口转发 |
| `luci-app-firewall` | 防火墙（firewall4/nftables） |
| `luci-app-arpbind` | IP/MAC 绑定 |
| `luci-app-mlo` | MLO（Wi-Fi 7 多链路操作） |
| `luci-app-msd_lite` | MSD Lite 组播播放 |

#### 系统与自动化

| 应用 | 功能 |
|------|------|
| `luci-app-package-manager` | APK 包管理器 |
| `luci-app-ttyd` | Web 终端 |
| `luci-app-autoreboot` | 定时重启 |
| `luci-app-timewol` | 定时网络唤醒 |
| `luci-app-wifischedule` | Wi-Fi 定时开关 |
| `luci-app-watchcat` | 网络看门狗 |
| `luci-app-wol` | 网络唤醒 |
| `luci-app-vlmcsd` | KMS 激活服务 |
| `luci-app-rtp2httpd` | RTP 转 HTTP |
| `luci-app-udpxy` | UDP 组播代理 |
| `luci-app-wechatpush` | 微信推送通知 |
| `luci-app-wifihistory` | WiFi 历史记录 |

> 为控制固件体积，当前不预装 `luci-app-openclash`、`luci-app-passwall`、`luci-app-adguardhome` 和 `luci-app-smartdns`；SmartDNS 核心及独立 UI 仍保留。

### 主要系统包

**网络核心**
- `dnsmasq-full`（完整版 DNS/DHCP）
- `firewall4` + `nftables-json`（nftables 防火墙）
- `wpad-mbedtls`（WPA2/WPA3、EHT/MLO 支持）
- `odhcp6c` / `odhcpd-ipv6only`（IPv6）
- `ppp` / `ppp-mod-pppoe`（PPPoE）
- `smartdns` + `smartdns-ui`（DNS 加速/分流）
- `wireguard-tools` + `luci-proto-wireguard` + `rpcd-mod-wireguard`（WireGuard）

**内核模块（kmod）**
- `kmod-mt7996-firmware` / `kmod-mt7996e`（MT7996 Wi-Fi 7 驱动）
- `airoha-en7581-mt7996-npu-firmware`（Airoha NPU 固件）
- `kmod-crypto-hw-eip93`（硬件加密加速）
- `kmod-nft-offload`（硬件流量卸载）
- `kmod-br-netfilter` / `kmod-tcp-bbr`（桥接 Netfilter / BBR 拥塞控制）
- `kmod-wireguard`（WireGuard 内核支持）
- `kmod-hwmon-nct7802`（NCT7802 温度传感器）
- `kmod-i2c-an7581` / `kmod-leds-gpio` / `kmod-gpio-button-hotplug`
- `kmod-phy-realtek` / `kmod-mt76-connac` / `kmod-mt76-core`
- `rtl826x-firmware`（RTL8261BE PHY 固件）

**系统工具**
- `bash` / `coreutils` / `curl` / `ip-full`
- `ethtool-full` / `pciutils` / `uboot-envtools`
- `luci-theme-argon` + `luci-theme-bootstrap`
- `default-settings-chn`（中文默认设置）

**代理与网络核心**
- `xray-core` / `simple-obfs-client`
- `chinadns-ng` / `geoview` / `dns2socks` / `microsocks` / `ipt2socks`

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

### 升级注意事项

> [!WARNING]
> LuCI 中的“保留配置”不会保留额外安装的软件包。升级前请备份配置并记录已安装的软件包；升级后需要
> 重新安装 OpenClash、PassWall、AdGuard Home 等非预装组件。请使用与新固件匹配的软件包，不要恢复
> 旧固件的 `kmod-*` 内核模块。

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
