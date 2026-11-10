# XR1710G Wi-Fi / PCIe experimental review series

These are five groups of previously developed local changes, submitted for review.
They are NOT a confirmed fix for disappearing Wi-Fi. The five groups contain
multiple OpenWrt package/kernel patch files. Apply/revert commits in series order.

Base: a6dce40a91ca3f0ebeca9e8f51c8318f4d453eb3 (upstream master checked 2026-11-10).
This series excludes local UI, LAN addressing, OpenClash, crypto, NPU firmware
replacement and coherent-DMA-pool changes. It does not add PCIe AER callbacks.

## Observed failure

Stock release 20261108-665113a8, Linux 6.18.60, mt76 0936617d,
20260721 MT7996 firmware. Client: Windows NFA765, Wi-Fi only; iperf3 server
on router, TCP bidirectional unlimited, four streams per direction.

2.4 GHz ran 7200 seconds without disconnect: receiver mean 167.55 Mbps upload,
5.28 Mbps download. 5 GHz failed about 13 minutes into the next test:

```
2026-11-10 16:47:49 mt7996e 0000:01:00.0: Message 00130022 (seq 4) timeout
2026-11-10 16:47:50 pcieport 0000:00:00.0: [14] CmpltTO (First)
2026-11-10 16:47:50 mt7996e 0000:01:00.0: AER: can't recover (no error_detected callback)
2026-11-10 16:47:50 pcieport 0000:00:00.0: AER: device recovery failed
2026-11-10 16:47:52 mt7996e 0000:01:00.0: Timeout for initializing firmware
2026-11-10 16:48:31 mt7996e 0000:01:00.0: chip full reset failed
```

5 GHz client intervals before termination averaged 491.13/572.24 Mbps
upload/download, including a zero-rate failure tail. There is no successful
final receiver summary for that attempt. 6 GHz was not tested. Local persistent
router logging recovered the kernel failure even though SSH used Wi-Fi.
No extra Wi-Fi temperature MCU queries were issued by this test script.

The timeout ordering does not establish the original hardware trigger.
Completion timeout can follow an unresponsive endpoint as well as link faults.
The error chain is not evidence that increasing MCU timeouts fixes the cause.

## Review groups

1. Main PCIe Gen2 x2 and IDAC 1..7 search; board opt-in to four stock secondary
   PCIe analog settings and binding. Gen2 limits maximum bus bandwidth.
   The shared main PHY calibration change also affects other users of that PHY
   driver; review its scope before merging. Secondary analog setup is opt-in.
2. NPU RX descriptor completion/refill ownership fix (mt76 PR 1169).
3. NPU full-reset/L1 recovery, irqsave remap lock, load-time opt-out and inactive
   queue guards, and reset-before-registration guard. NPU stays enabled by default.
   These are recovery/lifecycle changes, not a PCIe AER recovery implementation.
4. GET_MIB_INFO deadline 2s -> 5s. Experimental tolerance for delayed statistics;
   no command suppression/retry, no PCIe repair, and it can delay error escalation.
5. Reset-before-bus-master/shutdown DMA quiesce plus stock thermal ADC action-0
   query, cache/backoff and reset-generation checks. These address startup and
   thermal behavior, not a demonstrated cause of the runtime completion timeout.

## Evidence limits

The local B14 family was built with these changes PLUS other platform changes.
This isolated series is a different composition. It needs a fresh full firmware
build and hardware validation before merge. Earlier local builds have both short
passing runs and faults; no single patch is established as the solution.

## Verification and rollback

See TESTING.md. Public evidence is restricted to kernel errors and aggregate
test information. No credentials, subscriptions, proxy configuration or raw
private router backup are included. Original patch authors/origins are retained.

The fifth commit also refreshes the existing beacon-protection patch context
after the ADC insertion; it preserves the upstream advertised capability.
