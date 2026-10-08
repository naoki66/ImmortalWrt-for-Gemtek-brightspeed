define Build/an7581-emmc-bl2-bl31-uboot
  head -c $$((0x800)) /dev/zero > $@
  cat $(STAGING_DIR_IMAGE)/an7581_$1-bl2.fip >> $@
  dd if=$(STAGING_DIR_IMAGE)/an7581_$1-bl31-u-boot.fip of=$@ bs=1 seek=$$((0x20000)) conv=notrunc
endef

define Build/an7581-preloader
  $(STAGING_DIR_HOST)/bin/fiptool create \
		--tb-fw $(STAGING_DIR_IMAGE)/an7581-bl2.bin \
		$(STAGING_DIR_IMAGE)/an7581_$1-bl2.fip
  cat $(STAGING_DIR_IMAGE)/an7581_$1-bl2.fip >> $@
endef

define Build/an7581-bl31-uboot
  $(STAGING_DIR_HOST)/bin/fiptool create \
		--soc-fw $(STAGING_DIR_IMAGE)/an7581-bl31.lzma \
		--nt-fw $(STAGING_DIR_IMAGE)/an7581_$1-u-boot.lzma \
		$(STAGING_DIR_IMAGE)/an7581_$1-bl31-u-boot.fip
  cat $(STAGING_DIR_IMAGE)/an7581_$1-bl31-u-boot.fip >> $@
endef

define Build/an7581-chainloader
  $(INSTALL_DIR) $(KDIR)/chainload-fit-$(notdir $@)
  @if [ -f "$(STAGING_DIR_IMAGE)/an7581_$1-u-boot.lzma" ]; then \
    KERNEL="$(STAGING_DIR_IMAGE)/an7581_$1-u-boot.lzma"; \
    COMP="lzma"; \
  else \
    KERNEL="$(STAGING_DIR_IMAGE)/an7581_$1-u-boot.bin"; \
    COMP="none"; \
  fi; \
  $(TOPDIR)/scripts/mkits.sh \
    -D $(DEVICE_NAME) \
    -o $(KDIR)/chainload-fit-$(notdir $@)/u-boot.its \
    -k $$KERNEL \
    -C $$COMP \
    -a 0x80200000 -e 0x80200000 \
    -c conf-uboot \
    -A arm64 -v u-boot \
    -d $(STAGING_DIR_IMAGE)/an7581_$1-u-boot.dtb \
    -s 0x82000000
  PATH=$(LINUX_DIR)/scripts/dtc:$(PATH) \
    $(STAGING_DIR_HOST)/bin/mkimage \
    -D "-i $(KDIR)/chainload-fit-$(notdir $@)" \
    -f $(KDIR)/chainload-fit-$(notdir $@)/u-boot.its \
    $(STAGING_DIR_IMAGE)/an7581_$1-chainload-u-boot.itb
  cat $(STAGING_DIR_IMAGE)/an7581_$1-chainload-u-boot.itb >> $@
endef

define Device/FitImageLzma
	KERNEL_SUFFIX := -uImage.itb
	KERNEL = kernel-bin | lzma | fit lzma $$(KDIR)/image-$$(DEVICE_DTS).dtb
	KERNEL_NAME := Image
endef

define Device/airoha_an7581-evb
  $(call Device/FitImageLzma)
  DEVICE_VENDOR := Airoha
  DEVICE_MODEL := AN7581 Evaluation Board (SNAND)
  DEVICE_PACKAGES := kmod-leds-pwm kmod-pwm-airoha kmod-input-gpio-keys-polled
  DEVICE_DTS := an7581-evb
  DEVICE_DTS_CONFIG := config@1
  IMAGE/sysupgrade.bin := append-kernel | pad-to 128k | append-rootfs | pad-rootfs | append-metadata
  ARTIFACT/preloader.bin := an7581-preloader rfb
  ARTIFACT/bl31-uboot.fip := an7581-bl31-uboot rfb
  ARTIFACTS := preloader.bin bl31-uboot.fip
endef
TARGET_DEVICES += airoha_an7581-evb

define Device/airoha_an7581-evb-emmc-eagle
  DEVICE_VENDOR := Airoha
  DEVICE_MODEL := AN7581 Evaluation Board (eMMC + Eagle)
  DEVICE_DTS := an7581-evb-emmc-eagle
  DEVICE_PACKAGES := airoha-en7581-mt7996-npu-firmware \
		    kmod-mt7996-firmware wpad-openssl
  ARTIFACT/preloader.bin := an7581-preloader rfb
  ARTIFACT/bl31-uboot.fip := an7581-bl31-uboot rfb
  ARTIFACTS := preloader.bin bl31-uboot.fip
endef
TARGET_DEVICES += airoha_an7581-evb-emmc-eagle

define Device/airoha_an7581-evb-emmc-kite
  DEVICE_VENDOR := Airoha
  DEVICE_MODEL := AN7581 Evaluation Board (eMMC + Kite)
  DEVICE_DTS := an7581-evb-emmc-kite
  DEVICE_PACKAGES := airoha-en7581-npu-firmware \
		    kmod-mt7992-firmware wpad-openssl
  ARTIFACT/preloader.bin := an7581-preloader rfb
  ARTIFACT/bl31-uboot.fip := an7581-bl31-uboot rfb
  ARTIFACTS := preloader.bin bl31-uboot.fip
endef
TARGET_DEVICES += airoha_an7581-evb-emmc-kite

define Device/gemtek_w1700k-ubi
  DEVICE_VENDOR := Gemtek
  DEVICE_MODEL := W1700K
  DEVICE_VARIANT := UBI
  DEVICE_ALT0_VENDOR := CenturyLink
  DEVICE_ALT0_MODEL := W1700K
  DEVICE_ALT0_VARIANT := UBI
  DEVICE_ALT1_VENDOR := Lumen
  DEVICE_ALT1_MODEL := W1700K
  DEVICE_ALT1_VARIANT := UBI
  DEVICE_ALT2_VENDOR := Quantum Fiber
  DEVICE_ALT2_MODEL := W1700K
  DEVICE_ALT2_VARIANT := UBI
  DEVICE_DTS := an7581-w1700k-ubi
  DEVICE_COMPAT_VERSION := 2.0
  DEVICE_COMPAT_MESSAGE := Partition table has been changed to cooperate \
       with the vendor bootloader with regard to the BMT/BBT partition at \
       the end of flash. A reinstall including corrected chainloader is needed.
  DEVICE_PACKAGES := airoha-en7581-mt7996-npu-firmware airoha-an7581-mt7996-board fitblk \
		    kmod-hwmon-nct7802 kmod-mt7996-firmware wpad-openssl \
		    rtl826x-firmware rtl8261c-firmware
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | append-metadata
  ARTIFACTS := chainload-uboot.itb
  ARTIFACT/chainload-uboot.itb := an7581-chainloader gemtek_w1700k
  SOC := an7581
endef
TARGET_DEVICES += gemtek_w1700k-ubi

define Device/nokia_valyrian
  DEVICE_VENDOR := Nokia
  DEVICE_MODEL := Valyrian
  DEVICE_DTS := an7581-nokia-valyrian
  DEVICE_PACKAGES := kmod-spi-gpio kmod-gpio-nxp-74hc164 kmod-leds-gpio \
    kmod-i2c-gpio kmod-iio-richtek-rtq6056 \
    kmod-sfp aeonsemi-as21xxx-firmware \
    kmod-mt7996-firmware airoha-en7581-mt7996-npu-firmware \
    kmod-usb3
  ARTIFACT/preloader.bin := an7581-preloader nokia_valyrian
  ARTIFACT/bl31-uboot.fip := an7581-bl31-uboot nokia_valyrian
  ARTIFACTS := preloader.bin bl31-uboot.fip
endef
TARGET_DEVICES += nokia_valyrian

define Device/nokia_xg-040g-md-common
  $(call Device/FitImageLzma)
  DEVICE_VENDOR := Nokia
  DEVICE_MODEL := XG-040G-MD
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBINIZE_OPTS := -E 5
  DEVICE_PACKAGES := kmod-gpio-button-hotplug kmod-leds-gpio \
	kmod-phy-airoha-en8811h kmod-regulator-userspace-consumer \
	kmod-usb-ledtrig-usbport kmod-usb3 kmod-airoha-en7572 \
	kmod-airoha-xpon airoha-ponctl airoha-pond
endef

define Device/nokia_xg-040g-md
  $(call Device/nokia_xg-040g-md-common)
  DEVICE_DTS := an7581-nokia_xg-040g-md
  DEVICE_DTS_CONFIG := config@1
  IMAGE_SIZE := 131968k
  KERNEL_SIZE := 8192k
  IMAGES += factory-kernel.bin factory-rootfs.bin
  IMAGE/factory-kernel.bin := append-kernel
  IMAGE/factory-rootfs.bin := append-ubi | check-size
  IMAGE/sysupgrade.bin := sysupgrade-tar | append-metadata
endef
TARGET_DEVICES += nokia_xg-040g-md

define Device/nokia_xg-040g-md-ubi
  $(call Device/nokia_xg-040g-md-common)
  DEVICE_VARIANT := (UBI)
  DEVICE_DTS := an7581-nokia_xg-040g-md-ubi
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata
  DEVICE_PACKAGES += fitblk
  ARTIFACT/bl31-uboot.fip := an7581-bl31-uboot nokia_xg-040g-md
  ARTIFACT/preloader.bin := an7581-preloader nokia_xg-040g-md
  ARTIFACTS := bl31-uboot.fip preloader.bin
endef
TARGET_DEVICES += nokia_xg-040g-md-ubi

define Device/nokia_xg-040g-tf-common
  $(call Device/nokia_xg-040g-md-common)
  DEVICE_MODEL := XG-040G-TF
  DEVICE_PACKAGES += -kmod-regulator-userspace-consumer \
    -kmod-usb-ledtrig-usbport -kmod-usb3
endef

define Device/nokia_xg-040g-tf-ubi
  $(call Device/nokia_xg-040g-tf-common)
  DEVICE_VARIANT := (UBI)
  DEVICE_DTS := an7581-nokia_xg-040g-tf-ubi
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata
  DEVICE_PACKAGES += fitblk
endef
TARGET_DEVICES += nokia_xg-040g-tf-ubi

define Device/gemtek_xr1710g-common
  DEVICE_VENDOR := Gemtek
  DEVICE_MODEL := XR1710G
  DEVICE_PACKAGES := airoha-en7581-mt7996-npu-firmware airoha-an7581-mt7996-board \
		    kmod-nf-conntrack-bridge kmod-nft-bridge \
		    fitblk uboot-envtools \
		    kmod-hwmon-nct7802 kmod-mt7996-firmware wpad-mesh-mbedtls \
		    rtl826x-firmware px5g-mbedtls \
		    -kmod-airoha-tod -kmod-airoha-en7581-pcm-spi
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  IMAGE/sysupgrade.itb := append-kernel | fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | append-metadata
  SOC := an7581
endef

define Device/gemtek_xr1710g
  $(call Device/gemtek_xr1710g-common)
  DEVICE_ALT0_VENDOR := Brightspeed
  DEVICE_ALT0_MODEL := XR1710G
  SUPPORTED_DEVICES := gemtek,xr1710g
  DEVICE_DTS := an7581-xr1710g
endef
TARGET_DEVICES += gemtek_xr1710g

define Device/gemtek_xr1710g-ubi
  $(call Device/gemtek_xr1710g-common)
  DEVICE_MODEL := XR1710G (OpenWrt U-Boot UBI layout)
  DEVICE_ALT0_VENDOR := Brightspeed
  DEVICE_ALT0_MODEL := XR1710G (OpenWrt U-Boot UBI layout)
  SUPPORTED_DEVICES := gemtek,xr1710g-ubi
  DEVICE_DTS := an7581-gemtek-xr1710g-ubi
  DEVICE_COMPAT_VERSION := 2.0
  DEVICE_COMPAT_MESSAGE := Firmware requires the XR1710G OpenWrt U-Boot UBI layout \
       with bl2 at 0x00000000 and the UBI partition extending from \
       0x00020000 to the end of NAND. Restore the complete 2 MiB stock DSD \
       main-data image to the static factory volume before booting Linux.
endef
TARGET_DEVICES += gemtek_xr1710g-ubi

define Device/gemtek_xg2010g-common
  DEVICE_VENDOR := Gemtek
  DEVICE_COMPAT_VERSION := 2.0
  DEVICE_COMPAT_MESSAGE := Firmware requires the XG2010G OpenWrt U-Boot UBI layout \
       with bl2 at 0x00000000 and ubi starting at 0x00020000, containing \
       fip, ubootenv, ubootenv2, factory and fit. Do not force an upgrade from \
       the legacy 0x00600000 layout. Preserve bl2 and the boot/calibration volumes.
  DEVICE_PACKAGES := fitblk kmod-leds-gpio kmod-gpio-button-hotplug \
	kmod-phy-airoha-en8811h kmod-phy-realtek rtl826x-firmware \
	kmod-nf-conntrack-bridge kmod-nft-bridge \
	kmod-airoha-en7572 kmod-airoha-xpon airoha-ponctl airoha-pond \
	kmod-airoha-tod kmod-airoha-en7581-pcm-spi \
	-airoha-an7581-mt7996-board -airoha-en7581-mt7996-npu-firmware \
	-kmod-mac80211 -kmod-mt7996-firmware -kmod-mt7996e \
	-wpad-mbedtls -wpad-mesh-mbedtls -wireless-regdb
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBINIZE_OPTS := -E 5
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  IMAGES := sysupgrade.itb
  # The dynamic UBI fit volume is recreated to the uploaded image size.
  # The 128 MiB package limit is independent of UBI volume placement.
  IMAGE_SIZE := 131072k
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata | check-size
  SOC := an7581
endef

define Device/gemtek_xg2010g-ubi
  $(call Device/gemtek_xg2010g-common)
  DEVICE_MODEL := XG2010G
  DEVICE_VARIANT := UBI
  DEVICE_DTS := an7581-gemtek-xg2010g-ubi
  SUPPORTED_DEVICES := gemtek,xg2010g-ubi gemtek,xg2010g
endef
TARGET_DEVICES += gemtek_xg2010g-ubi

define Device/gemtek_xg2010g-2g-ubi
  $(call Device/gemtek_xg2010g-common)
  DEVICE_MODEL := XG2010G (2 GiB)
  DEVICE_VARIANT := UBI
  DEVICE_DTS := an7581-gemtek-xg2010g-2g-ubi
  SUPPORTED_DEVICES := gemtek,xg2010g-2g-ubi gemtek,xg2010g-2g
endef
TARGET_DEVICES += gemtek_xg2010g-2g-ubi

define Device/quantum_q1000k-ubi
  DEVICE_VENDOR := Quantum Fiber
  DEVICE_MODEL := Q1000K
  DEVICE_VARIANT := UBI
  DEVICE_ALT0_VENDOR := CenturyLink
  DEVICE_ALT0_MODEL := Q1000K
  DEVICE_ALT0_VARIANT := UBI
  DEVICE_ALT1_VENDOR := Lumen
  DEVICE_ALT1_MODEL := Q1000K
  DEVICE_ALT1_VARIANT := UBI
  DEVICE_DTS := an7581-q1000k
  DEVICE_PACKAGES := fitblk nand-utils rtl826x-firmware
  UBINIZE_OPTS := -E 5
  BLOCKSIZE := 128k
  PAGESIZE := 2048
  UBOOTENV_IN_UBI := 1
  KERNEL_IN_UBI := 1
  KERNEL := kernel-bin | gzip
  KERNEL_INITRAMFS := kernel-bin | lzma | \
	fit lzma $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb with-initrd | pad-to 128k
  KERNEL_INITRAMFS_SUFFIX := -recovery.itb
  IMAGES := sysupgrade.itb
  # Match the Q1000K HTTP recovery upload buffer (256 MiB).
  IMAGE_SIZE := 262144k
  IMAGE/sysupgrade.itb := append-kernel | \
	fit gzip $$(KDIR)/image-$$(firstword $$(DEVICE_DTS)).dtb external-static-with-rootfs | \
	append-metadata | check-size
  SOC := an7581
endef
TARGET_DEVICES += quantum_q1000k-ubi
