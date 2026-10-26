# luci-app-clients

One LuCI application for everything the router knows about the stations on its
network: addresses, per-device traffic split between the LAN and the WAN, the
wireless association each station had, and the DNS lookups it made.

Menu entry: **Status → Net Clients** (`admin/status/clients`), sitting right
after Airoha Soc (`order` 16).

Three tabs:

| Tab | Answers |
|---|---|
| **Overview** | How much total traffic, split LAN / WAN, plus a live trend chart |
| **Devices** | One row per client: addresses with their source, network, signal, LAN and WAN rates, this month's total, connections, last seen |
| **DNS** | Every lookup dnsmasq answered, with the device that asked and the server it went to |

## Dependencies

Declared in the Makefile, so a normal install pulls them in:

| Package | Why |
|---|---|
| `ucode`, `ucode-mod-fs`, `ucode-mod-ubus` | the two collector scripts |
| `rpcd-mod-iwinfo` | the `iwinfo` ubus object the probe calls for association data |
| `nlbwmon` | the "This month" counters; its database only starts accumulating the day it is installed |

`nlbwmon` is a hard dependency but the page still degrades: if `/usr/sbin/nlbw`
goes missing the month column stays empty and everything else keeps working.

The vendor-icon bundle (`htdocs/.../resources/clients-oui/`, 501 KB, 67 files)
ships inside this package. It used to live in luci-app-onu and this page merely
borrowed it; that made the icons silently disappear when the other package was
not installed.

## Where the data comes from

Two collectors run on a timer and write to `/tmp`. The pages read those files
and the live probe; nothing here polls a daemon over a socket.

| Source | Provides | Written by |
|---|---|---|
| `nf_conntrack` accounting | per-device rates, LAN/WAN split, connection count | `clients-probe` |
| ARP + IPv6 neighbour cache | who is reachable now, address family | `clients-probe` |
| `iwinfo` assoclist | SSID, band, signal, noise | `clients-probe` |
| archive | first / last seen, last known association and name | `clients-probe collect`, every 30 s |
| dnsmasq query log | DNS records with response time and result | `clients-dns collect`, every 10 s |

`clients-probe` with no argument prints a live snapshot and exits; the page
samples it and differentiates the cumulative counters itself, because it already
knows the wall-clock distance between two of its own samples.

## Why not bandix

`luci-app-bandix` measures traffic in eBPF at the TC hook, which is more precise
than reading conntrack. It also requires the flow offload to be turned off,
because offloaded flows never reach the TC hook. On a PON gateway that trades
hardware line-rate forwarding for a nicer number on a status page, which is a
bad trade. Everything this package shows is derived from conntrack accounting,
and the driver keeps those counters updated for PPE-offloaded flows - verified
on target before this design was chosen.

A note on what exactly conflicts, since it is easy to conflate: **the conflict
is with the hardware offload (PPE), not with software flow offloading.**
Measured on a device with `flow_offloading=1` and `flow_offloading_hw=1` and the
nft flowtable `flags offload` in effect, conntrack still reported per-device WAN
bytes (3.23 MB up / 1.37 MB down for one client). What genuinely stops working
under hardware offload is anything that has to see the packet: eBPF on the TC
hook, `nft` limit/quota rules, and `tc` shaping. That is why this package does
not offer rate limiting or per-device quotas - they cannot be made reliable
without giving up the offload.

## Long-term counters (nlbwmon)

The live columns are floors, because a conntrack byte count dies with its
stream. Measured: five seconds of ordinary traffic retired enough rows to drop
the table total by ~1.5 KB. A stream that opens and closes between two samples
is invisible.

`nlbwmon` solves this properly and is enabled in the image configs:

```
CONFIG_PACKAGE_nlbwmon=y
```

It listens on the conntrack netlink socket, so it sees each stream both when it
is created and when it is destroyed, with the final counters attached, and it
refreshes live streams every 30 s. Its default accounting period starts on the
first of each month, which is the "This month" column in the devices table. It
also works with the hardware offload on, for the same reason conntrack does.

The page never requires it: `clients-probe nlbw` reports `available: false` when
`/usr/sbin/nlbw` is missing and the column stays empty, with nothing else
affected.

**Flash note:** nlbwmon keeps its database in `/var/lib/nlbwmon` and commits
every 24 h (`commit_interval`), so this is one write per day to flash - not
per-poll. That is a deliberate exception to the "nothing here writes flash"
rule above, and it is the price of a real period total.

## Two limits worth knowing

1. **The live subtotals are floors, not lifetime totals.** conntrack counters
   belong to a flow; when the flow is reaped, its bytes leave the table with it.
   The rate is accurate, the accumulated figure is "what this view saw". For a
   real period total read the "This month" column, which comes from nlbwmon.
2. **DNS records live in memory.** They survive a page reload but not a reboot.
   Logging every query costs a little CPU on a busy resolver. The package turns
   `log-queries` on at install time; `clients.dns.enabled=0` stops the collector
   without touching the dnsmasq setting.

## Configuration

`/etc/config/clients`:

| Option | Default | Meaning |
|---|---|---|
| `clients.global.enabled` | `1` | master switch for the host collector |
| `clients.global.interval` | `30` | seconds between host samples |
| `clients.global.retention` | `7` | days an offline client is kept |
| `clients.global.history_path` | `/tmp/clients-history.json` | archive location |
| `clients.dns.enabled` | `1` | DNS collector on/off |
| `clients.dns.interval` | `10` | seconds between log passes |

Both archives default to `/tmp` deliberately: a status page must not wear the
flash. Point them at persistent storage only if the history has to survive a
reboot - and update `acl.d/luci-app-clients.json` to match the new paths.

## A note on dnsmasq

OpenWrt ships `log-facility=/dev/null` inside `/etc/dnsmasq.conf`. A second
`log-facility` from UCI aborts dnsmasq startup with *illegal repeated keyword*,
which takes DNS down for the whole LAN. The postinst comments that line out and
lets UCI own the path; prerm puts it back.

## Licence

Apache-2.0.
