# XG2010G voice debug

The XG2010G has two Si32192 FXS lines. The public image exposes the Airoha
voice UAPI through `airoha-voice-ctl` and starts Asterisk with the `en75xx`
channel driver. The current logical mapping is:

| FXS | device | PCM | current ISI select | Asterisk | hardware result |
| --- | --- | ---: | ---: | --- | --- |
| 0 | `/dev/en75xx-fxs0` | 0 | 0 | `EN75XX/0` | physical FXS0 verified |
| 1 | `/dev/en75xx-fxs1` | 2 | 2 | `EN75XX/1` | aliases physical FXS0 |

## Device-side checks

```sh
asterisk -rx 'en75xx show lines'
airoha-voice-ctl -d /dev/en75xx-fxs0 info
airoha-voice-ctl -d /dev/en75xx-fxs0 state
airoha-voice-ctl -d /dev/en75xx-fxs0 stats
airoha-voice-ctl -d /dev/en75xx-fxs1 info
airoha-voice-ctl -d /dev/en75xx-fxs1 state
airoha-voice-ctl -d /dev/en75xx-fxs1 stats
devmem 0x1fbd1014 32
```

The `devmem` command and the kernel `/dev/mem` device are enabled temporarily
in the XG2010G debug image for register diagnosis. Do not write registers
unless the address and bitfield are known from the board documentation.

## Validated EN7581 electrical bring-up baseline

The Si32192 initialization path was reproduced on hardware on 2026-09-30. The
working ISI initialization preserves the DTS-selected PCM-SPI and CS1 mux bits,
adds the vendor PCM1 route, and enables the companion pinmux bits:

```text
0x1fa20218 = 0x00031000
0x1fa201d0 = 0x00000c01
legacy_chan_sel = N
```

With those values applied by the driver, a single module load creates both
logical endpoints without a manual register write:

```text
spi1.0: MSTRSTAT=0xff REG0=0xaa, ProSLIC_Init ret=0, PCM channel 0
spi1.1: MSTRSTAT=0x9f REG0=0xaa, ProSLIC_Init ret=0, PCM channel 2
```

The r19 module build was hot-loaded on the same device and reproduced those
values from the pre-load pinctrl state. Both logical devices then passed a
50-frame PCM check with 8000 RX bytes, 8000 TX bytes and zero DMA errors per
device. Asterisk opened both devices and reported them as on-hook and idle.
These results prove module initialization, device creation and DMA movement;
they do not prove that the two nodes address separate physical SLICs.

The failed r17/r18 experiment wrote `0x1fa20218 = 0x00003000` and
`0x1fa201d0 = 0x00000000`. That cleared the PCM-SPI/CS1 route established by
pinctrl, so both SLIC reads returned zero. The clock-gate and shifted-bitfield
experiments derived from that state were removed. `legacy_chan_sel` remains a
writable diagnostic parameter, but it must default to disabled because writing
the guessed channel-select value before every transfer prevents the second
endpoint from replying.

## Physical line validation on 2026-09-30

Only one telephone was connected to physical FXS0 for an isolation test. The
following observations show that the two logical nodes currently control the
same physical SLIC:

- Operating the FXS0 handset changed the Asterisk hook state for both FXS0 and
  FXS1.
- `en75xx ring 1 on` rang the telephone connected only to physical FXS0.
- Enabling `legacy_chan_sel` with selectors 0 and 2 produced trace records for
  both values, but FXS1 ringing still appeared on physical FXS0. Ring-off and
  linefeed operations also returned transient `EAGAIN` errors.

The test parameters were restored to `legacy_chan_sel=N` and
`trace_chan_sel=N`; no selector override remains in the saved configuration.
The earlier `scan-second` result is not proof of a second SLIC because it
rebound `spi1.0`, whose trace remained on logical 0 and physical 0.

The factory driver's channel split provides the next bounded test: it derives
the device index from `channel >> 1` and the subchannel bit from `channel & 1`.
For global channels 0 and 2, the likely device indices are therefore 0 and 1,
not controller selectors 0 and 2. Confirm the factory `SPI_bytes_read` and
`SPI_bytes_write` device-selection path before testing only
`second_chan_sel=1`. Do not resume broad selector or MMIO scans.

DTMF is not validated yet. FXS0 supplied dial tone, but Asterisk did not detect
the dialled `600` before its timeout and congestion tone. Repeat DTMF, echo and
two-way call tests only after the two physical SLICs have independent hook and
ring control.

The ISI transport keeps the current logical-to-selector mapping visible and
writable through module parameters. The current XG2010G default is logical
FXS0 to selector 0 and FXS1 to selector 2, but the physical test above has
invalidated selector 2 as an independent FXS1 mapping:

```sh
airoha-voice-ctl transport
cat /sys/module/en75xx_isi_spi/parameters/first_chan_sel
cat /sys/module/en75xx_isi_spi/parameters/second_chan_sel
cat /sys/module/en75xx_isi_spi/parameters/chan_sel_override
```

After changing a mapping for a bounded test, rebind the Si3219x devices so
probe runs again:

```sh
airoha-voice-ctl recover 0 2
```

The kernel emits dynamic-debug records such as `ISI select logical=1
physical=2`; enable them only during bring-up with:

```sh
echo 'file en75xx_isi_spi.c +p' > /sys/kernel/debug/dynamic_debug/control
```

When Asterisk owns a line, `airoha-voice-ctl` can report `Resource busy`.
Use `asterisk -rx 'en75xx show lines'` and the channel logs in that case. The
LuCI `Network -> ONU -> Voice` page shows the same read-only driver status and
clearly reports a busy device instead of attempting control operations.

## Local FXS loopback

Start the service and use two analogue handsets, or use the Asterisk console:

```sh
/etc/init.d/asterisk restart
asterisk -rx 'en75xx show lines'
asterisk -rvvvvv
```

Dial `1001` from FXS0 and `1002` from FXS1. Extension `600` answers with the
channel `Echo()` application. A call should change the hook state, increment
`hook_changes`, and move both RX and TX byte counters. Run `pcm-check` before
and after a call when checking DMA activity:

```sh
airoha-voice-ctl -d /dev/en75xx-fxs0 pcm-check 50
airoha-voice-ctl -d /dev/en75xx-fxs1 pcm-check 50
```

## H.248 test MG

Keep the proprietary SDK and its test client outside this repository. The
reference client is under the local SDK checkout at
`D:\GitData\XG2010G-fw-mod\airoha_sdk\h248-test-client`.

1. Configure the LuCI voice page for H.248, set the primary MG address and
   port (normally UDP `2944`), and commit the `voice` UCI configuration.
2. Run the test MG on a host reachable from the ONU. Use the client's
   ServiceChange/register flow first, then place a call to `1001` or `1002`.
3. Capture the control and media paths on the device:

```sh
tcpdump -i any -nn -s0 -w /tmp/xg2010g-h248.pcap udp port 2944
tcpdump -i any -nn -s0 -w /tmp/xg2010g-rtp.pcap udp portrange 10000-20000
logread -f | grep -E 'asterisk|en75xx|voice|H.248|RTP'
```

Validate in this order: ServiceChange response, physical termination ID
(`A0`/`A1`), off-hook event, dial digits, RTP endpoint creation, media in both
directions, then release. A successful H.248 transaction alone does not prove
the PCM path.

## SIP test

The same two FXS sections can be used with softswitch SIP or IMS SIP. Set the
registrar/proxy and per-line credentials in `Network -> ONU -> Voice`, then
check registration and a two-way call from a SIP peer:

```sh
asterisk -rx 'pjsip show registrations'
asterisk -rx 'pjsip show endpoints'
tcpdump -i any -nn -s0 -w /tmp/xg2010g-sip.pcap \
  'udp port 5060 or udp portrange 10000-20000'
```

Check `REGISTER`, `200 OK`, `INVITE`, SDP codec/port selection, and RTP in both
directions. Prefer G.711 A-law first; add other codecs only after the basic
FXS/PCM path is stable.

## Regression evidence

Static tests cover the DTS mapping, package selection, LuCI ACL and status
page. A complete hardware result requires the serial log from COM4, the
Asterisk line report, and packet captures from the H.248 or SIP test. Those
artifacts should remain outside the public repository unless sanitized.
