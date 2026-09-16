# Airoha PON Manager

This package provides an OpenWrt management layer for the collection-based
Airoha EN7581/AN7583 xPON driver stack under
`add/airoha-collection-main/airoha-pon`:

- creates `/dev/pon` and `/dev/epon_mac`;
- loads the BSP, PHY and GPON/EPON-capable MAC module chain in order;
- passes `/etc/config/pon` `mode` to `xpon_10g mode=<n>`;
- brings `pon`, `pon0`, `omci` and `oam` links up when the driver creates them;
- applies configured GPON SN/password and LOID fields through the vendor
  `omcicfgCmd`/`oamcfgCmd` command path without shell command construction;
- applies EPON LLID mask, MAC, FEC, dying-gasp and rate-mode fields through a
  small `/dev/epon_mac` ioctl helper using the 10G `xpon_epon_ioctl.h` enum ABI;
- exposes `ponctl status` for `/proc/xgpon`, `/proc/gpon`, `/proc/epon` and
  `/proc/pon_phy` diagnostics.

The `mode` names map to the vendor `XMCSIF_WanDetectionMode_t` order in
`src/bsp/include/global_inc/xpon_public_const.h`: `auto=0`, `gpon=1`,
`epon=2`, `xgpon=6`, `xgspon=7`, and the 10G/NGPON2 EPON variants in between.
The loaded value is visible with `ponctl modules` when `/sys/module/xpon_10g`
exposes the parameter.

`/etc/config/pon` separates generic xPON startup, GPON identity fields and EPON
management fields. `ponctl apply` replays those values without reloading
`xpon_10g`.

The `/dev/pon` XMCS ioctl names are visible in the driver (`xmcs_if.c`
`IO_IOS_WAN_DETECTION_MODE` / `IO_IOS_WAN_LINK_START` and `gpon_cmd_proc`
`GPON_IOS_*`), but the exported private header referenced by vendor userspace
(`xpon_global/private/xpon_if.h`) is missing from this local source snapshot.
Do not hard-code those magic numbers until that header is recovered. The current
helper only uses ABIs that are fully present in this tree: the vendor
`omcicfgCmd`/`oamcfgCmd` tools and the 10G `/dev/epon_mac` enum ioctl path.
