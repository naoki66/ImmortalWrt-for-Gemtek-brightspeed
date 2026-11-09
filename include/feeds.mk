# SPDX-License-Identifier: GPL-2.0-only
#
# Copyright (C) 2014 OpenWrt.org
# Copyright (C) 2016 LEDE Project

-include $(TMP_DIR)/.packageauxvars

FEEDS_INSTALLED:=$(notdir $(wildcard $(TOPDIR)/package/feeds/*))
FEEDS_AVAILABLE=$(eval FEEDS_AVAILABLE:=$(sort $(FEEDS_INSTALLED) $(shell $(SCRIPT_DIR)/feeds list -n 2>/dev/null)))$(FEEDS_AVAILABLE)

PACKAGE_SUBDIRS=$(PACKAGE_DIR)
ifneq ($(CONFIG_PER_FEED_REPO),)
  PACKAGE_SUBDIRS += $(OUTPUT_DIR)/packages/$(ARCH_PACKAGES)/base
  PACKAGE_SUBDIRS += $(foreach FEED,$(FEEDS_AVAILABLE),$(OUTPUT_DIR)/packages/$(ARCH_PACKAGES)/$(FEED))
endif

opkg_package_files = $(wildcard \
	$(foreach dir,$(PACKAGE_SUBDIRS), \
	  $(foreach pkg,$(1), $(dir)/$(pkg)_*.ipk)))

apk_package_files = $(wildcard \
	$(foreach dir,$(PACKAGE_SUBDIRS), \
	  $(foreach pkg,$(1), $(dir)/$(pkg)*.apk)))

# 1: package name
define FeedPackageDir
$(strip $(if $(CONFIG_PER_FEED_REPO), \
  $(if $(Package/$(1)/subdir), \
    $(abspath $(OUTPUT_DIR)/packages/$(ARCH_PACKAGES)/$(Package/$(1)/subdir)), \
    $(PACKAGE_DIR)), \
  $(PACKAGE_DIR)))
endef

# Feed names that exist as packages/<arch>/<feed>/packages.adb on the public
# OpenWrt/ImmortalWrt snapshot trees (and mirrors of those trees, including
# mirrors.vsean.net). "base", the target index, and buildbot kmods are
# emitted separately and are not part of this list.
#
# feeds.conf.default also pulls third-party git feeds (app_airoha, easytier,
# glass, helloworld, luci_app_bandix, onu_config, openwrt_bandix, pon_drivers,
# pon_userspace, pushbot, and any later addition). Those sources are compiled
# into the image. They are not published next to the official feeds, so a
# device that lists them fetches HTML 404 instead of packages.adb and
# `apk update` fails (wget exit 8 / unexpected EOF). Keep them out of
# distfeeds. A private index belongs in /etc/apk/repositories.d/customfeeds.list.
DISTFEEDS_FEEDS := packages luci routing telephony video

# Subset of FEEDS_AVAILABLE that is safe to write into distfeeds. Recursive
# so FEEDS_AVAILABLE's feeds.conf scan still runs on first use.
FEEDS_DISTFEED = $(filter $(DISTFEEDS_FEEDS),$(FEEDS_AVAILABLE))

# 1: destination file
define FeedSourcesAppendOPKG
( \
  echo 'src/gz %d_core %U/targets/%S/packages'; \
  $(strip $(if $(CONFIG_PER_FEED_REPO), \
	echo 'src/gz %d_base %U/packages/%A/base'; \
	$(if $(CONFIG_BUILDBOT), \
		echo 'src/gz %d_kmods %U/targets/%S/kmods/$(LINUX_VERSION)-$(LINUX_RELEASE)-$(LINUX_VERMAGIC)';) \
	$(foreach feed,$(FEEDS_DISTFEED), \
		$(if $(CONFIG_FEED_$(feed)), \
			echo '$(if $(filter m,$(CONFIG_FEED_$(feed))),# )src/gz %d_$(feed) %U/packages/%A/$(feed)';)))) \
) >> $(1)
endef

# 1: destination file
define FeedSourcesAppendAPK
( \
  echo '# This file is auto-generated and build-specific, any changes will be intentionally lost in sysupgrade.'; \
  echo '# Add your custom feeds to /etc/apk/repositories.d/customfeeds.list'; \
  echo '%U/targets/%S/packages/packages.adb'; \
  $(strip $(if $(CONFIG_PER_FEED_REPO), \
	echo '%U/packages/%A/base/packages.adb'; \
	$(if $(CONFIG_BUILDBOT), \
		echo '%U/targets/%S/kmods/$(LINUX_VERSION)-$(LINUX_RELEASE)-$(LINUX_VERMAGIC)/packages.adb';) \
	$(foreach feed,$(FEEDS_DISTFEED), \
		$(if $(CONFIG_FEED_$(feed)), \
			echo '$(if $(filter m,$(CONFIG_FEED_$(feed))),# )%U/packages/%A/$(feed)/packages.adb';)))) \
) >> $(1)
endef

# 1: package name
define GetABISuffix
$(if $(ABIV_$(1)),$(ABIV_$(1)),$(call FormatABISuffix,$(1),$(foreach v,$(wildcard $(STAGING_DIR)/pkginfo/$(1).version),$(shell cat $(v)))))
endef

# 1: package name
# 2: abi version
define FormatABISuffix
$(if $(filter-out kmod-%,$(1)),$(if $(2),$(if $(filter %0 %1 %2 %3 %4 %5 %6 %7 %8 %9,$(1)),-)$(2)))
endef
