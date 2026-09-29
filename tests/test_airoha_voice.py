import pathlib
import unittest


REPO = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = REPO / "package/kernel/airoha-voice/Makefile"
PATCH = REPO / "package/kernel/airoha-voice/patches/010-add-en7581-xg2010g-support.patch"
DTS = REPO / "target/linux/airoha/dts/an7581-gemtek-xg2010g-ubi.dts"
SOC_DTS = REPO / "target/linux/airoha/dts/an7581.dtsi"
IMAGE = REPO / "target/linux/airoha/image/an7581.mk"
CONFIG = REPO / "2010.config"
PLATFORM_UPGRADE = (
    REPO / "target/linux/airoha/an7581/base-files/lib/upgrade/platform.sh"
)
VOICE_CTL = (
    REPO
    / "package/kernel/airoha-voice/files/airoha-voice-ctl.c"
)
ASTERISK_PACKAGE = (
    REPO / "package/network/services/asterisk-chan-en75xx/Makefile"
)
ASTERISK_HOTPLUG = (
    REPO
    / "package/network/services/asterisk-chan-en75xx/files/50-en75xx-fxs"
)
ASTERISK_CONFIG = (
    REPO
    / "package/network/services/asterisk-chan-en75xx/files/en75xx.conf"
)
ASTERISK_DIALPLAN = (
    REPO
    / "package/network/services/asterisk-chan-en75xx/files/extensions-en75xx.conf"
)
ASTERISK_DEFAULTS = (
    REPO
    / "package/network/services/asterisk-chan-en75xx/files/99-asterisk-en75xx"
)
VOICE_PCM_ACTIVITY_PATCH = (
    REPO
    / "package/kernel/airoha-voice/patches/100-start-pcm-on-audio-activity.patch"
)
PON_VOICE_PATCH = (
    REPO
    / "patches/feeds/pon_userspace/luci-app-pon/100-airoha-voice-driver-status.patch"
)
ASTERISK_ANSWER_PATCH = (
    REPO
    / "package/network/services/asterisk-chan-en75xx/patches/100-activate-pcm-when-answering.patch"
)
OLD_DRIVER = REPO / "package/kernel/airoha-voice/src/airoha_en7581_pcm_spi.c"


class VoiceStackSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.package = PACKAGE.read_text(encoding="utf-8")
        cls.patch = PATCH.read_text(encoding="utf-8")
        cls.dts = DTS.read_text(encoding="utf-8")
        cls.soc_dts = SOC_DTS.read_text(encoding="utf-8")
        cls.image = IMAGE.read_text(encoding="utf-8")
        cls.config = CONFIG.read_text(encoding="utf-8")
        cls.platform_upgrade = PLATFORM_UPGRADE.read_text(encoding="utf-8")
        cls.voice_ctl = VOICE_CTL.read_text(encoding="utf-8")
        cls.asterisk_package = ASTERISK_PACKAGE.read_text(encoding="utf-8")
        cls.asterisk_hotplug = ASTERISK_HOTPLUG.read_text(encoding="utf-8")
        cls.asterisk_config = ASTERISK_CONFIG.read_text(encoding="utf-8")
        cls.asterisk_dialplan = ASTERISK_DIALPLAN.read_text(encoding="utf-8")
        cls.asterisk_defaults = ASTERISK_DEFAULTS.read_text(encoding="utf-8")
        cls.voice_pcm_activity_patch = VOICE_PCM_ACTIVITY_PATCH.read_text(
            encoding="utf-8"
        )
        cls.asterisk_answer_patch = ASTERISK_ANSWER_PATCH.read_text(
            encoding="utf-8"
        )
        cls.pon_voice_patch = PON_VOICE_PATCH.read_text(encoding="utf-8")

    def test_package_pins_complete_voice_stack(self):
        self.assertIn("PKG_SOURCE_PROTO:=git", self.package)
        self.assertIn("Sirherobrine23/airoha_voip.git", self.package)
        self.assertIn(
            "PKG_SOURCE_VERSION:=4222576d980856f3c9ffc323d2fd78a28f94f085",
            self.package,
        )
        self.assertIn(
            "PKG_MIRROR_HASH:=1bb5ccf053b1f3f0ebd8dbb3680a792312d119f2dee62658aa813689eba77588",
            self.package,
        )
        for module in (
            "en75xx-lec.ko",
            "en75xx-pcm.ko",
            "en75xx-voice.ko",
            "en75xx-isi-spi.ko",
            "en75xx-slic-si3219x.ko",
        ):
            self.assertIn(module, self.package)
        self.assertIn("si3219x_a_lcqc.fw", self.package)
        self.assertFalse(OLD_DRIVER.exists())

    def test_patch_adds_en7581_pcm_and_isi_quirks(self):
        for source_contract in (
            'compatible = "airoha,en7581-pcm"',
            'compatible = "airoha,en7581-isi-spi"',
            "EN7581_CHIP_SCU_CLKSRC\t\t0x218",
            "EN7581_CHIP_SCU_CLKSRC_MASK\t0x003f3300u",
            "EN7581_CHIP_SCU_GPIO_DEV1\t0x00003000u",
            "EN7581_CHIP_SCU_PINMUX_MASK\t0x00000c00u",
            "EN7581_SYS_RESET_PCM1_ISI\tBIT(0)",
            "EN7581_SYS_RESET_SPI_WRAPPER\tBIT(4)",
            ".dma_addr_mask = 0x3fffffff",
            ".dma_or = 0x80000000",
            ".channel_mask = GENMASK(3, 0)",
            ".pcm_v2 = true",
        ):
            self.assertIn(source_contract, self.patch)

    def test_patch_selects_both_point_to_point_si32192_devices(self):
        self.assertIn("host->num_chipselect = 32", self.patch)
        self.assertIn("static bool legacy_chan_sel = true", self.patch)
        self.assertIn("select the physical ISI device before each transaction", self.patch)
        mapping_patch = (
            REPO
            / "package/kernel/airoha-voice/patches/020-map-logical-second-isi-endpoint.patch"
        ).read_text(encoding="utf-8")
        self.assertIn("second_chan_sel", self.patch)
        self.assertIn("if (chan_sel == 1)", mapping_patch)
        self.assertIn("chan_sel = second_chan_sel", mapping_patch)
        self.assertNotIn("control_channel = spi_get_chipselect", self.patch)

    def test_dynamic_isi_selection_and_recovery_controls_are_present(self):
        dynamic_patch = (
            REPO
            / "package/kernel/airoha-voice/patches/030-dynamic-isi-channel-selection.patch"
        ).read_text(encoding="utf-8")
        for source_contract in (
            "first_chan_sel",
            "chan_sel_override",
            "en75xx_isi_physical_select",
            "ISI select logical=",
        ):
            self.assertIn(source_contract, dynamic_patch)
        for command in ("transport", "recover", "scan-second", "identity"):
            self.assertIn(command, self.voice_ctl)
        self.assertIn("PKG_RELEASE:=10", self.package)

    def test_xg2010g_describes_two_fxs_lines(self):
        self.assertIn('compatible = "airoha,en7581-pcm";', self.dts)
        self.assertIn('compatible = "airoha,en7581-isi-spi";', self.dts)
        self.assertIn("airoha,dma-channel-mask = <0x05>;", self.dts)
        self.assertEqual(self.dts.count('compatible = "silabs,si32192";'), 2)
        self.assertIn("proslic@0", self.dts)
        self.assertIn("proslic@1", self.dts)
        self.assertNotIn("proslic@2", self.dts)
        self.assertIn("airoha,pcm-channel = <0>;", self.dts)
        self.assertIn("airoha,pcm-channel = <2>;", self.dts)
        self.assertNotIn("airoha,en7581-pcm-spi-si32192", self.dts)

        second_child = self.dts.index("proslic@1")
        second_child_end = self.dts.index("};", second_child)
        self.assertIn("reg = <1>;", self.dts[second_child:second_child_end])

        isi_start = self.dts.index("isi0: spi@1fbd1000")
        first_child = self.dts.index("proslic@0", isi_start)
        status = self.dts.index('status = "okay";', isi_start)
        self.assertLess(status, first_child)

    def test_xg2010g_fit_stays_within_installed_ubi_volume(self):
        self.assertIn("CONFIG_TARGET_SQUASHFS_BLOCK_SIZE=1024", self.config)

        device_start = self.image.index("define Device/gemtek_xg2010g-ubi")
        device_end = self.image.index("endef", device_start)
        device = self.image[device_start:device_end]
        self.assertIn("IMAGE_SIZE := 42036k", device)
        self.assertIn("append-metadata | check-size", device)

    def test_afe_sound_dai_provider_declares_zero_cells(self):
        afe = self.soc_dts[self.soc_dts.index("afe: afe@1fbe2200") :]
        afe = afe[: afe.index("};")]
        self.assertIn("#sound-dai-cells = <0>;", afe)

    def test_xg2010g_upgrade_ramfs_contains_layout_check_tools(self):
        self.assertIn("RAMFS_COPY_BIN='fitblk fit_check_sign'", self.platform_upgrade)

    def test_voice_control_utility_uses_public_uapi(self):
        self.assertIn("CONFIG_PACKAGE_airoha-voice-ctl=y", self.config)
        self.assertIn("define Package/airoha-voice-ctl", self.package)
        self.assertIn("$(eval $(call BuildPackage,airoha-voice-ctl))", self.package)
        self.assertIn("#include <linux/en75xx_voice.h>", self.voice_ctl)
        for command in (
            "EN75XX_VOICE_GET_INFO",
            "EN75XX_VOICE_GET_STATE",
            "EN75XX_VOICE_GET_STATS",
            "EN75XX_VOICE_SET_LINEFEED",
            "EN75XX_VOICE_SET_RING",
            "EN75XX_VOICE_SET_TONE",
            "command_pcm_check",
        ):
            self.assertIn(command, self.voice_ctl)

    def test_asterisk_channel_package_is_selected_and_buildable(self):
        self.assertIn("CONFIG_PACKAGE_asterisk-chan-en75xx=y", self.config)
        self.assertIn("PKG_BUILD_DEPENDS:=asterisk", self.asterisk_package)
        self.assertIn("cd $(PKG_BUILD_DIR)/asterisk", self.asterisk_package)
        self.assertIn("-c chan_en75xx.c", self.asterisk_package)
        self.assertIn("-I$(PKG_BUILD_DIR)/include/uapi", self.asterisk_package)
        self.assertIn("-I$(PKG_BUILD_DIR)/include/uapi/linux", self.asterisk_package)
        self.assertIn("-Wno-unused-parameter", self.asterisk_package)
        self.assertIn("chan_en75xx.so", self.asterisk_package)
        self.assertIn("./files/en75xx.conf", self.asterisk_package)
        self.assertIn("./files/extensions-en75xx.conf", self.asterisk_package)
        self.assertIn(
            "$(INSTALL_DATA) ./files/en75xx.conf",
            self.asterisk_package,
        )
        self.assertIn("chown asterisk:asterisk", self.asterisk_hotplug)
        self.assertIn("[line0]", self.asterisk_config)
        self.assertIn("[line1]", self.asterisk_config)
        self.assertIn("context = fxs", self.asterisk_config)
        self.assertIn("exten => 600,1,Answer()", self.asterisk_dialplan)
        self.assertIn("n,Echo()", self.asterisk_dialplan)
        self.assertNotIn("Playback(", self.asterisk_dialplan)
        self.assertIn("asterisk.general.enabled='1'", self.asterisk_defaults)
        self.assertIn("extensions-en75xx.conf", self.asterisk_defaults)

    def test_pcm_runs_only_while_audio_is_active(self):
        self.assertIn("bool pcm_started;", self.voice_pcm_activity_patch)
        self.assertIn(
            "en75xx_voice_pcm_start_locked", self.voice_pcm_activity_patch
        )
        self.assertIn(
            "en75xx_voice_pcm_stop_locked", self.voice_pcm_activity_patch
        )
        self.assertIn(
            "linefeed == EN75XX_VOICE_LINEFEED_ACTIVE",
            self.voice_pcm_activity_patch,
        )
        self.assertIn(
            "line_set_linefeed(p, EN75XX_VOICE_LINEFEED_ACTIVE)",
            self.asterisk_answer_patch,
        )

    def test_luci_voice_page_exposes_driver_status_without_mutating_lines(self):
        for command in (
            "'require fs';",
            "'/usr/sbin/airoha-voice-ctl'",
            "'/dev/en75xx-fxs0'",
            "'/dev/en75xx-fxs1'",
            "'Airoha FXS driver'",
            "'stats'",
        ):
            self.assertIn(command, self.pon_voice_patch)
        self.assertIn('"/usr/sbin/airoha-voice-ctl -d * info"', self.pon_voice_patch)
        self.assertIn('"/usr/sbin/airoha-voice-ctl -d * state"', self.pon_voice_patch)
        self.assertIn('"/usr/sbin/airoha-voice-ctl -d * stats"', self.pon_voice_patch)
        self.assertNotIn('"/usr/sbin/airoha-voice-ctl -d * ring', self.pon_voice_patch)
        self.assertNotIn('"/usr/sbin/airoha-voice-ctl -d * tone', self.pon_voice_patch)


if __name__ == "__main__":
    unittest.main()
