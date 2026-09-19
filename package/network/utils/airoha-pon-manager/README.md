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
- reads the read-only factory DSD key/value block from `/dev/mtdblock2` with
  `dsdctl`, exports it to `/tmp/dsd.env`, and uses `fsan` as a GPON serial
  fallback only when a password is explicitly configured.

The `mode` names map to the vendor `XMCSIF_WanDetectionMode_t` order in
`src/bsp/include/global_inc/xpon_public_const.h`: `auto=0`, `gpon=1`,
`epon=2`, `xgpon=6`, `xgspon=7`, and the 10G/NGPON2 EPON variants in between.
The loaded value is visible with `ponctl modules` when `/sys/module/xpon_10g`
exposes the parameter.

`/etc/config/pon` separates generic xPON startup, GPON identity fields and EPON
management fields. `ponctl apply` replays those values without reloading
`xpon_10g`.

`ponctl mode <mode>` supports runtime PON mode changes without unloading
`xpon_10g` or rebooting. The helper uses the verified AArch64 `/dev/pon` request
values `0x4000da20` (WAN link start/stop), `0x4000da21` (WAN detection mode),
and `0x8000da22` (WAN link configuration). These requests match the vendor
`libxpon.so` calls and the SDK dispatch in `xpon_10g/src/xmcs/xmcs_if.c`.

The transition order is deliberately `stop -> set detection mode -> start ->
read and verify WAN_LINKCFG_t`. If a step or verification fails, the helper
tries to restore the previous detection mode and link state. The runtime
switch only controls the PON WAN MAC/PHY path; it does not bring down LAN
ports. The init script explicitly brings existing `lan1` through `lan4`
devices up after startup or a mode change.

The mode command changes the SDK `XMCSIF_WanDetectionMode_t` field. It does not
rewrite the full boot-time `onu_type` bitfield (ONU type, Combo-PON and BBF.247
bits); those identity fields remain a separate boot/driver configuration
boundary.

`dsdctl` is intentionally read-only. It supports `get <key>`, `get all`,
`env`, and `status`; it does not write the calibration/identity partition.
