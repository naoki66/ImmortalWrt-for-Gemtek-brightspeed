# XG2010G voice debug

The XG2010G has one Si32192-A-FM1 and two RJ11 sockets wired in parallel to
that one analogue line. This was confirmed by opening the unit on 2026-09-30.
The firmware must expose one logical endpoint only:

| Line | device | PCM | ISI select | Asterisk | physical connection |
| --- | --- | ---: | ---: | --- | --- |
| 0 | `/dev/en75xx-fxs0` | 0 | 0 | `EN75XX/0` | both RJ11 sockets in parallel |

## Device-side checks

```sh
asterisk -rx 'en75xx show lines'
airoha-voice-ctl -d /dev/en75xx-fxs0 info
airoha-voice-ctl -d /dev/en75xx-fxs0 state
airoha-voice-ctl -d /dev/en75xx-fxs0 stats
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

With those values applied by the driver, the real SLIC initializes without a
manual register write:

```text
spi1.0: MSTRSTAT=0xff REG0=0xaa, ProSLIC_Init ret=0, PCM channel 0
```

The earlier second logical endpoint was an alias caused by instantiating a
nonexistent `spi1.1` child. Hook, ring and linefeed operations on it all acted
on the same physical Si32192. Do not recreate `/dev/en75xx-fxs1` and do not use
the former `scan-second` experiment as evidence of a second device.

The failed r17/r18 experiment wrote `0x1fa20218 = 0x00003000` and
`0x1fa201d0 = 0x00000000`. That cleared the PCM-SPI/CS1 route established by
pinctrl, so SLIC reads returned zero. The clock-gate and shifted-bitfield
experiments derived from that state were removed. `legacy_chan_sel` remains a
writable diagnostic parameter, but it must default to disabled.

## Physical line validation on 2026-09-30

Before opening the unit, live tests had already shown that both former logical
nodes controlled the same physical line:

- Both logical nodes reported the same hook changes.
- Ringing the former logical line 1 rang the handset connected to socket 0.
- Selector experiments never produced independent hook or ring control.

The test parameters were restored to `legacy_chan_sel=N` and
`trace_chan_sel=N`; no selector override remains in the saved configuration.
DTMF is not validated yet. FXS0 supplied dial tone, but Asterisk did not detect
the dialled `600` before its timeout and congestion tone. A direct hardware
DTMF test on 2026-10-01 also returned no digits. Si32192 does not provide the
DTMF decoder present in Si32193, so the r24 hardware-DTMF capability was a
false advertisement and is disabled by r25. Digit collection depends on
restoring nonzero PCM RX audio for Asterisk's software detector.

## PCM RX isolation on 2026-09-30

The r22 diagnostic build prefills RX frames with `0x11`. A completed EN7581 RX
descriptor replaced all 160 bytes of active channel 0 with zero while inactive
channels retained the fill. This proves that descriptor ownership, DMA address,
cache synchronization and DMA writes work; the SLIC/PCM link is delivering
digital silence.

The factory `pcm1.ko` was then disassembled. Its default table starts channel 0
at frame bit 0 and enables channels 0 and 1. A bounded live test moved both the
Si32192 and the known TX/RX slot registers to that factory table, captured 500
frames, and restored every register. RX remained all zero with no DMA errors,
so a simple frame-slot offset is not the root cause.

The next bounded comparison is the PCM interface control value. The factory
default structure constructs `0x15051306` after the documented writable mask;
the current driver reads `0x15071306`. The remaining single-bit difference is
bit 17. Confirm its field meaning before testing it. Do not scan unknown MMIO.

The ISI transport keeps the one active selector visible for diagnosis:

```sh
airoha-voice-ctl transport
cat /sys/module/en75xx_isi_spi/parameters/first_chan_sel
cat /sys/module/en75xx_isi_spi/parameters/chan_sel_override
```

After changing the first selector for a bounded test, rebind the Si3219x so
probe runs again:

```sh
airoha-voice-ctl recover 0
```

The kernel can emit dynamic-debug selector records; enable them only during
bring-up with:

```sh
echo 'file en75xx_isi_spi.c +p' > /sys/kernel/debug/dynamic_debug/control
```

When Asterisk owns a line, `airoha-voice-ctl` can report `Resource busy`.
Use `asterisk -rx 'en75xx show lines'` and the channel logs in that case. The
LuCI `Network -> ONU -> Voice` page shows the same read-only driver status and
clearly reports a busy device instead of attempting control operations.

## Local FXS loopback

### Playback bit alignment validated on 2026-10-01

Live Asterisk tests isolated harsh distortion to the PCM playback direction.
With the board slot base kept at bit 0, changing only
`playback_slot_adj` from 0 to 1 changed the Si32192 `PCMRX` value from
`0x2000` to `0x2001`; `PCMTX` remained `0x0000`. Extension `603` then
played six stable 450 Hz tones without electrical noise or clipping.

Extension `601` initially used the packaged `demo-congrats.gsm` prompt, whose
GSM 6.10 compression limited speech clarity. A temporary 8 kHz, 16-bit mono
PCM WAV prompt played clearly through the same Asterisk channel with no harsh
noise or distortion. This proves that the Asterisk-to-Si32192 playback path is
correct with a one-PCLK receive-slot adjustment. Keep capture adjustment at 0
and make playback adjustment 1 the driver default.

The final handset level calibration used `RXACGAIN=0x05a6703e`, approximately
3 dB above the clean `0x04000000` playback baseline, and `txgain_db=-13` for
capture. This produced clear PCM speech at a suitable earpiece level without
background noise or clipping. ALC must default off: enabling it did not prevent
the extension `600` acoustic feedback loop. With ALC off and capture at -13 dB,
normal and loud Echo() speech remained stable; LEC also remained off.

Start the service and use either parallel socket, or use the Asterisk console:

```sh
/etc/init.d/asterisk restart
asterisk -rx 'en75xx show lines'
asterisk -rvvvvv
```

Extension `600` answers with the channel `Echo()` application. Dialling it from
the handset should change hook state, produce DTMF events and move both RX and
TX byte counters. Run `pcm-check` before and after a call:

```sh
airoha-voice-ctl -d /dev/en75xx-fxs0 pcm-check 50
```

## H.248 test MG

Keep the proprietary SDK and its test client outside this repository. The
reference client is under the local SDK checkout at
`D:\GitData\XG2010G-fw-mod\airoha_sdk\h248-test-client`.

1. Configure the LuCI voice page for H.248, set the primary MG address and
   port (normally UDP `2944`), and commit the `voice` UCI configuration.
2. Run the test MG on a host reachable from the ONU. Use the client's
   ServiceChange/register flow first, then place a call to `1001`.
3. Capture the control and media paths on the device:

```sh
tcpdump -i any -nn -s0 -w /tmp/xg2010g-h248.pcap udp port 2944
tcpdump -i any -nn -s0 -w /tmp/xg2010g-rtp.pcap udp portrange 10000-20000
logread -f | grep -E 'asterisk|en75xx|voice|H.248|RTP'
```

Validate in this order: ServiceChange response, physical termination ID `A0`,
off-hook event, dial digits, RTP endpoint creation, media in both
directions, then release. A successful H.248 transaction alone does not prove
the PCM path.

## SIP test

The FXS0 section can be used with softswitch SIP or IMS SIP. Set the
registrar/proxy and line credentials in `Network -> ONU -> Voice`, then
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
