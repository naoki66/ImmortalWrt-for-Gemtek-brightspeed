# Gemtek 双产线编译验证报告（XR1710G / XG2010G）

验证日期：2026-09-21
验证目标：在本地服务器上分别编译 1710（XR1710G）与 2010（XG2010G）两条产线

## 0. 环境

| 项 | 值 |
|---|---|
| 服务器 | `10.10.20.6`（Debian 13 / x86_64 / 8 核 / 磁盘 76 G 可用） |
| 构建树 | `/home/alex/ImmortalWrt-for-Gemtek-brightspeed` |
| Commit | `90e99f0fc42b92e8ce8a26be120565f0052b00f4`（= `origin/master`） |
| 内核 | `linux-6.18.52` |
| 工具链 | GCC 14.4.0，`aarch64_cortex-a53` |

两份 config 的 `TARGET_BOARD` / `SUBTARGET` / `ARCH_PACKAGES` / `GCC_VERSION` **完全一致**，仅 `TARGET_PROFILE` 不同，因此复用同一 `build_dir` 串行构建。

## 1. 编译结果

| 产线 | config | Profile | EXIT | 耗时 | 产物 |
|---|---|---|---|---|---|
| XR1710G | `1710.config` | `DEVICE_gemtek_xr1710g-ubi` | **0** | 1647 s（27m27s） | `…-gemtek_xr1710g-ubi-squashfs-sysupgrade.itb` 55,763,253 B |
| XG2010G | `2010.config` | `DEVICE_gemtek_xg2010g-ubi` | **0** | 231 s（3m51s） | `…-gemtek_xg2010g-ubi-squashfs-sysupgrade.itb` 13,149,052 B<br>`…-gemtek_xg2010g-ubi-initramfs-recovery.itb` 11,141,120 B |

两条产线均无 `error:` / `FAILED` / `.rej` / `No rule to make target`，日志尾部都正常走完
`package/install` → `target/install` → `package/index` → `json_overview_image_info` → `checksum`。

耗时差异说明：1710 为首次构建（内核重编 + 补编约 200 个独占包，含 `ddns-go`、`dawn` 等）；
2010 的产物仍在 `build_dir` 中，属增量构建（仅内核 config 变化触发重编 + 重生成镜像）。

## 2. 两条产线的形态差异（package 层面）

| 对比项 | XR1710G | XG2010G |
|---|---|---|
| manifest 包数 | **357** | **146** |
| 无线 | `airoha-an7581-mt7996-board`、`airoha-en7581-mt7996-npu-firmware`、`kmod-mt7996-firmware`、`kmod-mt7996e`、`wpad-mesh-mbedtls`、`rtl826x-firmware` | **全部反向排除**（`-kmod-mac80211 -kmod-mt7996-firmware -kmod-mt7996e -wpad-mbedtls -wpad-mesh-mbedtls -wireless-regdb`） |
| PON | **全部反向排除**（9 个包） | `kmod-airoha-{xpon-en757x,pon-plugins,pon-dataplane,xpon-igmp,gpon-igmp,tod,en7581-pcm-spi}`、`airoha-pon-{firmware,manager}` |
| 以太 PHY | `kmod-phy-realtek`（RTL826x） | `kmod-phy-airoha-en8811h` + `airoha-en8811h-firmware`（2.5G） |
| mesh / 漫游 | `batctl-full`、`dawn` | 无 |
| recovery 镜像 | **无**（`CONFIG_TARGET_ROOTFS_INITRAMFS` 未开） | **有**（`CONFIG_TARGET_ROOTFS_INITRAMFS=y` + `CONFIG_TARGET_INITRAMFS_COMPRESSION_NONE=y`） |
| 固件命名 | 带 `VERSION_NUMBER` 前缀 | 无 `CONFIG_VERSION*` |

两设备的 `DEVICE_PACKAGES` 在 `target/linux/airoha/image/an7581.mk` 中互为镜像，互为反向排除。

## 3. 交叉污染校验

| 检查项 | 结果 |
|---|---|
| 1710 manifest 中出现 PON 包 | **0 行** ✓ |
| 2010 manifest 中出现 `mt7996` / `wpad` / `mac80211` / `batctl` / `dawn` | **0 行** ✓ |
| 2010 内核 config 出现 `CONFIG_MT76*` / `CONFIG_MT7996*` | 无 ✓ |
| 2010 内核 config 含 `CONFIG_AIROHA_PON_COMPAT=y`、`CONFIG_AIR_EN8811H_PHY=m`、`CONFIG_PTP_1588_CLOCK_AIROHA_TOD=m` | 齐全 ✓ |

结论：**切换 profile 未造成内核或 rootfs 层面的交叉污染。**

## 4. 发现的问题

### 4.1 XG2010G 固件曾静默缺失 en8811h 2.5G PHY 驱动（本轮已修正）

- **现象**：上一轮（11:49）的 2010 产物 manifest 仅 136 行，缺失
  `airoha-en8811h-firmware`、`kmod-libphy`、`kmod-phy-airoha-en8811h`。
- **根因**：`2010.config` 内存在一对自相矛盾的配置：
  ```
  # CONFIG_PACKAGE_kmod-libphy is not set
  CONFIG_PACKAGE_kmod-phy-airoha-en8811h=y      # DEPENDS:=+airoha-en8811h-firmware +kmod-libphy
  ```
  在该 `.config` 状态下，`make defconfig` 会因依赖不满足把三者**级联关闭**，
  而 image 构建对 `DEVICE_PACKAGES` 中不可用的包是**静默忽略**，构建仍然 EXIT=0。
- **影响**：内核中 `CONFIG_AIR_EN8811H_PHY=m`（以模块形式提供），因此固件缺包即等于
  **缺失 2.5G PHY 驱动与固件 blob**，属于会装机后才暴露的缺陷。
- **本轮修正**：从 `2010.config` 重新 `cp` + `make defconfig` 后，defconfig 按 `+` 的
  select 语义自动修正为 `kmod-libphy=y`，新 manifest 146 行，三件套齐全；
  sysupgrade 体积 `13,063,036` → `13,149,052` B（+84 KB，与驱动+固件体积相符）。

### 4.2 【待修】隔离脚本的 required 列表未覆盖 en8811h

`scripts/check-gemtek-profile-isolation.sh` 中 `xg2010g` 分支的 `required_packages` 为：

```
airoha-pon-firmware  airoha-pon-manager
kmod-airoha-xpon-en757x  kmod-airoha-pon-plugins  kmod-airoha-pon-dataplane
kmod-airoha-xpon-igmp  kmod-airoha-gpon-igmp  kmod-airoha-en7581-pcm-spi
（manifest 另加 kmod-airoha-tod）
```

`kmod-phy-airoha-en8811h` 与 `airoha-en8811h-firmware` **不在其中**，
因此 CI 无法拦住 4.1 所述的缺包。

建议：把这两个包加入 `xg2010g` 的 `required_packages`（至少加入
`manifest_required_packages`，以保证固件内确实存在）。

### 4.3 【待修】CI 的内核符号隔离检查取错了文件

`.github/workflows/build-firmware.yml:126`：

```sh
kernel_config=$(find build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581 \
                  -path '*/linux-*/.config' -print -quit)
```

`find -path` 的 glob 中 `*` **可以跨 `/`**，因此该表达式同时匹配到 backports 的 config，
且它排在前面，`-quit` 取到的就是错的那个。实测：

```
$ find …/linux-airoha_an7581 -path '*/linux-*/.config' -print
build_dir/…/mac80211-regular/backports-7.2/.config     ← 第一个
build_dir/…/linux-6.18.52/.config                      ← 正确的内核 config

$ find … -print -quit
build_dir/…/mac80211-regular/backports-7.2/.config     ← 取错
```

**后果**：`forbidden_kernel` / `required_kernel` 检查实际作用在 backports config 上，
内核层面的设备隔离检查形同虚设（当前实测内核 config 本身是正确的，属检查失效而非产物错误）。

**建议修复**（已验证）：限制遍历深度即可排除 depth 3 的 backports：

```sh
kernel_config=$(find build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581 \
                  -maxdepth 2 -path '*/linux-*/.config' -print -quit)
# 实测结果：build_dir/…/linux-6.18.52/.config  ✓
```

### 4.4 1710 固件版本号被写死

`1710.config` 含

```
CONFIG_VERSIONOPT=y
CONFIG_VERSION_DIST="ImmortalWrt naoki66"
CONFIG_VERSION_NUMBER="20260916-a2535c4f"
CONFIG_VERSION_CODE="20260916-a2535c4f-95070374"
CONFIG_VERSION_FILENAMES=y
```

而 CI 的 `Configure` 步骤会执行 `bash scripts/set-build-version.sh .config` 覆盖版本号，
因此 CI 产物名是动态的。但**手工在服务器上直接 `cp 1710.config .config && make defconfig` 时
不经过该脚本**，产物名恒为 `immortalwrt-naoki66-20260916-a2535c4f-…`，
既不反映实际构建时间/commit（当前为 `90e99f0fc4`），每次构建还会覆盖同名文件。

建议：服务器上手工构建 1710 时也先跑 `scripts/set-build-version.sh`，或接受该固定命名作为识别标记。

## 5. CI 侧验证

| 运行 | config | 结果 |
|---|---|---|
| [run 35550308334](https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed/actions/runs/35550308334) | 2010.config | ✗ 失败（`package/kernel/airoha-pon` 补丁漂移，已修） |
| [run 35557871119](https://github.com/naoki66/ImmortalWrt-for-Gemtek-brightspeed/actions/runs/35557871119) | 2010.config（artifact `gemtek-2010.config-firmware`） | **✓ 1h23m47s** |

## 6. 产物位置

服务器 `bin/targets/airoha/an7581/`（两产线产物并存，文件名不冲突）：

```
immortalwrt-airoha-an7581-gemtek_xg2010g-ubi-squashfs-sysupgrade.itb                 13,149,052 B
immortalwrt-airoha-an7581-gemtek_xg2010g-ubi-initramfs-recovery.itb                  11,141,120 B
immortalwrt-airoha-an7581-gemtek_xg2010g-ubi.manifest                                     4,445 B
immortalwrt-naoki66-20260916-a2535c4f-…-gemtek_xr1710g-ubi-squashfs-sysupgrade.itb   55,763,253 B
immortalwrt-naoki66-20260916-a2535c4f-…-gemtek_xr1710g-ubi.manifest                      11,143 B
```

元数据快照（manifest / sha256sums / *.buildinfo）：`/tmp/verify/{2010,2010new,1710}/`
