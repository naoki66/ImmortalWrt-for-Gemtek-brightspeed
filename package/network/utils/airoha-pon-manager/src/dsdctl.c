// SPDX-License-Identifier: GPL-2.0-only

#include "airoha_dsd.h"

#include <errno.h>
#include <stdio.h>
#include <string.h>

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
	struct airoha_dsd_pair pairs[AIROHA_DSD_MAX_PAIRS];
	const struct airoha_dsd_pair *pair;
	const char *path = airoha_dsd_device();
	int count;
	size_t i;

	if (argc < 2 || argc > 3) {
		usage(argv[0]);
		return 2;
	}

	count = airoha_dsd_read_pairs(pairs, AIROHA_DSD_MAX_PAIRS, path);
	if (count < 0) {
		fprintf(stderr, "%s: %s: %s\n", argv[0], path, strerror(-count));
		return 1;
	}

	if (!strcmp(argv[1], "status")) {
		if (argc != 2) {
			usage(argv[0]);
			return 2;
		}
		printf("device=%s\n", path);
		printf("available=1\n");
		printf("keys=%d\n", count);
		for (i = 0; i < (size_t)count; i++)
			printf("key=%s\n", pairs[i].key);
		return 0;
	}

	if (!strcmp(argv[1], "env")) {
		if (argc != 2) {
			usage(argv[0]);
			return 2;
		}
		for (i = 0; i < (size_t)count; i++) {
			printf("export %s=", pairs[i].key);
			airoha_dsd_print_shell_quoted(pairs[i].value);
			putchar('\n');
		}
		return 0;
	}

	if (strcmp(argv[1], "get") || argc != 3) {
		usage(argv[0]);
		return 2;
	}

	if (!strcmp(argv[2], "all")) {
		for (i = 0; i < (size_t)count; i++)
			printf("%s=%s\n", pairs[i].key, pairs[i].value);
		return 0;
	}

	pair = airoha_dsd_find_pair(pairs, (size_t)count, argv[2]);
	if (!pair)
		return 1;

	puts(pair->value);
	return 0;
}
