// SPDX-License-Identifier: GPL-2.0-only
#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <poll.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <time.h>
#include <unistd.h>

#include <linux/en75xx_voice.h>

#define PCM_PHYS_BASE 0x1fbd0000u
#define PCM_MAP_SIZE 0x1000u
#define PCM_IFACE_CTRL 0x00u
#define PCM_CTRL_LOOPBACK (1u << 25)
#define PCM_CTRL_CFG_VALID (1u << 26)
#define FRAME_BYTES 160u

static int64_t monotonic_ms(void)
{
	struct timespec ts;

	if (clock_gettime(CLOCK_MONOTONIC, &ts))
		return -1;
	return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

static void pcm_commit(volatile uint32_t *iface, uint32_t value)
{
	*iface = value & ~PCM_CTRL_CFG_VALID;
	__sync_synchronize();
	*iface = value | PCM_CTRL_CFG_VALID;
	__sync_synchronize();
}

int main(int argc, char **argv)
{
	const char *device = argc > 1 ? argv[1] : "/dev/en75xx-fxs0";
	uint8_t tx[FRAME_BYTES], rx[4096];
	uint64_t rx_bytes = 0, nonzero = 0, tx_bytes = 0;
	volatile uint32_t *iface;
	uint32_t linefeed = EN75XX_VOICE_LINEFEED_ACTIVE;
	uint32_t saved_iface;
	int64_t deadline;
	int memfd = -1, fd = -1, ret = 1;
	void *map = MAP_FAILED;
	unsigned int i;

	for (i = 0; i < FRAME_BYTES / 2; i++) {
		int16_t sample = (i & 1) ? (int16_t)0x35a7 : (int16_t)0xca59;

		tx[i * 2] = sample & 0xff;
		tx[i * 2 + 1] = (uint16_t)sample >> 8;
	}

	fd = open(device, O_RDWR | O_NONBLOCK | O_CLOEXEC);
	if (fd < 0) {
		perror(device);
		goto out;
	}
	if (ioctl(fd, EN75XX_VOICE_FLUSH)) {
		perror("FLUSH");
		goto out;
	}
	if (ioctl(fd, EN75XX_VOICE_SET_LINEFEED, &linefeed)) {
		perror("SET_LINEFEED active");
		goto out;
	}
	{
		struct timespec settle = { .tv_nsec = 100000000 };

		nanosleep(&settle, NULL);
	}
	if (ioctl(fd, EN75XX_VOICE_FLUSH)) {
		perror("FLUSH after PCM start");
		goto standby;
	}

	memfd = open("/dev/mem", O_RDWR | O_SYNC | O_CLOEXEC);
	if (memfd < 0) {
		perror("/dev/mem");
		goto standby;
	}
	map = mmap(NULL, PCM_MAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED,
		   memfd, PCM_PHYS_BASE);
	if (map == MAP_FAILED) {
		perror("mmap PCM");
		goto standby;
	}
	iface = (volatile uint32_t *)((uint8_t *)map + PCM_IFACE_CTRL);
	saved_iface = *iface;
	pcm_commit(iface, saved_iface | PCM_CTRL_LOOPBACK);
	printf("saved_iface=%#010x loopback_iface=%#010x\n",
	       saved_iface, *iface);

	deadline = monotonic_ms() + 3000;
	while (monotonic_ms() < deadline) {
		struct pollfd pfd = { .fd = fd, .events = POLLIN | POLLOUT };
		ssize_t len;

		if (poll(&pfd, 1, 50) < 0) {
			if (errno == EINTR)
				continue;
			perror("poll");
			goto restore;
		}
		if (pfd.revents & POLLOUT) {
			len = write(fd, tx, sizeof(tx));
			if (len > 0)
				tx_bytes += len;
			else if (len < 0 && errno != EAGAIN && errno != EINTR) {
				perror("write");
				goto restore;
			}
		}
		if (pfd.revents & POLLIN) {
			len = read(fd, rx, sizeof(rx));
			if (len > 0) {
				ssize_t byte;

				rx_bytes += len;
				for (byte = 0; byte < len; byte++)
					nonzero += rx[byte] != 0;
			} else if (len < 0 && errno != EAGAIN && errno != EINTR) {
				perror("read");
				goto restore;
			}
		}
	}
	ret = nonzero ? 0 : 2;

restore:
	pcm_commit(iface, saved_iface);
	printf("restored_iface=%#010x tx_bytes=%" PRIu64
	       " rx_bytes=%" PRIu64 " nonzero_bytes=%" PRIu64
	       " verdict=%s\n",
	       *iface, tx_bytes, rx_bytes, nonzero,
	       nonzero ? "NONZERO_LOOPBACK" : "ALL_ZERO_LOOPBACK");

standby:
	linefeed = EN75XX_VOICE_LINEFEED_STANDBY;
	if (ioctl(fd, EN75XX_VOICE_SET_LINEFEED, &linefeed))
		perror("SET_LINEFEED standby");

out:
	if (map != MAP_FAILED)
		munmap(map, PCM_MAP_SIZE);
	if (memfd >= 0)
		close(memfd);
	if (fd >= 0)
		close(fd);
	return ret;
}
