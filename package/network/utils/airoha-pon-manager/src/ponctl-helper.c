// SPDX-License-Identifier: GPL-2.0-only

#include <errno.h>
#include <fcntl.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/wait.h>
#include <unistd.h>

#define EPON_IOCTL_SET_LLID_ENABLE_MASK 1
#define EPON_IOCTL_SET_LLID_TX_FEC 6
#define EPON_IOCTL_SET_LLID_RX_FEC 8
#define EPON_IOCTL_SET_LLID_MAC 10
#define EPON_IOCTL_SET_DYING_GASP_MODE 29
#define EPON_IOCTL_SET_EPON_MODE 40

#define PON_IOCTL_WAN_LINK_START     0x4000da20UL
#define PON_IOCTL_WAN_DETECTION_MODE 0x4000da21UL
#define PON_IOCTL_WAN_LINK_CONFIG    0x8000da22UL
#define PON_WAN_MODE_MAX             12U

#define LINK_MODE_EPON "2"
#define STATIC_ASSERT(cond, name) typedef char static_assert_##name[(cond) ? 1 : -1]

struct epon_mac_ioctl {
	uint8_t llidIndex;
	uint8_t param0;
	uint16_t param1;
	uint32_t param2;
	uint8_t info[128];
};

STATIC_ASSERT(offsetof(struct epon_mac_ioctl, llidIndex) == 0, epon_llid_index_offset);
STATIC_ASSERT(offsetof(struct epon_mac_ioctl, param0) == 1, epon_param0_offset);
STATIC_ASSERT(offsetof(struct epon_mac_ioctl, param1) == 2, epon_param1_offset);
STATIC_ASSERT(offsetof(struct epon_mac_ioctl, param2) == 4, epon_param2_offset);
STATIC_ASSERT(offsetof(struct epon_mac_ioctl, info) == 8, epon_info_offset);
STATIC_ASSERT(sizeof(struct epon_mac_ioctl) == 136, epon_ioctl_size);

/* Matches the SDK WAN_LINKCFG_t / XMCS_WanLinkConfig_S ABI. */
struct pon_wan_link_config {
	uint32_t link_start;
	uint32_t detect_mode;
	uint32_t link_status;
};

STATIC_ASSERT(sizeof(struct pon_wan_link_config) == 12, pon_wan_link_config_size);

static void usage(void)
{
	fprintf(stderr,
		"Usage:\n"
		"  ponctl-helper gpon-sn <serial> <password> <ascii|hex>\n"
		"  ponctl-helper gpon-loid <serial-or-> <loid> <password>\n"
		"  ponctl-helper epon-loid <loid> <password>\n"
		"  ponctl-helper epon-llid-mask <mask>\n"
		"  ponctl-helper epon-mac <llid-index> <mac>\n"
		"  ponctl-helper epon-tx-fec <llid-index> <0|1>\n"
		"  ponctl-helper epon-rx-fec <llid-index> <0|1>\n"
		"  ponctl-helper epon-dying-gasp <0|1>\n"
		"  ponctl-helper epon-rate-mode <0|1|2>\n"
		"  ponctl-helper mode <0..12>\n");
}

static int run_path(const char *path, char *const argv[])
{
	pid_t pid = fork();
	int status;

	if (pid < 0) {
		perror("fork");
		return 1;
	}

	if (pid == 0) {
		execv(path, argv);
		_exit(errno == ENOENT ? 127 : 126);
	}

	if (waitpid(pid, &status, 0) < 0) {
		perror("waitpid");
		return 1;
	}

	if (!WIFEXITED(status))
		return 1;

	return WEXITSTATUS(status);
}

static int run_vendor(const char *name, char *const args[])
{
	char path[128];
	static const char *dirs[] = {
		"/userfs/bin",
		"/usr/sbin",
		"/usr/bin",
		"/bin",
	};
	size_t i;
	int ret = 127;

	for (i = 0; i < sizeof(dirs) / sizeof(dirs[0]); i++) {
		snprintf(path, sizeof(path), "%s/%s", dirs[i], name);
		if (access(path, X_OK) != 0)
			continue;
		ret = run_path(path, args);
		if (ret != 127)
			return ret;
	}

	fprintf(stderr, "%s not found in vendor command paths\n", name);
	return ret;
}

static int parse_u32(const char *text, uint32_t *out)
{
	char *end;
	unsigned long value;

	errno = 0;
	value = strtoul(text, &end, 0);
	if (errno || *end != '\0' || value > UINT32_MAX)
		return -1;

	*out = (uint32_t)value;
	return 0;
}

static int parse_u8(const char *text, uint8_t *out)
{
	uint32_t value;

	if (parse_u32(text, &value) || value > UINT8_MAX)
		return -1;

	*out = (uint8_t)value;
	return 0;
}

static int hex_nibble(char c)
{
	if (c >= '0' && c <= '9')
		return c - '0';
	if (c >= 'a' && c <= 'f')
		return c - 'a' + 10;
	if (c >= 'A' && c <= 'F')
		return c - 'A' + 10;
	return -1;
}

static int parse_mac(const char *text, uint8_t mac[6])
{
	int i;

	for (i = 0; i < 6; i++) {
		int hi = hex_nibble(text[0]);
		int lo = hex_nibble(text[1]);

		if (hi < 0 || lo < 0)
			return -1;

		mac[i] = (uint8_t)((hi << 4) | lo);
		text += 2;

		if (i == 5)
			break;

		if (*text == ':' || *text == '-')
			text++;
		else if (*text != '\0' && hex_nibble(*text) >= 0)
			continue;
		else
			return -1;
	}

	return *text == '\0' ? 0 : -1;
}

static int epon_ioctl(unsigned int cmd, struct epon_mac_ioctl *data)
{
	int fd = open("/dev/epon_mac", O_RDWR);
	int ret;

	if (fd < 0) {
		perror("/dev/epon_mac");
		return 1;
	}

	ret = ioctl(fd, cmd, data);
	if (ret < 0) {
		perror("epon ioctl");
		close(fd);
		return 1;
	}

	close(fd);
	return ret == 0 ? 0 : 1;
}

static int pon_ioctl_value(int fd, unsigned long cmd, uint32_t value,
			   const char *name)
{
	if (ioctl(fd, cmd, (unsigned long)value) < 0) {
		fprintf(stderr, "%s ioctl failed: %s\n", name, strerror(errno));
		return -1;
	}

	return 0;
}

static int pon_get_link_config(int fd, struct pon_wan_link_config *config)
{
	memset(config, 0, sizeof(*config));
	if (ioctl(fd, PON_IOCTL_WAN_LINK_CONFIG, config) < 0) {
		fprintf(stderr, "WAN_LINK_CONFIG ioctl failed: %s\n", strerror(errno));
		return -1;
	}

	return 0;
}

static void pon_restore_link(int fd, const struct pon_wan_link_config *old)
{
	(void)pon_ioctl_value(fd, PON_IOCTL_WAN_LINK_START, 0, "WAN_LINK_START");
	if (old->detect_mode <= PON_WAN_MODE_MAX)
		(void)pon_ioctl_value(fd, PON_IOCTL_WAN_DETECTION_MODE,
				      old->detect_mode, "WAN_DETECTION_MODE");
	(void)pon_ioctl_value(fd, PON_IOCTL_WAN_LINK_START,
			      old->link_start ? 1U : 0U, "WAN_LINK_START");
}

static int cmd_pon_mode(int argc, char **argv)
{
	struct pon_wan_link_config old_config;
	struct pon_wan_link_config new_config = { 0 };
	uint32_t desired_mode;
	int fd;
	int old_started;
	int ret = 1;

	if (argc != 3 || parse_u32(argv[2], &desired_mode) ||
	    desired_mode > PON_WAN_MODE_MAX) {
		usage();
		return 1;
	}

	fd = open("/dev/pon", O_RDWR);
	if (fd < 0) {
		perror("/dev/pon");
		return 1;
	}

	if (pon_get_link_config(fd, &old_config))
		goto out;

	old_started = old_config.link_start == 1U;
	if (old_started && old_config.detect_mode == desired_mode) {
		printf("PON mode already active: mode=%u link_start=%u link_status=%u\n",
		       old_config.detect_mode, old_config.link_start,
		       old_config.link_status);
		ret = 0;
		goto out;
	}

	/* The SDK ignores detection changes while sysStartup is PON_WAN_START. */
	if (pon_ioctl_value(fd, PON_IOCTL_WAN_LINK_START, 0,
			    "WAN_LINK_START"))
		goto out;
	if (pon_ioctl_value(fd, PON_IOCTL_WAN_DETECTION_MODE, desired_mode,
			    "WAN_DETECTION_MODE")) {
		pon_restore_link(fd, &old_config);
		goto out;
	}
	if (pon_ioctl_value(fd, PON_IOCTL_WAN_LINK_START, 1,
			    "WAN_LINK_START")) {
		pon_restore_link(fd, &old_config);
		goto out;
	}

	if (pon_get_link_config(fd, &new_config) ||
	    new_config.detect_mode != desired_mode ||
	    new_config.link_start != 1U) {
		fprintf(stderr,
			"PON mode verification failed: requested=%u got_mode=%u link_start=%u\n",
			desired_mode, new_config.detect_mode, new_config.link_start);
		pon_restore_link(fd, &old_config);
		goto out;
	}

	printf("PON mode switched: mode=%u link_start=%u link_status=%u\n",
	       new_config.detect_mode, new_config.link_start,
	       new_config.link_status);
	ret = 0;

out:
	close(fd);
	return ret;
}

static int gpon_sn(const char *serial, const char *password, const char *format)
{
	char *sn_args[] = { "omcicfgCmd", "set", "sn", (char *)serial, NULL };
	char *pw_ascii[] = { "omcicfgCmd", "set", "passwdAscii", (char *)password, NULL };
	char *pw_hex[] = { "omcicfgCmd", "set", "passwdHex", (char *)password, NULL };
	int ret;

	ret = run_vendor("omcicfgCmd", sn_args);
	if (ret)
		return ret;

	if (strcmp(format, "hex") == 0)
		return run_vendor("omcicfgCmd", pw_hex);
	if (strcmp(format, "ascii") == 0)
		return run_vendor("omcicfgCmd", pw_ascii);

	fprintf(stderr, "unsupported GPON password format: %s\n", format);
	return 1;
}

static int gpon_loid(const char *serial, const char *loid, const char *password)
{
	char *sn_args[] = { "omcicfgCmd", "set", "sn", (char *)serial, NULL };
	char *loid_args[] = { "omcicfgCmd", "set", "loid", (char *)loid, NULL };
	char *pw_args[] = { "omcicfgCmd", "set", "loidPasswd", (char *)password, NULL };
	int ret;

	if (strcmp(serial, "-") != 0 && serial[0] != '\0') {
		ret = run_vendor("omcicfgCmd", sn_args);
		if (ret)
			return ret;
	}

	ret = run_vendor("omcicfgCmd", loid_args);
	if (ret)
		return ret;

	return run_vendor("omcicfgCmd", pw_args);
}

static int epon_loid(const char *loid, const char *password)
{
	char *mode_args[] = { "oamcfgCmd", "set", "mode", LINK_MODE_EPON, NULL };
	char *loid_args[] = { "oamcfgCmd", "set", "loid0", (char *)loid, NULL };
	char *pw_args[] = { "oamcfgCmd", "set", "loidPasswd0", (char *)password, NULL };
	int ret;

	ret = run_vendor("oamcfgCmd", mode_args);
	if (ret)
		return ret;

	ret = run_vendor("oamcfgCmd", loid_args);
	if (ret)
		return ret;

	return run_vendor("oamcfgCmd", pw_args);
}

static int cmd_epon_mac(int argc, char **argv)
{
	struct epon_mac_ioctl data = { 0 };

	if (argc != 4 || parse_u8(argv[2], &data.llidIndex) ||
	    parse_mac(argv[3], data.info)) {
		usage();
		return 1;
	}

	return epon_ioctl(EPON_IOCTL_SET_LLID_MAC, &data);
}

static int cmd_epon_u8(int argc, char **argv, unsigned int cmd)
{
	struct epon_mac_ioctl data = { 0 };

	if (argc != 4 || parse_u8(argv[2], &data.llidIndex) ||
	    parse_u8(argv[3], &data.param0)) {
		usage();
		return 1;
	}

	return epon_ioctl(cmd, &data);
}

static int cmd_epon_param0(int argc, char **argv, unsigned int cmd)
{
	struct epon_mac_ioctl data = { 0 };

	if (argc != 3 || parse_u8(argv[2], &data.param0)) {
		usage();
		return 1;
	}

	return epon_ioctl(cmd, &data);
}

static int cmd_epon_param2(int argc, char **argv, unsigned int cmd)
{
	struct epon_mac_ioctl data = { 0 };

	if (argc != 3 || parse_u32(argv[2], &data.param2)) {
		usage();
		return 1;
	}

	return epon_ioctl(cmd, &data);
}

int main(int argc, char **argv)
{
	if (argc < 2) {
		usage();
		return 1;
	}

	if (strcmp(argv[1], "gpon-sn") == 0) {
		if (argc != 5) {
			usage();
			return 1;
		}
		return gpon_sn(argv[2], argv[3], argv[4]);
	}

	if (strcmp(argv[1], "gpon-loid") == 0) {
		if (argc != 5) {
			usage();
			return 1;
		}
		return gpon_loid(argv[2], argv[3], argv[4]);
	}

	if (strcmp(argv[1], "epon-loid") == 0) {
		if (argc != 4) {
			usage();
			return 1;
		}
		return epon_loid(argv[2], argv[3]);
	}

	if (strcmp(argv[1], "epon-llid-mask") == 0)
		return cmd_epon_param2(argc, argv, EPON_IOCTL_SET_LLID_ENABLE_MASK);
	if (strcmp(argv[1], "epon-mac") == 0)
		return cmd_epon_mac(argc, argv);
	if (strcmp(argv[1], "epon-tx-fec") == 0)
		return cmd_epon_u8(argc, argv, EPON_IOCTL_SET_LLID_TX_FEC);
	if (strcmp(argv[1], "epon-rx-fec") == 0)
		return cmd_epon_u8(argc, argv, EPON_IOCTL_SET_LLID_RX_FEC);
	if (strcmp(argv[1], "epon-dying-gasp") == 0)
		return cmd_epon_param0(argc, argv, EPON_IOCTL_SET_DYING_GASP_MODE);
	if (strcmp(argv[1], "epon-rate-mode") == 0)
		return cmd_epon_param0(argc, argv, EPON_IOCTL_SET_EPON_MODE);
	if (strcmp(argv[1], "mode") == 0)
		return cmd_pon_mode(argc, argv);

	usage();
	return 1;
}
