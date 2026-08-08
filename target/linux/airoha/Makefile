include $(TOPDIR)/rules.mk

ARCH:=arm
BOARD:=airoha
BOARDNAME:=Airoha ARM
SUBTARGETS:=en7523 an7581 an7583
FEATURES:=dt squashfs nand ramdisk gpio

KERNEL_PATCHVER:=6.18

include $(INCLUDE_DIR)/target.mk
# 将 NPU 固件目录 symlink 到内核源码树，供 CONFIG_EXTRA_FIRMWARE 使用
define Kernel/Prepare
	$(call Kernel/Prepare/Default)
	ln -sf $(TOPDIR)/target/linux/airoha/an7581/firmware $(LINUX_DIR)/firmware
endef

DEFAULT_PACKAGES += \
	kmod-leds-gpio kmod-gpio-button-hotplug

$(eval $(call BuildTarget))
