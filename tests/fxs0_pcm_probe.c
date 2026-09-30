// SPDX-License-Identifier: GPL-2.0-only
#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <math.h>
#include <poll.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <time.h>
#include <unistd.h>

#include <linux/en75xx_voice.h>

static int64_t monotonic_ms(void)
{
	struct timespec ts;

	if (clock_gettime(CLOCK_MONOTONIC, &ts)) {
		perror("clock_gettime");
		return -1;
	}
	return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

int main(int argc, char **argv)
{
	const char *device = argc > 1 ? argv[1] : "/dev/en75xx-fxs0";
	struct en75xx_voice_tone tone = {
		.freq1_hz = 770,
		.freq2_hz = 1336,
		.level_dbm = -18,
	};
	struct en75xx_voice_tone silence = { 0 };
	struct en75xx_voice_stats before = { 0 }, after = { 0 };
	uint32_t linefeed = EN75XX_VOICE_LINEFEED_ACTIVE;
	uint8_t buf[4096];
	uint64_t bytes = 0, samples = 0, nonzero = 0, square_sum = 0;
	unsigned int peak = 0;
	int64_t deadline;
	int fd, ret = 1;

	fd = open(device, O_RDWR | O_NONBLOCK | O_CLOEXEC);
	if (fd < 0) {
		perror(device);
		return 1;
	}
	if (ioctl(fd, EN75XX_VOICE_GET_STATS, &before)) {
		perror("GET_STATS before");
		goto out;
	}
	if (ioctl(fd, EN75XX_VOICE_SET_LINEFEED, &linefeed)) {
		perror("SET_LINEFEED active");
		goto out;
	}
	if (ioctl(fd, EN75XX_VOICE_FLUSH)) {
		perror("FLUSH");
		goto out;
	}
	if (ioctl(fd, EN75XX_VOICE_SET_TONE, &tone)) {
		perror("SET_TONE");
		goto out;
	}
	{
		struct timespec settle = { .tv_sec = 2 };

		puts("probe_ready=1 settle_ms=2000");
		nanosleep(&settle, NULL);
		if (ioctl(fd, EN75XX_VOICE_FLUSH)) {
			perror("FLUSH after settle");
			goto stop;
		}
	}

	deadline = monotonic_ms() + 3000;
	while (monotonic_ms() < deadline) {
		struct pollfd pfd = { .fd = fd, .events = POLLIN };
		ssize_t len;
		int i;

		if (poll(&pfd, 1, 100) < 0) {
			if (errno == EINTR)
				continue;
			perror("poll");
			goto stop;
		}
		if (!(pfd.revents & POLLIN))
			continue;
		len = read(fd, buf, sizeof(buf));
		if (len < 0) {
			if (errno == EAGAIN || errno == EINTR)
				continue;
			perror("read");
			goto stop;
		}
		bytes += len;
		for (i = 0; i + 1 < len; i += 2) {
			int16_t sample = (int16_t)(buf[i] | (buf[i + 1] << 8));
			unsigned int magnitude = sample < 0 ? -(int)sample : sample;

			if (magnitude > peak)
				peak = magnitude;
			square_sum += (int64_t)sample * sample;
			nonzero += sample != 0;
			samples++;
		}
	}
	ret = nonzero ? 0 : 2;

stop:
	if (ioctl(fd, EN75XX_VOICE_SET_TONE, &silence))
		perror("SET_TONE off");
	linefeed = EN75XX_VOICE_LINEFEED_STANDBY;
	if (ioctl(fd, EN75XX_VOICE_SET_LINEFEED, &linefeed))
		perror("SET_LINEFEED standby");
	if (ioctl(fd, EN75XX_VOICE_GET_STATS, &after))
		perror("GET_STATS after");

	printf("rx_bytes=%" PRIu64 " samples=%" PRIu64
	       " nonzero=%" PRIu64 " peak=%u rms=%.2f\n",
	       bytes, samples, nonzero, peak,
	       samples ? sqrt((double)square_sum / samples) : 0.0);
	printf("driver_rx_delta=%" PRIu64 " overruns_delta=%" PRIu64
	       " dma_errors_delta=%" PRIu64 " verdict=%s\n",
	       (uint64_t)(after.rx_bytes - before.rx_bytes),
	       (uint64_t)(after.rx_overruns - before.rx_overruns),
	       (uint64_t)(after.dma_errors - before.dma_errors),
	       nonzero ? "NONZERO_PCM" : "ALL_ZERO_PCM");

out:
	close(fd);
	return ret;
}
