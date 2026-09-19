// SPDX-License-Identifier: GPL-2.0-only

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <unistd.h>

#ifndef O_CLOEXEC
#define O_CLOEXEC 0
#endif

#define DSD_DEFAULT_DEVICE "/dev/mtdblock2"
#define DSD_READ_SIZE 4096
#define DSD_MAX_PAIRS 32
#define DSD_KEY_SIZE 64
#define DSD_VALUE_SIZE 256

struct dsd_pair {
	char key[DSD_KEY_SIZE];
	char value[DSD_VALUE_SIZE];
};

static const char *dsd_device(void)
{
	const char *path = getenv("DSD_DEVICE");

	return path && path[0] ? path : DSD_DEFAULT_DEVICE;
}

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

static int parse_dsd(struct dsd_pair *pairs, size_t capacity,
			     const char *path)
{
	char buf[DSD_READ_SIZE];
	ssize_t bytes;
	int fd;
	size_t pos = 0;
	size_t count = 0;

	fd = open(path, O_RDONLY | O_CLOEXEC);
	if (fd < 0)
		return -errno;

	bytes = read(fd, buf, sizeof(buf));
	close(fd);
	if (bytes < 0)
		return -errno;

	while (pos < (size_t)bytes) {
		size_t start = pos;
		size_t len;
		char line[DSD_KEY_SIZE + DSD_VALUE_SIZE + 2];
		char *equals;
		char *key;
		char *value;

		while (pos < (size_t)bytes && buf[pos] != '\n' &&
		       buf[pos] != '\0' && (unsigned char)buf[pos] != 0xff)
			pos++;
		len = pos - start;
		while (pos < (size_t)bytes &&
		       (buf[pos] == '\n' || buf[pos] == '\0' ||
			(unsigned char)buf[pos] == 0xff))
			pos++;

		if (!len || len >= sizeof(line))
			continue;

		memcpy(line, buf + start, len);
		line[len] = '\0';
		if (line[len - 1] == '\r')
			line[len - 1] = '\0';

		equals = strchr(line, '=');
		if (!equals)
			continue;
		*equals = '\0';
		key = line;
		value = equals + 1;
		if (!valid_key(key) || strlen(key) >= DSD_KEY_SIZE ||
		    strlen(value) >= DSD_VALUE_SIZE)
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

static const struct dsd_pair *find_pair(const struct dsd_pair *pairs,
					 size_t count, const char *key)
{
	size_t i;

	for (i = 0; i < count; i++)
		if (!strcmp(pairs[i].key, key))
			return &pairs[i];

	return NULL;
}

static void print_shell_quoted(const char *value)
{
	const char *p;

	putchar('\'');
	for (p = value; *p; p++) {
		if (*p == '\'')
			fputs("'\\''", stdout);
		else
			putchar(*p);
	}
	putchar('\'');
}

static void usage(const char *prog)
{
	fprintf(stderr,
		"Usage: %s get <key>\n"
		"       %s get all\n"
		"       %s env\n"
		"       %s status\n",
		prog, prog, prog, prog);
}

int main(int argc, char **argv)
{
	struct dsd_pair pairs[DSD_MAX_PAIRS];
	const struct dsd_pair *pair;
	const char *path = dsd_device();
	int count;
	size_t i;

	if (argc != 2 && argc != 3) {
		usage(argv[0]);
		return 2;
	}

	count = parse_dsd(pairs, DSD_MAX_PAIRS, path);
	if (count < 0) {
		fprintf(stderr, "%s: %s: %s\n", argv[0], path, strerror(-count));
		return 1;
	}

	if (!strcmp(argv[1], "status")) {
		printf("device=%s\n", path);
		printf("available=1\n");
		printf("keys=%d\n", count);
		for (i = 0; i < (size_t)count; i++)
			printf("key=%s\n", pairs[i].key);
		return 0;
	}

	if (!strcmp(argv[1], "env")) {
		for (i = 0; i < (size_t)count; i++) {
			printf("export %s=", pairs[i].key);
			print_shell_quoted(pairs[i].value);
			putchar('\n');
		}
		return 0;
	}

	if (strcmp(argv[1], "get")) {
		usage(argv[0]);
		return 2;
	}

	if (!strcmp(argv[2], "all")) {
		for (i = 0; i < (size_t)count; i++)
			printf("%s=%s\n", pairs[i].key, pairs[i].value);
		return 0;
	}

	pair = find_pair(pairs, (size_t)count, argv[2]);
	if (!pair)
		return 1;

	puts(pair->value);
	return 0;
}
