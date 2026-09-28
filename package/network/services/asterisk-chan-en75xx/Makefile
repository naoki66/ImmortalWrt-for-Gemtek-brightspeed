# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=asterisk-chan-en75xx
PKG_RELEASE:=4

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/Sirherobrine23/airoha_voip.git
PKG_SOURCE_DATE:=2026-09-24
PKG_SOURCE_VERSION:=4222576d980856f3c9ffc323d2fd78a28f94f085
PKG_MIRROR_HASH:=00831f3a3261ba5c997188472d357d7d506f7e2689b573ac771159253c5cdb81

PKG_LICENSE:=GPL-2.0-only
PKG_BUILD_DEPENDS:=asterisk
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/asterisk-chan-en75xx
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Telephony
  TITLE:=Asterisk channel driver for Airoha EN75xx FXS
  DEPENDS:=+asterisk +asterisk-res-musiconhold \
	+kmod-airoha-en7581-pcm-spi
endef

define Package/asterisk-chan-en75xx/description
 Exposes /dev/en75xx-fxsN as Asterisk EN75XX channels, including analog
 hook, dial tone, DTMF, ringing, answer, hangup and 8 kHz PCM audio.
endef

define Package/asterisk-chan-en75xx/conffiles
/etc/asterisk/en75xx.conf
/etc/asterisk/extensions-en75xx.conf
endef

define Build/Compile
	cd $(PKG_BUILD_DIR)/asterisk && \
		$(TARGET_CC) -o chan_en75xx.o -c chan_en75xx.c \
			-pthread $(TARGET_CPPFLAGS) $(TARGET_CFLAGS) $(FPIC) \
			-I$(PKG_BUILD_DIR)/include/uapi \
			-I$(PKG_BUILD_DIR)/include/uapi/linux \
			-DAST_MODULE_SELF_SYM=__internal_chan_en75xx_self \
			-DAST_MODULE=\"chan_en75xx\" \
			-Wall -Wextra -Werror -Wno-unused-parameter && \
		$(TARGET_CC) -o chan_en75xx.so -shared -pthread \
			$(TARGET_LDFLAGS) chan_en75xx.o -lm
endef

define Package/asterisk-chan-en75xx/install
	$(INSTALL_DIR) $(1)/etc/asterisk
	$(INSTALL_DATA) ./files/en75xx.conf \
		$(1)/etc/asterisk/en75xx.conf
	$(INSTALL_DATA) ./files/extensions-en75xx.conf \
		$(1)/etc/asterisk/extensions-en75xx.conf
	$(INSTALL_DIR) $(1)/etc/hotplug.d/misc
	$(INSTALL_BIN) ./files/50-en75xx-fxs \
		$(1)/etc/hotplug.d/misc/50-en75xx-fxs
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/99-asterisk-en75xx \
		$(1)/etc/uci-defaults/99-asterisk-en75xx
	$(INSTALL_DIR) $(1)/usr/lib/asterisk/modules
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/asterisk/chan_en75xx.so \
		$(1)/usr/lib/asterisk/modules/
endef

$(eval $(call BuildPackage,asterisk-chan-en75xx))
