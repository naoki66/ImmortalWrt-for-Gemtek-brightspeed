// SPDX-License-Identifier: GPL-2.0-only

#include "airoha_dsd.h"

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#ifndef O_CLOEXEC
#define O_CLOEXEC 0
#endif

#define AIROHA_BOB_ECONET_OFFSET 0x14
#define AIROHA_BOB_EN7572_OFFSET 0x28

static int valid_key(const char *key)
{
	size_t i;

	if (!key[0] || !(key[0] == '_' ||
		(key[0] >= 'a' && key[0] <= 'z') ||
		(key[0] >= 'A' && key[0] <= 'Z')))
		return 0;

	for (i = 1; key[i]; i++) {
		if (!(key[i] == '_' ||
		      (key[i] >= 'a' && key[i] <= 'z') ||
		      (key[i] >= 'A' && key[i] <= 'Z') ||
		      (key[i] >= '0' && key[i] <= '9')))
			return 0;
	}

	return 1;
}

static int read_full(int fd, void *buffer, size_t length, off_t offset)
{
	unsigned char *cursor = buffer;
	size_t done = 0;

	while (done < length) {
		ssize_t bytes = pread(fd, cursor + done, length - done,
				      offset + (off_t)done);

		if (bytes < 0)
			return -errno;
		if (!bytes)
			return -EIO;
		done += (size_t)bytes;
	}

	return 0;
}

const char *airoha_dsd_device(void)
{
	const char *path = getenv("DSD_DEVICE");

	return path && path[0] ? path : AIROHA_DSD_DEFAULT_DEVICE;
}

const char *airoha_bob_path(void)
{
	const char *path = getenv("EN7572_BOB_PATH");

	return path && path[0] ? path : AIROHA_BOB_DEFAULT_PATH;
}

int airoha_dsd_read_pairs(struct airoha_dsd_pair *pairs, size_t capacity,
			  const char *path)
{
	char buffer[AIROHA_DSD_READ_SIZE];
	ssize_t bytes;
	size_t pos = 0;
	size_t count = 0;
	int fd;

	if (!pairs || !capacity || !path)
		return -EINVAL;

	fd = open(path, O_RDONLY | O_CLOEXEC);
	if (fd < 0)
		return -errno;

	bytes = read(fd, buffer, sizeof(buffer));
	close(fd);
	if (bytes < 0)
		return -errno;

	while (pos < (size_t)bytes) {
		size_t start = pos;
		size_t length;
		char line[AIROHA_DSD_KEY_SIZE + AIROHA_DSD_VALUE_SIZE + 2];
		char *equals;
		char *key;
		char *value;

		while (pos < (size_t)bytes && buffer[pos] != '\n' &&
		       buffer[pos] != '\0' &&
		       (unsigned char)buffer[pos] != 0xff)
			pos++;
		length = pos - start;
		while (pos < (size_t)bytes &&
		       (buffer[pos] == '\n' || buffer[pos] == '\0' ||
			(unsigned char)buffer[pos] == 0xff))
			pos++;

		if (!length || length >= sizeof(line))
			continue;

		memcpy(line, buffer + start, length);
		line[length] = '\0';
		if (line[length - 1] == '\r')
			line[length - 1] = '\0';

		equals = strchr(line, '=');
		if (!equals)
			continue;
		*equals = '\0';
		key = line;
		value = equals + 1;
		if (!valid_key(key) || strlen(key) >= AIROHA_DSD_KEY_SIZE ||
		    strlen(value) >= AIROHA_DSD_VALUE_SIZE)
			continue;
		if (count >= capacity)
			break;

		strncpy(pairs[count].key, key, sizeof(pairs[count].key) - 1);
		strncpy(pairs[count].value, value, sizeof(pairs[count].value) - 1);
		pairs[count].key[sizeof(pairs[count].key) - 1] = '\0';
		pairs[count].value[sizeof(pairs[count].value) - 1] = '\0';
		count++;
	}

	return (int)count;
}

const struct airoha_dsd_pair *
airoha_dsd_find_pair(const struct airoha_dsd_pair *pairs, size_t count,
		     const char *key)
{
	size_t i;

	if (!pairs || !key)
		return NULL;

	for (i = 0; i < count; i++)
		if (!strcmp(pairs[i].key, key))
			return &pairs[i];

	return NULL;
}

void airoha_dsd_print_shell_quoted(const char *value)
{
	const char *cursor;

	putchar('\'');
	for (cursor = value; *cursor; cursor++) {
		if (*cursor == '\'')
			fputs("'\\''", stdout);
		else
			putchar(*cursor);
	}
	putchar('\'');
}

int airoha_bob_validate(const unsigned char *bob, size_t len)
{
	static const unsigned char econet[] = "ECONET";
	static const unsigned char en7572[] = "EN7572";

	if (!bob || len != AIROHA_BOB_LENGTH)
		return -EINVAL;
	if (memcmp(bob + AIROHA_BOB_ECONET_OFFSET, econet,
		   sizeof(econet) - 1))
		return -ENODATA;
	if (memcmp(bob + AIROHA_BOB_EN7572_OFFSET, en7572,
		   sizeof(en7572) - 1))
		return -ENODATA;

	return 0;
}

int airoha_dsd_read_bob(unsigned char *bob, size_t len, const char *path)
{
	const char *offset_text = getenv("DSD_BOB_OFFSET");
	unsigned long long offset = AIROHA_BOB_DEFAULT_OFFSET;
	int fd;
	int ret;

	if (!bob || len != AIROHA_BOB_LENGTH || !path)
		return -EINVAL;

	if (offset_text && offset_text[0]) {
		char *end;

		errno = 0;
		offset = strtoull(offset_text, &end, 0);
		if (errno || *end || offset > (unsigned long long)LLONG_MAX)
			return -EINVAL;
	}

	fd = open(path, O_RDONLY | O_CLOEXEC);
	if (fd < 0)
		return -errno;

	ret = read_full(fd, bob, len, (off_t)offset);
	close(fd);
	if (ret)
		return ret;

	return airoha_bob_validate(bob, len);
}

int airoha_bob_write_atomic(const unsigned char *bob, size_t len,
			    const char *path)
{
	char temporary[PATH_MAX];
	int fd;
	int ret = 0;
	size_t done = 0;

	if (!bob || len != AIROHA_BOB_LENGTH || !path)
		return -EINVAL;
	if (snprintf(temporary, sizeof(temporary), "%s.tmp.%ld", path,
		     (long)getpid()) >= (int)sizeof(temporary))
		return -ENAMETOOLONG;

	fd = open(temporary, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0600);
	if (fd < 0)
		return -errno;

	while (done < len) {
		ssize_t bytes = write(fd, bob + done, len - done);

		if (bytes < 0) {
			ret = -errno;
			break;
		}
		if (!bytes) {
			ret = -EIO;
			break;
		}
		done += (size_t)bytes;
	}

	if (!ret && fsync(fd) < 0)
		ret = -errno;
	if (close(fd) < 0 && !ret)
		ret = -errno;
	if (ret) {
		unlink(temporary);
		return ret;
	}
	if (rename(temporary, path) < 0) {
		ret = -errno;
		unlink(temporary);
		return ret;
	}
	if (chmod(path, 0644) < 0)
		return -errno;

	return 0;
}
