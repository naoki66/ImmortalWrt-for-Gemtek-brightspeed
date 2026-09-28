// SPDX-License-Identifier: GPL-2.0-only

#include <errno.h>
#include <fcntl.h>
#include <linux/en75xx_voice.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>

static volatile sig_atomic_t stop_requested;

static void handle_signal(int signo)
{
	(void)signo;
	stop_requested = 1;
}

static void usage(FILE *stream, const char *prog)
{
	fprintf(stream,
		"Usage: %s [-d DEVICE] COMMAND [ARGS]\n"
		"Commands:\n"
		"  info\n"
		"  state\n"
		"  stats\n"
		"  watch\n"
		"  pcm-check [FRAMES]\n"
		"  linefeed open|standby|active|reverse\n"
		"  ring on [ON_MS OFF_MS] | ring off\n"
		"  tone FREQ1 [FREQ2 [LEVEL_DBM [ON_MS OFF_MS]]] | tone off\n"
		"  flush\n",
		prog);
}

static int parse_u32(const char *text, uint32_t *value)
{
	char *end;
	unsigned long parsed;

	errno = 0;
	parsed = strtoul(text, &end, 0);
	if (errno || !text[0] || *end || parsed > UINT32_MAX)
		return -1;
	*value = (uint32_t)parsed;
	return 0;
}

static int parse_s32(const char *text, int32_t *value)
{
	char *end;
	long parsed;

	errno = 0;
	parsed = strtol(text, &end, 0);
	if (errno || !text[0] || *end || parsed < INT32_MIN ||
	    parsed > INT32_MAX)
		return -1;
	*value = (int32_t)parsed;
	return 0;
}

static const char *hook_name(uint32_t hook)
{
	return hook == EN75XX_VOICE_OFFHOOK ? "off-hook" : "on-hook";
}

static const char *linefeed_name(uint32_t linefeed)
{
	switch (linefeed) {
	case EN75XX_VOICE_LINEFEED_OPEN:
		return "open";
	case EN75XX_VOICE_LINEFEED_STANDBY:
		return "standby";
	case EN75XX_VOICE_LINEFEED_ACTIVE:
		return "active";
	case EN75XX_VOICE_LINEFEED_REVERSE:
		return "reverse";
	default:
		return "unknown";
	}
}

static int get_state(int fd, struct en75xx_voice_line_state *state)
{
	if (ioctl(fd, EN75XX_VOICE_GET_STATE, state) < 0) {
		perror("EN75XX_VOICE_GET_STATE");
		return -1;
	}
	return 0;
}

static void print_state(const struct en75xx_voice_line_state *state)
{
	printf("hook=%s linefeed=%s ringing=%s faults=0x%08x\n",
	       hook_name(state->hook), linefeed_name(state->linefeed),
	       state->ringing ? "yes" : "no", state->faults);
}

static int command_info(int fd)
{
	struct en75xx_voice_info info = {};

	if (ioctl(fd, EN75XX_VOICE_GET_INFO, &info) < 0) {
		perror("EN75XX_VOICE_GET_INFO");
		return -1;
	}

	printf("abi=%u line=%u pcm_channel=%u slic=%s\n",
	       info.abi_version, info.line, info.pcm_channel, info.slic);
	printf("rate=%u sample_bits=%u frame_samples=%u frame_bytes=%u\n",
	       info.sample_rate, info.sample_bits, info.frame_samples,
	       info.frame_samples * (info.sample_bits / 8));
	printf("capabilities=0x%08x ring=%u hook=%u linefeed=%u pcm=%u tone=%u\n",
	       info.capabilities,
	       !!(info.capabilities & EN75XX_VOICE_CAP_RING),
	       !!(info.capabilities & EN75XX_VOICE_CAP_HOOK),
	       !!(info.capabilities & EN75XX_VOICE_CAP_LINEFEED),
	       !!(info.capabilities & EN75XX_VOICE_CAP_PCM),
	       !!(info.capabilities & EN75XX_VOICE_CAP_TONE));
	return 0;
}

static int command_stats(int fd)
{
	struct en75xx_voice_stats stats = {};

	if (ioctl(fd, EN75XX_VOICE_GET_STATS, &stats) < 0) {
		perror("EN75XX_VOICE_GET_STATS");
		return -1;
	}

	printf("rx_bytes=%llu tx_bytes=%llu rx_overruns=%llu "
	       "tx_underruns=%llu hook_changes=%llu dma_errors=%llu\n",
	       (unsigned long long)stats.rx_bytes,
	       (unsigned long long)stats.tx_bytes,
	       (unsigned long long)stats.rx_overruns,
	       (unsigned long long)stats.tx_underruns,
	       (unsigned long long)stats.hook_changes,
	       (unsigned long long)stats.dma_errors);
	return 0;
}

static int command_watch(int fd)
{
	struct en75xx_voice_line_state state = {};
	struct pollfd pfd = {
		.fd = fd,
		.events = POLLPRI,
	};

	signal(SIGINT, handle_signal);
	signal(SIGTERM, handle_signal);

	if (get_state(fd, &state))
		return -1;
	print_state(&state);

	while (!stop_requested) {
		int ret = poll(&pfd, 1, 1000);

		if (ret < 0) {
			if (errno == EINTR)
				continue;
			perror("poll");
			return -1;
		}
		if (ret && (pfd.revents & (POLLPRI | POLLERR))) {
			if (get_state(fd, &state))
				return -1;
			print_state(&state);
			fflush(stdout);
		}
	}
	return 0;
}

static int command_pcm_check(int fd, int argc, char **argv)
{
	struct en75xx_voice_stats before = {};
	struct en75xx_voice_stats after = {};
	uint8_t capture[EN75XX_VOICE_FRAME_BYTES];
	uint8_t silence[EN75XX_VOICE_FRAME_BYTES] = {};
	uint32_t target = 100;
	uint32_t rx_frames = 0;
	uint32_t tx_frames = 0;
	unsigned int idle_polls = 0;
	int flags;

	if (argc > 1 || (argc == 1 && parse_u32(argv[0], &target)) ||
	    !target || target > 60000) {
		fprintf(stderr, "FRAMES must be between 1 and 60000\n");
		return -1;
	}
	if (ioctl(fd, EN75XX_VOICE_GET_STATS, &before) < 0) {
		perror("EN75XX_VOICE_GET_STATS");
		return -1;
	}
	flags = fcntl(fd, F_GETFL);
	if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
		perror("fcntl");
		return -1;
	}

	while (rx_frames < target || tx_frames < target) {
		struct pollfd pfd = {
			.fd = fd,
			.events = POLLIN | POLLOUT,
		};
		int ret = poll(&pfd, 1, 1000);

		if (ret < 0) {
			if (errno == EINTR)
				continue;
			perror("poll");
			return -1;
		}
		if (!ret) {
			if (++idle_polls >= 3) {
				fprintf(stderr, "PCM timed out after %u RX and %u TX frames\n",
					rx_frames, tx_frames);
				return -1;
			}
			continue;
		}
		idle_polls = 0;
		if (pfd.revents & (POLLERR | POLLHUP | POLLNVAL)) {
			fprintf(stderr, "PCM poll failed: revents=0x%x\n", pfd.revents);
			return -1;
		}
		if (rx_frames < target && (pfd.revents & POLLIN)) {
			ssize_t n = read(fd, capture, sizeof(capture));

			if (n == (ssize_t)sizeof(capture))
				rx_frames++;
			else if (n < 0 && errno != EAGAIN)
				return perror("read"), -1;
			else if (n >= 0) {
				fprintf(stderr, "short PCM read: %zd bytes\n", n);
				return -1;
			}
		}
		if (tx_frames < target && (pfd.revents & POLLOUT)) {
			ssize_t n = write(fd, silence, sizeof(silence));

			if (n == (ssize_t)sizeof(silence))
				tx_frames++;
			else if (n < 0 && errno != EAGAIN)
				return perror("write"), -1;
			else if (n >= 0) {
				fprintf(stderr, "short PCM write: %zd bytes\n", n);
				return -1;
			}
		}
	}

	if (ioctl(fd, EN75XX_VOICE_GET_STATS, &after) < 0) {
		perror("EN75XX_VOICE_GET_STATS");
		return -1;
	}
	printf("pcm_check=ok rx_frames=%u tx_frames=%u "
	       "rx_bytes_delta=%llu tx_bytes_delta=%llu dma_errors_delta=%llu\n",
	       rx_frames, tx_frames,
	       (unsigned long long)(after.rx_bytes - before.rx_bytes),
	       (unsigned long long)(after.tx_bytes - before.tx_bytes),
	       (unsigned long long)(after.dma_errors - before.dma_errors));
	return 0;
}

static int command_linefeed(int fd, const char *name)
{
	uint32_t linefeed;

	if (!strcmp(name, "open"))
		linefeed = EN75XX_VOICE_LINEFEED_OPEN;
	else if (!strcmp(name, "standby"))
		linefeed = EN75XX_VOICE_LINEFEED_STANDBY;
	else if (!strcmp(name, "active"))
		linefeed = EN75XX_VOICE_LINEFEED_ACTIVE;
	else if (!strcmp(name, "reverse"))
		linefeed = EN75XX_VOICE_LINEFEED_REVERSE;
	else {
		fprintf(stderr, "invalid linefeed state: %s\n", name);
		return -1;
	}

	if (ioctl(fd, EN75XX_VOICE_SET_LINEFEED, &linefeed) < 0) {
		perror("EN75XX_VOICE_SET_LINEFEED");
		return -1;
	}
	return 0;
}

static int command_ring(int fd, int argc, char **argv)
{
	struct en75xx_voice_ring ring = {};

	if (argc < 1)
		return -1;
	if (!strcmp(argv[0], "off")) {
		ring.enable = 0;
	} else if (!strcmp(argv[0], "on")) {
		ring.enable = 1;
		ring.cadence_on_ms = 1000;
		ring.cadence_off_ms = 4000;
		if (argc == 3 &&
		    (parse_u32(argv[1], &ring.cadence_on_ms) ||
		     parse_u32(argv[2], &ring.cadence_off_ms))) {
			fprintf(stderr, "invalid ring cadence\n");
			return -1;
		}
		if (argc != 1 && argc != 3)
			return -1;
	} else {
		return -1;
	}

	if (ioctl(fd, EN75XX_VOICE_SET_RING, &ring) < 0) {
		perror("EN75XX_VOICE_SET_RING");
		return -1;
	}
	return 0;
}

static int command_tone(int fd, int argc, char **argv)
{
	struct en75xx_voice_tone tone = {
		.level_dbm = -18,
	};

	if (argc < 1)
		return -1;
	if (!strcmp(argv[0], "off")) {
		if (argc != 1)
			return -1;
	} else if (parse_u32(argv[0], &tone.freq1_hz)) {
		return -1;
	}
	if (argc > 1 && parse_u32(argv[1], &tone.freq2_hz))
		return -1;
	if (argc > 2 && parse_s32(argv[2], &tone.level_dbm))
		return -1;
	if (argc > 3 && parse_u32(argv[3], &tone.on_ms))
		return -1;
	if (argc > 4 && parse_u32(argv[4], &tone.off_ms))
		return -1;
	if (argc > 5 || tone.level_dbm > 0)
		return -1;

	if (ioctl(fd, EN75XX_VOICE_SET_TONE, &tone) < 0) {
		perror("EN75XX_VOICE_SET_TONE");
		return -1;
	}
	return 0;
}

int main(int argc, char **argv)
{
	const char *device = "/dev/en75xx-fxs0";
	const char *command;
	int argi = 1;
	int fd;
	int ret = -1;

	if (argc > 3 && !strcmp(argv[argi], "-d")) {
		device = argv[argi + 1];
		argi += 2;
	}
	if (argi >= argc) {
		usage(stderr, argv[0]);
		return EXIT_FAILURE;
	}
	command = argv[argi++];

	fd = open(device, O_RDWR | O_CLOEXEC);
	if (fd < 0) {
		fprintf(stderr, "cannot open %s: %s\n", device, strerror(errno));
		return EXIT_FAILURE;
	}

	if (!strcmp(command, "info") && argi == argc)
		ret = command_info(fd);
	else if (!strcmp(command, "state") && argi == argc) {
		struct en75xx_voice_line_state state = {};

		ret = get_state(fd, &state);
		if (!ret)
			print_state(&state);
	} else if (!strcmp(command, "stats") && argi == argc)
		ret = command_stats(fd);
	else if (!strcmp(command, "watch") && argi == argc)
		ret = command_watch(fd);
	else if (!strcmp(command, "pcm-check"))
		ret = command_pcm_check(fd, argc - argi, &argv[argi]);
	else if (!strcmp(command, "linefeed") && argi + 1 == argc)
		ret = command_linefeed(fd, argv[argi]);
	else if (!strcmp(command, "ring"))
		ret = command_ring(fd, argc - argi, &argv[argi]);
	else if (!strcmp(command, "tone"))
		ret = command_tone(fd, argc - argi, &argv[argi]);
	else if (!strcmp(command, "flush") && argi == argc) {
		ret = ioctl(fd, EN75XX_VOICE_FLUSH);
		if (ret < 0)
			perror("EN75XX_VOICE_FLUSH");
	} else {
		usage(stderr, argv[0]);
	}

	close(fd);
	return ret ? EXIT_FAILURE : EXIT_SUCCESS;
}
