# SPDX-License-Identifier: GPL-2.0-only

OTHER_MENU:=Other modules


define KernelPackage/pwm-airoha
  SUBMENU:=$(OTHER_MENU)
  TITLE:=Airoha AN7581 and AN7583 PWM
  DEPENDS:=@TARGET_airoha_an7581||TARGET_airoha_an7583
  KCONFIG:= \
        CONFIG_PWM=y \
        CONFIG_PWM_AIROHA=y \
        CONFIG_PWM_SYSFS=y
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
  DEPENDS:=@TARGET_airoha_an7581_DEVICE_gemtek_xg2010g-ubi
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
