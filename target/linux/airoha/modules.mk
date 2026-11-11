# SPDX-License-Identifier: GPL-2.0-only

OTHER_MENU:=Other modules


define KernelPackage/pwm-airoha
  SUBMENU:=$(OTHER_MENU)
  TITLE:=Airoha AN7581 and AN7583 PWM
  DEPENDS:=@TARGET_airoha_an7581||TARGET_airoha_an7583
  KCONFIG:= \
        CONFIG_PWM=y \
        CONFIG_PWM_AIROHA=y
  FILES:= \
        $(LINUX_DIR)/drivers/pwm/pwm-airoha.ko
  AUTOLOAD:=$(call AutoProbe,pwm-airoha)
endef

define KernelPackage/pwm-airoha/description
 Kernel module to use the PWM channel on Airoha SoC
endef

$(eval $(call KernelPackage,pwm-airoha))

define KernelPackage/airoha-tod
  SUBMENU:=$(OTHER_MENU)
  TITLE:=Airoha EN7581 ToD PTP hardware clock
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi||TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-2g-ubi
  KCONFIG:= \
        CONFIG_PTP_1588_CLOCK=y \
        CONFIG_PTP_1588_CLOCK_OPTIONAL=y \
        CONFIG_NET_PTP_CLASSIFY=y \
        CONFIG_PTP_1588_CLOCK_AIROHA_TOD=m
  FILES:=$(LINUX_DIR)/drivers/ptp/ptp_airoha_tod.ko
  AUTOLOAD:=$(call AutoProbe,ptp_airoha_tod)
endef

define KernelPackage/airoha-tod/description
 Linux PHC driver for the Airoha EN7581 Time of Day generator.
endef

$(eval $(call KernelPackage,airoha-tod))

define KernelPackage/crypto-hw-airoha-eip93
  SUBMENU:=Cryptographic API modules
  TITLE:=Airoha EIP93 crypto accelerator
  CONFLICTS:=kmod-crypto-hw-eip93
  DEPENDS:=@TARGET_airoha_an7581||TARGET_airoha_an7583 +kmod-crypto-authenc +kmod-crypto-des +kmod-crypto-md5 +kmod-crypto-hmac +kmod-crypto-sha1 +kmod-crypto-sha256 +kmod-crypto-cbc +kmod-crypto-ctr +kmod-crypto-gcm +kmod-crypto-user
  KCONFIG:=CONFIG_CRYPTO_HW=y CONFIG_CRYPTO_DEV_EIP93 \
    CONFIG_CRYPTO_DEV_EIP93_GENERIC_SW_MAX_LEN=256 \
    CONFIG_CRYPTO_DEV_EIP93_AES_128_SW_MAX_LEN=512
  FILES:= \
    $(LINUX_DIR)/drivers/crypto/airoha-eip93/crypto-hw-eip93.ko@lt6.18 \
    $(LINUX_DIR)/drivers/crypto/inside-secure/eip93/crypto-hw-eip93.ko@ge6.18
  AUTOLOAD:=$(call AutoProbe,crypto-hw-eip93)
endef

define KernelPackage/crypto-hw-airoha-eip93/description
 Hardware AES ECB/CBC/CTR, DES/3DES and hash acceleration for
 Airoha AN7581/AN7583. EIP93 does not require an external firmware blob.
 AES-GCM uses kernel CTR/GHASH composition. Native authenc is withheld.
endef
$(eval $(call KernelPackage,crypto-hw-airoha-eip93))
