"""Board topology and upgrade compatibility regression checks (no hardware writes)."""
import json
import os
import pathlib
import subprocess
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
APP_ROOT = pathlib.Path(os.environ.get(
    "AIROHA_APP_ROOT",
    REPO / "package/feeds/airoha/luci-app-airoha",
))
COMMON = APP_ROOT / "root/usr/libexec/rpcd/airoha-common.sh"
NPU_BACKEND = COMMON.parent / "luci.airoha_npu"
BASE = REPO / "target/linux/airoha/an7581/base-files"


class BoardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.dt = self.root / "proc/device-tree"
        self.net = self.root / "sys/class/net"

    def tearDown(self):
        self.tmp.cleanup()

    def put(self, path, value):
        path = self.root / path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(value if isinstance(value, bytes) else str(value).encode())

    def shell(self, code, command):
        # Redirect only filesystem probes; execute the actual package functions.
        for prefix in ("/proc/", "/sys/"):
            code = code.replace(prefix, str(self.root) + prefix)
        result = subprocess.run(["sh", "-c", code + "\n" + command],
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return result.stdout

    def port(self, rel, name, mode="usxgmii", **stats):
        base = "proc/device-tree/" + rel
        self.put(base + "/status", b"okay\0")
        self.put(base + "/phy-mode", mode.encode() + b"\0")
        if name:
            self.put(base + "/openwrt,netdev-name", name.encode() + b"\0")
            self.put("sys/class/net/" + name + "/carrier", "1\n")
            self.put("sys/class/net/" + name + "/speed", "1000\n")
            for key, value in stats.items():
                self.put("sys/class/net/" + name + "/statistics/" + key, value)

    def topology(self, model):
        self.put("proc/device-tree/model", ("Gemtek " + model.upper()).encode() + b"\0")
        self.put("proc/device-tree/compatible", ("gemtek," + model).encode() + b"\0")
        return json.loads(self.shell(COMMON.read_text(), "airoha_port_topology_json"))

    def test_xg2010g_split_ports(self):
        eth = "soc/ethernet@1fb50000/"
        self.port(eth + "ethernet@1", "cpu", "internal")
        self.port(eth + "ethernet@2", "pon0", "")
        self.put("proc/device-tree/" + eth + "ethernet@2/airoha,pon-data-path", b"")
        self.port(eth + "ethernet@3", "", "")
        self.port(eth + "ethernet@3/ethernet-port@5", "lan2", rx_bytes=222)
        self.port(eth + "ethernet@4", "", "")
        self.port(eth + "ethernet@4/ethernet-port@0", "lan1", rx_bytes=111)
        self.port(eth + "ethernet@4/ethernet-port@1", "lan3", "2500base-x", rx_bytes=333)
        self.port("soc/switch@1fb58000/ports/port@4", "", "internal")
        self.put("proc/device-tree/soc/switch@1fb58000/ports/port@4/label", b"lan4\0")
        self.put("sys/class/net/lan4/carrier", "0\n")
        self.put("sys/class/net/lan4/speed", "-1\n")
        data = self.topology("xg2010g")
        ports = {p["netdev"]: p for p in data["ports"] if p["netdev"]}
        self.assertEqual(data["lan_netdevs"], ["lan1", "lan2", "lan3", "lan4"])
        self.assertEqual(ports["lan2"]["reg"], 3)
        self.assertEqual(ports["lan2"]["nbq"], 5)
        self.assertEqual(ports["lan1"]["nbq"], 0)
        self.assertEqual(ports["lan3"]["nbq"], 1)
        self.assertEqual(ports["lan1"]["rx_bytes"], 111)
        self.assertEqual(ports["lan3"]["rx_bytes"], 333)
        self.assertEqual(ports["lan4"]["carrier"], 0)
        self.assertIsNone(ports["lan4"]["speed_mbps"])
        self.assertEqual(ports["cpu"]["role"], "conduit")
        self.assertEqual(ports["pon0"]["role"], "pon")
        self.assertEqual(data["wan_netdev"], "pon0")
        self.assertEqual(data["has_pon"], 1)
        self.assertIsNone(data["pon"]["los"])

    def test_xr1710g_direct_ports(self):
        eth = "soc/ethernet@1fb50000/"
        self.port(eth + "ethernet@1", "cpu", "internal")
        self.port(eth + "ethernet@2", "wan")
        self.port(eth + "ethernet@4", "lan2")
        for number, name in ((1, "lan3"), (2, "lan4")):
            rel = f"soc/switch@1fb58000/ports/port@{number}"
            self.port(rel, "", "internal")
            self.put("proc/device-tree/" + rel + "/label", name.encode() + b"\0")
        data = self.topology("xr1710g")
        self.assertEqual(data["lan_netdevs"], ["lan2", "lan3", "lan4"])
        self.assertEqual(data["wan_netdev"], "wan")
        self.assertEqual(data["has_pon"], 0)
        self.assertEqual([p["netdev"] for p in data["ports"]],
                         ["cpu", "wan", "lan2", "lan3", "lan4"])

    def test_luci_acl_allows_topology(self):
        acl = json.loads((COMMON.parents[3] / "usr/share/rpcd/acl.d/luci-app-airoha.json").read_text())
        self.assertIn("getTopology", acl["luci-app-airoha"]["read"]["ubus"]["luci.airoha_npu"])

    def test_cpufreq_range_is_kernel_backed_and_capped_at_1400mhz(self):
        policy = "sys/devices/system/cpu/cpufreq/policy3"
        self.put(policy + "/scaling_governor", "powersave\n")
        self.put(
            policy + "/scaling_available_frequencies",
            "1200000 1250000 1300000 1350000 1400000 1450000 1600000\n",
        )
        backend = NPU_BACKEND.read_text()
        backend = backend[backend.index("_find_cpufreq_policy()"):
                          backend.index("get_status()")]
        output = self.shell(
            backend,
            """
dir=$(_find_cpufreq_policy)
printf 'dir=%s\n' "${dir##*/}"
_cpu_frequencies "$dir" | tr '\n' ' '
printf '\n1400='; _cpu_freq_allowed "$dir" 1400000; echo $?
printf '1450='; _cpu_freq_allowed "$dir" 1450000; echo $?
""",
        )
        self.assertEqual(
            output,
            "dir=policy3\n1200000 1250000 1300000 1350000 1400000 \n1400=0\n1450=1\n",
        )

    def test_gemtek_14ghz_opps_match_direct_pll_states(self):
        dts_names = (
            "an7581-gemtek-xg2010g-ubi.dts",
            "an7581-xr1710g.dts",
            "an7581-gemtek-xr1710g-ubi.dts",
        )
        for name in dts_names:
            dts = (REPO / "target/linux/airoha/dts" / name).read_text()
            self.assertIn("airoha,force-direct-pll;", dts, name)
            self.assertIn("cpufreq.default_governor=powersave", dts, name)
            for state in range(15, 19):
                mhz = 500 + state * 50
                self.assertIn(f"opp-{mhz}000000", dts, name)
                self.assertIn(f"required-opps = <&smcc_opp{state}>;", dts, name)
                self.assertIn(f"opp-level = <{state}>;", dts, name)
            self.assertNotIn("opp-1450000000", dts, name)

        patch = (
            REPO
            / "target/linux/airoha/patches-6.18/0402-pmdomain-airoha-allow-board-opt-in-direct-pll.patch"
        ).read_text()
        self.assertIn('"airoha,force-direct-pll"', patch)
        self.assertIn("if (state > 22)", patch)

    def test_gemtek_cpufreq_defaults_use_1400mhz_maximum(self):
        defaults = (BASE / "etc/uci-defaults/11-xr1710g-cpufreq-defaults").read_text()
        for board in (
            "gemtek,xg2010g",
            "gemtek,xg2010g-ubi",
            "gemtek,xr1710g",
            "gemtek,xr1710g-ubi",
        ):
            self.assertIn(board, defaults)
        self.assertIn("maxfreq0='1400000'", defaults)

    def test_board_compat_defaults(self):
        code = (BASE / "etc/board.d/05_compat-version").read_text()
        code = "\n".join(line for line in code.splitlines() if not line.startswith(". "))
        for board in ("gemtek,xg2010g", "gemtek,xg2010g-ubi", "gemtek,xr1710g-ubi"):
            mocks = f"""
board_name() {{ echo {board}; }}
board_config_update() {{ :; }}
board_config_flush() {{ :; }}
ucidef_set_compat_version() {{ echo "$1"; }}
"""
            self.assertEqual(self.shell(mocks + code, "").strip(), "2.0", board)

    def ubi_layout(self, offset=131072):
        for number, name, start, size in ((0, "bl2", 0, 131072), (1, "ubi", offset, 536739840)):
            for key, value in (("name", name), ("offset", start), ("size", size)):
                self.put(f"sys/class/mtd/mtd{number}/{key}", str(value) + "\n")
        self.put("sys/class/ubi/ubi0/mtd_num", "1\n")
        for number, name in enumerate(("fip", "ubootenv", "ubootenv2", "factory", "fit")):
            self.put(f"sys/class/ubi/ubi0_{number}/name", name + "\n")
            self.put(f"sys/class/ubi/ubi0_{number}/data_bytes", "2097152\n")
        self.put("sys/firmware/devicetree/base/chosen/rootdisk", b"\0\0\0\x17")
        self.put("sys/class/mtd/mtd1/of_node/volumes/fit/volname", b"fit\0")
        self.put("sys/class/mtd/mtd1/of_node/volumes/fit/phandle", b"\0\0\0\x17")

    def check_layout(self):
        code = (BASE / "lib/upgrade/gemtek-ubi.sh").read_text()
        return self.shell(code, "gemtek_ubi_layout_check gemtek,xg2010g; echo $?").strip()

    def test_layout_accepts_current_rejects_legacy(self):
        self.ubi_layout()
        self.assertEqual(self.check_layout(), "0")
        self.put("sys/class/mtd/mtd1/offset", "6291456\n")
        self.assertEqual(self.check_layout(), "1")

    def test_layout_rejects_missing_volume_and_wrong_rootdisk(self):
        self.ubi_layout()
        self.put("sys/class/ubi/ubi0_3/name", "not-factory\n")
        self.assertEqual(self.check_layout(), "1")
        self.put("sys/class/ubi/ubi0_3/name", "factory\n")
        self.put("sys/firmware/devicetree/base/chosen/rootdisk", b"\0\0\0\x18")
        self.assertEqual(self.check_layout(), "1")

    def test_layout_check_does_not_require_optional_text_tools(self):
        code = (BASE / "lib/upgrade/gemtek-ubi.sh").read_text()
        self.assertNotIn("tr -d", code)
        self.assertNotIn("cmp -s", code)

    def test_compat_migration_checks_layout_before_write(self):
        self.ubi_layout()
        mocks = """
uci() {
    case "$*" in
        "-q get system.@system[0]") echo system ;;
        "-q get system.@system[0].compat_version") echo 1.0 ;;
        "set system.@system[0].compat_version=2.0") echo SET ;;
        "commit system") echo COMMIT ;;
        *) return 1 ;;
    esac
}
"""
        code = mocks + (BASE / "lib/upgrade/gemtek-ubi.sh").read_text()
        command = "gemtek_ubi_compat_migrate gemtek,xg2010g; echo rc=$?"
        self.assertEqual(self.shell(code, command).strip(), "SET\nCOMMIT\nrc=0")
        self.put("sys/class/mtd/mtd1/offset", "6291456\n")
        self.assertEqual(self.shell(code, command).strip(), "rc=1")

    def test_xg2010g_debug_build_enables_devmem_without_changing_xr1710g(self):
        configs = [(REPO / name).read_text() for name in ("1710.config", "2010.config")]
        busybox_defaults = (REPO / "package/utils/busybox/Config-defaults.in").read_text()
        busybox_makefile = (REPO / "package/utils/busybox/Makefile").read_text()
        backend = (COMMON.parent / "luci.airoha_npu").read_text()
        acl = (COMMON.parents[3] / "usr/share/rpcd/acl.d/luci-app-airoha.json").read_text()
        frontend = (APP_ROOT / "htdocs/luci-static/resources/view/airoha_npu/status.js").read_text()
        for name, config in zip(("1710.config", "2010.config"), configs):
            if name == "2010.config":
                self.assertIn("CONFIG_KERNEL_DEVMEM=y", config)
                self.assertIn("CONFIG_BUSYBOX_DEFAULT_DEVMEM=y", config)
            else:
                self.assertIn("# CONFIG_KERNEL_DEVMEM is not set", config)
                self.assertNotIn("CONFIG_KERNEL_DEVMEM=y", config)
                self.assertNotIn("CONFIG_BUSYBOX_DEFAULT_DEVMEM=y", config)
        self.assertNotIn("default y if TARGET_airoha_an7581", busybox_defaults)
        self.assertIn("CONFIG_TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi", busybox_makefile)
        self.assertIn('echo "CONFIG_DEVMEM=y"', busybox_makefile)
        self.assertIn("ln -sf /bin/busybox $(1)/usr/bin/devmem", busybox_makefile)
        self.assertNotIn("getFrameEngine", backend)
        self.assertNotIn("getFrameEngine", acl)
        self.assertNotIn("/dev/mem", acl)
        self.assertNotIn("devmem", COMMON.read_text())
        self.assertNotIn("devmem", backend)
        self.assertNotIn("PSE", frontend)

    def test_bridge_controls_rejected_on_xg_only(self):
        code = COMMON.read_text()
        backend = (COMMON.parent / "luci.airoha_npu").read_text()
        backend = "\n".join(line for line in backend.splitlines() if not line.startswith(". "))
        self.put("proc/device-tree/compatible", b"gemtek,xg2010g\0airoha,an7581\0")
        result = self.shell(code + backend, """
get_vlan_offload
get_apmode_offload
set_vlan_offload '{"enabled":1}'
set_apmode_offload '{"enabled":1}'
""")
        results = [json.loads(line) for line in result.splitlines()]
        self.assertFalse(results[0]["supported"])
        self.assertFalse(results[1]["supported"])
        self.assertIn("not supported", results[2]["error"])
        self.assertIn("not supported", results[3]["error"])
        self.put("proc/device-tree/compatible", b"gemtek,xr1710g-ubi\0")
        self.assertEqual(self.shell(code, "airoha_bridge_offload_supported; echo $?").strip(), "0")

    def test_ppe_parser(self):
        records = """
00001 BND IPv4 5T orig=192.0.2.2:1234->198.51.100.1:443 new=203.0.113.1:4321->198.51.100.1:443 eth=00:11:22:33:44:55->02:11:22:33:44:66 vlan=10,20 packets=42 bytes=9007199254740993
00002 UNB IPv6 3T orig=2001:db8::1->2001:db8::2 eth=00:11:22:33:44:55->02:11:22:33:44:66 vlan=0,0 packets=0 bytes=0
00003 BND     L2B eth=00:11:22:33:44:55->02:11:22:33:44:66 etype=0800 vlan=88,0 packets=10 bytes=2048
00004 FIN DS-LITE orig=192.0.2.2:55->198.51.100.1:80 vlan=0,0
00005 BND 6RD orig=2001:db8::1->2001:db8::2
garbage line is ignored
"""
        self.put("ppe.txt", records)
        parser = COMMON.parent.parent / "airoha-ppe.awk"

        def parse(state="", limit=1024):
            result = subprocess.run(
                ["awk", "-v", f"state_filter={state}", "-v", f"limit={limit}",
                 "-f", str(parser), str(self.root / "ppe.txt")],
                capture_output=True, text=True, check=True)
            return json.loads(result.stdout)

        data = parse()
        self.assertEqual((data["total"], data["bound"], data["unbound"], data["l2b"]), (5, 3, 1, 1))
        self.assertEqual(data["entries"][0]["bytes"], "9007199254740993")
        self.assertEqual(data["entries"][0]["proto"], "5T")
        self.assertEqual(data["entries"][2]["type"], "L2B")
        self.assertEqual(data["entries"][3]["type"], "DS-LITE")
        self.assertEqual(data["entries"][3]["proto"], "")
        self.assertIsNone(data["entries"][3]["packets"])
        self.assertEqual(data["entries"][4]["type"], "6RD")
        self.assertEqual(parse("UNB")["total"], 1)
        limited = parse(limit=2)
        self.assertEqual(limited["total"], 5)
        self.assertEqual(len(limited["entries"]), 2)
        self.assertTrue(limited["truncated"])
        for record in ("946\n", "946", "0\n"):
            self.put("ppe.txt", record)
            counted = parse("BND")
            self.assertEqual(counted["total"], int(record))
            self.assertEqual(counted["bound"], int(record))
            self.assertEqual(counted["entries"], [])
            self.assertEqual(parse("UNB")["total"], 0)


if __name__ == "__main__":
    unittest.main()
