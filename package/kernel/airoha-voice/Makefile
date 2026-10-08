# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=airoha-voice
PKG_RELEASE:=27

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/Sirherobrine23/airoha_voip.git
PKG_SOURCE_DATE:=2026-09-24
PKG_SOURCE_VERSION:=4222576d980856f3c9ffc323d2fd78a28f94f085
PKG_MIRROR_HASH:=1bb5ccf053b1f3f0ebd8dbb3680a792312d119f2dee62658aa813689eba77588

PKG_LICENSE:=GPL-2.0-only AND LicenseRef-Proprietary
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define KernelPackage/airoha-en7581-pcm-spi
  SUBMENU:=Voice over IP
  TITLE:=Airoha EN7581 single-SLIC voice stack
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi||TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-2g-ubi
  FILES:= \
	$(PKG_BUILD_DIR)/src/en75xx-lec.ko \
	$(PKG_BUILD_DIR)/src/en75xx-pcm.ko \
	$(PKG_BUILD_DIR)/src/en75xx-voice.ko \
	$(PKG_BUILD_DIR)/src/en75xx-isi-spi.ko \
	$(PKG_BUILD_DIR)/src/en75xx-slic-si3219x.ko
  AUTOLOAD:=$(call AutoLoad,50,en75xx-lec en75xx-pcm en75xx-voice en75xx-isi-spi en75xx-slic-si3219x)
endef

define KernelPackage/airoha-en7581-pcm-spi/description
 Complete XG2010G EN7581 voice stack: PCM DMA, ISI transport, one Si32192
 ProSLIC FXS line, line control, hook/ring handling and /dev/en75xx-fxs0.
endef

define Package/airoha-voice-ctl
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Telephony
  TITLE:=Airoha EN75xx FXS diagnostic utility
  DEPENDS:=+kmod-airoha-en7581-pcm-spi
endef

define Package/airoha-voice-ctl/description
 Inspect and control EN75xx FXS line state through the stable voice UAPI.
 Read-only commands are suitable for bring-up; ringing and tone generation
 require an explicit command.
endef

define KernelPackage/airoha-en7581-pcm-spi/install
	$(INSTALL_DIR) $(1)/lib/firmware/en75xx/proslic
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/firmware/proslic/si3219x_a_lcqc.fw \
		$(1)/lib/firmware/en75xx/proslic/
endef

define Build/Compile
	+$(KERNEL_MAKE) $(PKG_JOBS) M="$(PKG_BUILD_DIR)/src" modules
	$(TARGET_CC) $(TARGET_CPPFLAGS) $(TARGET_CFLAGS) \
		-Wall -Wextra -Werror \
		-I$(PKG_BUILD_DIR)/include/uapi \
		-o $(PKG_BUILD_DIR)/airoha-voice-ctl \
		$(CURDIR)/files/airoha-voice-ctl.c \
		$(TARGET_LDFLAGS)
endef

define Package/airoha-voice-ctl/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/airoha-voice-ctl $(1)/usr/sbin/
endef

$(eval $(call KernelPackage,airoha-en7581-pcm-spi))
$(eval $(call BuildPackage,airoha-voice-ctl))
