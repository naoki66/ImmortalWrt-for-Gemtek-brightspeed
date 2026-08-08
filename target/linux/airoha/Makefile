include $(TOPDIR)/rules.mk

ARCH:=arm
BOARD:=airoha
BOARDNAME:=Airoha ARM
SUBTARGETS:=en7523 an7581 an7583
FEATURES:=dt squashfs nand ramdisk gpio

KERNEL_PATCHVER:=6.18

include $(INCLUDE_DIR)/target.mk

# Ensure NPU firmware is accessible in kernel source tree for CONFIG_EXTRA_FIRMWARE
define Kernel/Configure
	$(call Kernel/Configure/Default)
	mkdir -p $(LINUX_DIR)/firmware
	rm -rf $(LINUX_DIR)/firmware/airoha
	ln -sf $(TOPDIR)/target/linux/airoha/an7581/firmware/airoha $(LINUX_DIR)/firmware/airoha
endef


DEFAULT_PACKAGES += \
	kmod-leds-gpio kmod-gpio-button-hotplug

$(eval $(call BuildTarget))
