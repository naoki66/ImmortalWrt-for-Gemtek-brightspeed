# XR1710G OpenClash / Mihomo EIP93 integration (review candidate)

This series integrates the **existing fw876/helloworld Mihomo backend** with
OpenClash. It does not claim authorship of that backend, implement a new cipher,
or accelerate stock unpatched Clash. No Wi-Fi, NPU, theme, LAN, Passwall/Xray,
node/subscription or protocol configuration changes are included.

## Build prerequisites and scope

Main base: a6dce40a91ca3f0ebeca9e8f51c8318f4d453eb3.
Tested feed heads: helloworld 425d4805ef6fa4d78759f0f0c96e1b31e8dde069;
luci 319f7c96e3530246cf91cfdd9bacb3fa44dc3a4e.
The normal upstream feed application hook applies the three new feed patches.
Refresh patches if feed versions change; do not force a failed patch.

Mihomo 1.19.33 from that helloworld feed must contain
`patches/100-an7581-eip93-aes-gcm.patch` and its ARM64 Build/Compile overlay
generation. That source patch includes the backend, generator and crypto tests;
this PR reuses it rather than copying a second backend into the firmware repo.
Unknown Go layouts fail generator checks. Historical validation used Go 1.27.3.

Select `CONFIG_PACKAGE_xr1710g-openclash-accel=y`. Its dependencies select
OpenClash, Mihomo, the Airoha EIP93 driver and AF_ALG/GCM support. Disable the
conflicting generic `kmod-crypto-hw-eip93` if selected in your seed. This optional
package is not forced into every default image and does not enable OpenClash.
No cryptodev/OpenSSL engine dependency is required for this Go backend.

The packaged core is `/usr/libexec/mihomo`; OpenClash's `clash_meta` is a symlink
to it. The build adds `-an7581-eip93` to core version output and fixes the UPX
hostpkg tool location. The EIP93 length Kconfig defaults remain 256/512, avoiding
interactive kernel syncconfig when selecting the driver.

## Hardware path and limits

Path: Go AES-GCM -> AF_ALG -> EIP93 AES-CTR, with GHASH on the CPU.
It **does not use /dev/crypto** and is distinct from flow-offload/NPU forwarding.
Runtime gates require AN7581/EN7581, ARM64 without ARM AES instructions, non-FIPS,
standard 12-byte nonce / 16-byte tag, 4..32 KiB encrypted records and <=256-byte
AAD. The record is not the MTU/IP-packet size. Each key is verified against the
software path before use. Unsupported cases and operational errors fall back;
authentication failure remains failure. ChaCha20 is not accelerated.

SS AES-GCM/SS2022 AES-GCM can use eligible records. Trojan/TLS/VMess/VLESS are
conditional on the actual cipher path and record size; the protocol name alone
does not establish offload. No forced TLS cipher or subscription change is made.
Hardware use does not guarantee better throughput: socket/copy/GHASH cost matters.

## Runtime policy and package upgrades

Default policy is auto. To disable, preserve your configuration then run:

```sh
uci set xr1710g_crypto.main.mode='off'
uci commit xr1710g_crypto
/etc/init.d/openclash restart
```

Use auto to restore. `xr1710g-crypto-status` reports policy, core version/path,
kernel crypto algorithms, IRQ counters and the activation notice.
The init hook passes MIHOMO_EIP93 to the managed core. No node credentials are
bundled. Configure OpenClash normally and start it only when ready.

Core-download protection is active only while the integration env file exists.
It blocks core downloads (not subscription/rule updates), retaining the packaged
overlay build. An explicit stock-core replacement can be allowed with:

```sh
uci set xr1710g_crypto.main.protect_bundled_core='0'
uci commit xr1710g_crypto
```

A stock replacement can lose EIP93 support. Restoring a package core after such
an update requires stopping OpenClash and restoring the packaged link/binary.
For configuration-preserving upgrades, an old overlay core can shadow the image
symlink: back it up manually, verify the resolved path/version, then restore the
link while the service is stopped. This package does not delete user core files.

## Evidence and limits

Prior local B15-family binaries passed ARM64 crypto boundary, invalid-tag,
concurrency, in-place and fallback tests on XR1710G. A controlled loopback SS
interop matrix passed 18/18 cases: 9 enabled cases produced 461..1790 EIP93 IRQs
each; 9 plain/off controls produced zero. Payload hashes matched in both directions.
The installed patched Mihomo core and hardware self-test also passed on stock
20261108-665113a8. These are historical backend tests, not validation of every
configuration or a newly rebuilt binary for this exact PR composition.

Actual configured Trojan traffic was NOT proven accelerated: probe HTTPS
requests failed with TLS EOF, transferred zero data and produced no IRQ increase.
Activation notices, a loaded driver or /dev/crypto alone are not traffic proof.
Public-node throughput gains, all Trojan/TLS ciphers, and this exact isolated
firmware composition have not been validated. This PR is a draft for review.

## Validation and rollback

See TESTING.md for build, hardware auto/off controls and rollback. No private
router config, subscription, signing key, binary backup or credentials are included.
