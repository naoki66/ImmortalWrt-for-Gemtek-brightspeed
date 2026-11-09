<img src="https://avatars.githubusercontent.com/u/53193414?s=200&v=4" alt="logo" width="200" height="200" align="right">

# ImmortalWrt for Brightspeed / Gemtek: XR1710G & XG2010G

**English** · [简体中文 →](README.md)

[![Build Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-brightspeed/build-firmware.yml?branch=master&label=Build)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed/actions/workflows/build-firmware.yml)
[![Sync Status](https://img.shields.io/github/actions/workflow/status/naoki66/ImmortalWrt-for-Gemtek-brightspeed/sync-upstream.yml?branch=master&label=Sync)](https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed/actions/workflows/sync-upstream.yml)
[![Upstream](https://img.shields.io/badge/upstream-immortalwrt-blue)](https://github.com/immortalwrt/immortalwrt)
[![Kernel](https://img.shields.io/badge/kernel-6.18-red)](https://www.kernel.org/)
[![SoC](https://img.shields.io/badge/SoC-Airoha%20AN7581-orange)]()
[![License](https://img.shields.io/badge/license-GPL--2.0-green)](https://spdx.org/licenses/GPL-2.0-only.html)

> An [ImmortalWrt](https://github.com/immortalwrt/immortalwrt)-based firmware project for the Airoha AN7581 platform. It maintains separate build configs and images for two hardware-isolated Brightspeed/Gemtek devices: the XR1710G (10G Wi-Fi 7 router) and the XG2010G (XG(S)-PON/XE-PON gateway).

**Documentation baseline**: `master` @ `62056707` (verified 2026-11-10). Device profiles, package sets, and feed state are defined by the root-level `*.config` files, [`target/linux/airoha/image/an7581.mk`](target/linux/airoha/image/an7581.mk), and [`feeds.conf.default`](feeds.conf.default). Significant feature, stability, and patch changes are recorded in the [changelog](CHANGELOG.md). The current kernel baseline is `6.18.60` ([`target/linux/generic/kernel-6.18`](target/linux/generic/kernel-6.18)); upstream is merged by a scheduled job, so do not use a pinned commit badge to judge how current a build is.

## At a glance

| Device | Role | Seed config | Profile enabled today | Boot scheme / status | Default management URL |
|--------|------|-------------|-----------------------|----------------------|-------------------------|
| XR1710G (stock U-Boot layout + chainloader) | 10G Wi-Fi 7 router | [`1710.config`](1710.config) | `gemtek_xr1710g` | [naoki66/Gemtek-brightspeed-chainloader](https://github.com/naoki66/Gemtek-brightspeed-chainloader) | `http://192.168.50.1` |
| XR1710G (OpenWrt U-Boot UBI layout) | Whole-NAND UBI boot scheme | [`1710.config`](1710.config) | Profile defined, not enabled in the seed | **Not finished: missing trueKey** | `http://192.168.50.1` |
| XG2010G (1 GiB / 2 GiB auto-detect) | XG(S)-PON gateway | [`2010.config`](2010.config) | `gemtek_xg2010g-ubi` | [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) | `http://192.168.1.1` |
| Nokia XG-040G-MD / XG-040G-TF (UBI, 512 MiB / 1 GiB auto-detect) | Additional device configs | [`040.config`](040.config) / [`040-tf.config`](040-tf.config) | Separate configs, not built by CI | [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) | `http://192.168.1.1` |

> [!WARNING]
> Although the XR1710G and XG2010G share the Airoha AN7581 platform, their partition layouts, device trees, and package sets differ completely. **Never cross-flash their firmware.** On the same device, stock-layout and UBI-layout images also cannot be interchanged because they use different `SUPPORTED_DEVICES` values.
>
> The XR1710G OpenWrt U-Boot UBI layout is **not finished (missing trueKey)**. The XR1710G currently uses the "stock U-Boot layout + chainloader" scheme; see [Boot scheme and status](#boot-scheme-and-status).

## Contents

[Quick start](#quick-start) · [Supported hardware](#supported-hardware) · [Factory defaults](#factory-defaults) · [Build and release](#build-and-release) · [Flashing and upgrade caveats](#flashing-and-upgrade-caveats) · [Credits](#credits) · [License](#license)

## Quick start

**1. Download and verify an image.** Open the [Releases page](https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed/releases), pick the `*-squashfs-sysupgrade.itb` that exactly matches your device *and* partition layout, and download the matching per-config `sha256sums-<config>` file from the same release. Run this from the directory containing the images:

```bash
sha256sum -c sha256sums-1710.config   # XR1710G
sha256sum -c sha256sums-2010.config   # XG2010G
```

Each release also ships a package manifest so you can inspect what the image contains. When several build configs share one release, use the checksum file that matches your firmware.

**2. Flash.** To upgrade an existing installation, open LuCI → System → Backup / Flash Firmware → Flash image and select the file. For a first flash from stock firmware, or when switching to the UBI layout, read [Flashing and upgrade caveats](#flashing-and-upgrade-caveats) first. On the XG2010G you must confirm the boot state over serial and back up the stock partitions before proceeding. The XR1710G needs the chainloader written first (see [Boot scheme and status](#boot-scheme-and-status)), and its UBI-layout image is currently unusable.

**3. Change the credentials immediately.** The `root` account has no password and Wi-Fi uses well-known factory SSIDs and a shared default key. Set the admin password, change the wireless keys and regulatory domain, then check hardware offload and thermal status on the NPU and fan pages.

## Supported hardware

### Hardware and configuration comparison

| Item | XR1710G | XG2010G | Nokia XG-040G-MD | Nokia XG-040G-TF |
|------|---------|---------|------------------|------------------|
| **Role** | 10G Wi-Fi 7 router | XG(S)-PON gateway | XG(S)-PON gateway | XG(S)-PON gateway |
| **SoC** | Airoha AN7581GT (1.3 GHz quad-core + 8-core NPU) | Airoha AN7581 / EN7581 | Airoha AN7581 / EN7581 | Airoha AN7581 / EN7581 |
| **Memory** | 2 GiB DDR4 | 1 GiB DDR4; auto-detects 2 GiB hardware mods | 512 MiB / auto-detects 1 GiB hardware mods | 512 MiB / auto-detects 1 GiB hardware mods |
| **Flash** | 512 MiB SPI-NAND | 512 MiB SPI-NAND (W25N04KV) | 256 MiB SPI-NAND (`all_flash` 0x10000000) | Same as MD |
| **Ethernet** | 2×10G RTL8261BE + 2×1G AN7581 | 2×10G RTL8261N + 1×2.5G EN8811H + 1G switch ports | 1×2.5G EN8811H + 3×1G switch ports (lan2-lan4) | Same as MD |
| **Optical access** | None (Ethernet-only) | EN7572 xPON front end | EN7572 xPON front end | EN7572 xPON front end |
| **Wireless** | MT7996AV BE19000, tri-band 1376 / 5760 / 11520 Mbps | None | None | None |
| **USB** | None | None | 2 USB ports | None |
| **Fan / power** | NCT7802 PWM fan; 12 V 5 A | — | — | — |
| **Device tree** | [`an7581-xr1710g.dts`](target/linux/airoha/dts/an7581-xr1710g.dts) (plus an unfinished UBI-layout DTS) | [`an7581-gemtek-xg2010g-ubi.dts`](target/linux/airoha/dts/an7581-gemtek-xg2010g-ubi.dts) | [`an7581-nokia_xg-040g-md-ubi.dts`](target/linux/airoha/dts/an7581-nokia_xg-040g-md-ubi.dts) | [`an7581-nokia_xg-040g-tf-ubi.dts`](target/linux/airoha/dts/an7581-nokia_xg-040g-tf-ubi.dts) |
| **Seed config** | [`1710.config`](1710.config) | [`2010.config`](2010.config) | [`040.config`](040.config) | [`040-tf.config`](040-tf.config) |
| **Boot / status** | Stock U-Boot + chainloader; UBI layout unfinished (missing trueKey) | naoki66/uboot-an758x; built by CI | naoki66/uboot-an758x; supplied config, not built by CI | Same as MD |
| **Default management URL** | `http://192.168.50.1` | `http://192.168.1.1` | `http://192.168.1.1` | `http://192.168.1.1` |

> Values come from each board DTS, [`an7581.mk`](target/linux/airoha/image/an7581.mk), and the root-level `*.config` files; "—" means the repo gives no value. The XR1710G radios use MT7976GN / MT7977BN / MT7977AN; their peak rates are theoretical 802.11be PHY figures totalling about 18.66 Gbps (BE19000 class). Exact MCS notation is 1375 / 5765 / 11530 Mbps - only a rounding difference. Sources: [D-Link DPN-BE19000GR](https://www.dlink.com.sg/products/be19000-tri-band-10g-wi-fi-7-router), [WikiDevi Brightspeed XR1710G](https://wikidevi.wi-cat.ru/Brightspeed_XR1710G), [MediaTek Filogic 880](https://www.mediatek.com/zh-tw/products/broadband-wifi/mediatek-filogic-880).

`1710.config` currently sets `CONFIG_TARGET_MULTI_PROFILE is not set`, so one build produces only the `gemtek_xr1710g` image; `2010.config` enables only `gemtek_xg2010g-ubi`. The CI `config_seed` input accepts just `1710.config` and `2010.config` (default: `1710.config`).

### Boot scheme and status

> Maintainer note (2026-11-10): boot implementations live in separate repositories. This table maps them to the firmware configs here.

| Device / layout | Boot implementation | Status |
|-----------------|---------------------|--------|
| XR1710G (stock U-Boot layout + chainloader) | [naoki66/Gemtek-brightspeed-chainloader](https://github.com/naoki66/Gemtek-brightspeed-chainloader) | Current scheme; preserves the stock first 6 MiB and writes a 1 MiB chainloader slot at NAND `0x600000` |
| XR1710G (OpenWrt U-Boot UBI layout) | Requires rebuilding the boot area from `0x0` | **Not finished: missing trueKey**; do not flash images for this layout |
| XG2010G (1 GiB / 2 GiB auto-detect) | [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) (`xg2010g` / `xg2010g-2g`) | In use |
| Nokia XG-040G-MD / XG-040G-TF (UBI, 512 MiB / 1 GiB auto-detect) | [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) (`xg-040g-md` / `xg-040g-tf` and `-1g` targets) | In use |

> [!WARNING]
> The XR1710G OpenWrt U-Boot UBI layout is not finished (missing trueKey). Use only the "stock U-Boot layout + chainloader" scheme today and do not flash `gemtek_xr1710g-ubi` images. XG2010G and Nokia devices boot via `naoki66/uboot-an758x`; its boot-area layout differs from the chainloader scheme, so the two must not be mixed.

## Factory defaults

| Item | XR1710G | XG2010G |
|------|---------|---------|
| Management URL | `http://192.168.50.1` or `http://immortalwrt.lan` | `http://192.168.1.1` or `http://immortalwrt.lan` |
| Username / password | `root` / no password | `root` / no password |
| Wireless SSIDs | `ImmortalWrt-2G`, `ImmortalWrt-5G`, `ImmortalWrt-6G` | N/A |
| Wireless key | Shared `12345678` | N/A |
| Encryption | 2.4 GHz WPA2 (`psk2`), 5 GHz WPA2/WPA3 (`sae-mixed`), 6 GHz WPA3 (`sae`) | N/A |
| Regulatory domain | `US` (see [03_wifi_defaults](package/network/config/airoha-an7581-mt7996-board/files/etc/board.d/03_wifi_defaults)) | N/A |

IPv6 uses SLAAC/EUI-64 with DHCPv6/NDP and RA DNS/extra flags disabled to reduce compatibility problems on Chinese ISP networks.

> [!WARNING]
> Factory credentials are public knowledge. Change the root password and wireless keys on first login, and review the firewall and SSH settings before exposing the device to the internet.

## Build and release

### Seed configs

| File | Target profile | Purpose |
|------|----------------|---------|
| [`1710.config`](1710.config) | `DEVICE_gemtek_xr1710g` | XR1710G stock layout, CI default |
| [`2010.config`](2010.config) | `DEVICE_gemtek_xg2010g-ubi` | XG2010G UBI layout, 1 GiB / 2 GiB auto-detect |
| [`040.config`](040.config) | `DEVICE_nokia_xg-040g-md-ubi` | Nokia XG-040G-MD, additional config (512 MiB / 1 GiB auto-detect) |
| [`040-tf.config`](040-tf.config) | `DEVICE_nokia_xg-040g-tf-ubi` | Nokia XG-040G-TF, additional config (512 MiB / 1 GiB auto-detect) |

`make defconfig` and `make menuconfig` never rewrite these seed files; they are copied with `cp <config> .config`. CI exposes only the first two as `config_seed` choices.

### Local build

```bash
git clone https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed.git
cd ImmortalWrt-for-Gemtek-brightspeed
./scripts/feeds update -a
./scripts/feeds install -a
bash scripts/fix-stale-golang-host.sh
cp 1710.config .config          # or 2010.config / 040.config / 040-tf.config
make defconfig
bash scripts/set-build-version.sh .config
make -j$(nproc) world 2>&1 | tee build.log
bash scripts/summarize-build-errors.sh build.log
```

> [!NOTE]
> `make defconfig` and `make menuconfig` only modify `.config`. If you run either command, re-run `bash scripts/set-build-version.sh .config` before building so that `CONFIG_VERSION_*`, `CONFIG_TARGET_HOSTNAME`, `CONFIG_EXTRA_IMAGE_NAME`, and related build metadata are restored before `make world`.

Build environment: GNU/Linux (Debian 11+ recommended), AMD64, at least 4 GB RAM and 25 GB free disk (parallel builds benefit from more). See the [OpenWrt build system guide](https://openwrt.org/docs/guide-developer/build-system/install-buildsystem) for the dependency list.

The build pipeline runs `cp <config> .config && make defconfig && bash scripts/set-build-version.sh .config`: version fields are written **after** `defconfig` so defaults cannot overwrite them. [`scripts/set-build-version.sh`](scripts/set-build-version.sh) also writes the build date and commit hash visible in LuCI. Image filenames keep only `date-repo-commit`, while the full `date-repo-commit-upstream-commit` goes into `CONFIG_VERSION_CODE`, visible on the LuCI status page and in `/etc/openwrt_release`. To include the revision in filenames, run `VERSION_CODE_FILENAMES=y bash scripts/set-build-version.sh .config`.

### Download files

| Layout | sysupgrade filename |
|--------|---------------------|
| XR1710G stock layout | `immortalwrt-naoki66-YYYYMMDD-<repo-hash>-airoha-an7581-gemtek_xr1710g-squashfs-sysupgrade.itb` |
| XR1710G OpenWrt U-Boot UBI layout (**not finished, do not flash**) | `immortalwrt-naoki66-YYYYMMDD-<repo-hash>-airoha-an7581-gemtek_xr1710g-ubi-squashfs-sysupgrade.itb` |
| XG2010G UBI layout | `immortalwrt-naoki66-YYYYMMDD-<repo-hash>-airoha-an7581-gemtek_xg2010g-ubi-squashfs-sysupgrade.itb` |

The XR1710G UBI layout is **not finished (missing trueKey)**; even if enabling the `gemtek_xr1710g-ubi` profile produces an image, do not flash it. Use the "stock U-Boot layout + chainloader" scheme instead. Every release also ships a package manifest and per-config `sha256sums-<config>` files.

## Flashing and upgrade caveats

> [!WARNING]
> **XR1710G boot**: stock-layout firmware must be booted with [naoki66/Gemtek-brightspeed-chainloader](https://github.com/naoki66/Gemtek-brightspeed-chainloader) (preserves the stock first 6 MiB, chainloader at NAND `0x600000`). The OpenWrt U-Boot UBI layout is not finished (missing trueKey); do not flash `gemtek_xr1710g-ubi` images. XG2010G and Nokia devices use [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) — never mix the two boot layouts.

> [!WARNING]
> **First flash on XG2010G**: confirm the current boot state over serial and make a verified read-only backup of the stock NAND / critical partitions. Upgrade only the matching `ubi` partition; preserve `bootloader`, `uenv`, `dsd`, and `reserved_bmt`. Never use an XR1710G image or partition table on the XG2010G, and never force an upgrade from the legacy `0x00600000` layout.

> [!WARNING]
> **Upgrading across versions**: LuCI's "Keep settings" does not preserve packages you installed later. Back up your configuration and record installed packages (`apk list --installed` or the LuCI installed-packages list) before upgrading, then reinstall anything that is not preinstalled (for example `luci-app-adguardhome`). Use packages that match the new firmware and never restore `kmod-*` modules from an older kernel.

## Credits

### Upstream firmware

- [immortalwrt/immortalwrt](https://github.com/immortalwrt/immortalwrt) - ImmortalWrt main project
- [immortalwrt/luci](https://github.com/immortalwrt/luci) - LuCI web interface
- [immortalwrt/packages](https://github.com/immortalwrt/packages) - Community package feed
- [openwrt/routing](https://github.com/openwrt/routing) - OpenWrt routing packages
- [openwrt/mt76](https://github.com/openwrt/mt76) - MediaTek WiFi driver

### Reference projects

- [YYH2913/openwrt](https://github.com/YYH2913/openwrt) - XR1710G 6.18 kernel integration reference
- [hurrian/openwrt-w1700k](https://github.com/hurrian/openwrt-w1700k) - XR1710G PCIe 3.0 x2 patch reference (912 Gen3 link negotiation)
- [lvcdy/openwrt_xr1710g](https://github.com/lvcdy/openwrt_xr1710g) - Early XR1710G porting reference (partition table, PHY configuration)
- [Gilly1970/Gemtek-W1700K](https://github.com/Gilly1970/Gemtek-W1700K) - Airoha fan control and FlowSense (commit `db3f1c8`)
- [pbs05/uboot-an758x](https://github.com/pbs05/uboot-an758x) - Upstream reference for the OpenWrt U-Boot and whole-NAND UBI boot scheme; later forked into [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x)
- [naoki66/uboot-an758x](https://github.com/naoki66/uboot-an758x) - U-Boot / UBI boot implementation used by XG2010G and Nokia XG-040G-MD / XG-040G-TF

### XG2010G / Nokia XG-040G-MD / XG-040G-TF PON drivers and user space

- [pbs05/openwrt-pon-drivers](https://github.com/pbs05/openwrt-pon-drivers) - Early 6.18 PON driver; later forked into [naoki66/openwrt-pon-drivers](https://github.com/naoki66/openwrt-pon-drivers)
- [pbs05/openwrt-pon-userspace](https://github.com/pbs05/openwrt-pon-userspace) - Early 6.18 PON driver; later forked into [naoki66/OpenWrt_ONU_CONFIG](https://github.com/naoki66/OpenWrt_ONU_CONFIG)

### LuCI application sources

**[naoki66/luci-app-airoha](https://github.com/naoki66/luci-app-airoha)** is the main source of Airoha-specific LuCI apps in this firmware, providing `luci-app-airoha-npu`, `luci-app-airoha-fancontrol`, `luci-app-netmode` and more. The exact preinstalled set is defined by the root-level `*.config` files.

Other sources:

- [sirpdboy/luci-app-lucky](https://github.com/sirpdboy/luci-app-lucky) - Lucky multi-purpose tool

## License

[GPL-2.0-only](https://spdx.org/licenses/GPL-2.0-only.html), inherited from ImmortalWrt.

## Support

If this firmware is useful to you, you can buy the author a coffee.

<img src="c6ea388c976395326514814f80d512d5.png" alt="WeChat donation QR code" width="300">
