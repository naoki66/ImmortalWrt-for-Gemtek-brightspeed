// SPDX-License-Identifier: GPL-2.0-only

#include "airoha_dsd.h"

#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

static void usage(const char *prog)
{
	fprintf(stderr,
		"Usage: %s get bob nodual\n"
		"       %s del bob nodual\n"
		"       %s get dsd <key|all>\n"
		"       %s status bob\n",
		prog, prog, prog, prog);
}

static int print_dsd(const char *key)
{
	struct airoha_dsd_pair pairs[AIROHA_DSD_MAX_PAIRS];
	const struct airoha_dsd_pair *pair;
	int count;
	size_t i;

	count = airoha_dsd_read_pairs(pairs, AIROHA_DSD_MAX_PAIRS,
				      airoha_dsd_device());
	if (count < 0)
		return count;

	if (!strcmp(key, "all")) {
		for (i = 0; i < (size_t)count; i++)
			printf("%s=%s\n", pairs[i].key, pairs[i].value);
		return 0;
	}

	pair = airoha_dsd_find_pair(pairs, (size_t)count, key);
	if (!pair)
		return -ENOENT;

	puts(pair->value);
	return 0;
}

static int get_bob(void)
{
	unsigned char bob[AIROHA_BOB_LENGTH];
	int ret;

	ret = airoha_dsd_read_bob(bob, sizeof(bob), airoha_dsd_device());
	if (ret)
		return ret;

	return airoha_bob_write_atomic(bob, sizeof(bob), airoha_bob_path());
}

static int del_bob(void)
{
	if (unlink(airoha_bob_path()) < 0 && errno != ENOENT)
		return -errno;

	return 0;
}

static int status_bob(void)
{
	struct stat st;
	const char *path = airoha_bob_path();

	printf("path=%s\n", path);
	if (stat(path, &st) < 0) {
		if (errno == ENOENT) {
			printf("present=0\n");
			return 0;
		}
		return -errno;
	}

	printf("present=1\n");
	printf("size=%lld\n", (long long)st.st_size);
	printf("mode=%04o\n", (unsigned int)(st.st_mode & 07777));
	return 0;
}

int main(int argc, char **argv)
{
	int ret;

	if (argc < 2 || argc > 4) {
		usage(argv[0]);
		return 2;
	}

	if (!strcmp(argv[1], "get") && argc == 4 &&
	    !strcmp(argv[2], "bob") && !strcmp(argv[3], "nodual")) {
		ret = get_bob();
	} else if (!strcmp(argv[1], "del") && argc == 4 &&
		   !strcmp(argv[2], "bob") && !strcmp(argv[3], "nodual")) {
		ret = del_bob();
	} else if (!strcmp(argv[1], "get") && argc == 4 &&
		   !strcmp(argv[2], "dsd")) {
		ret = print_dsd(argv[3]);
	} else if (!strcmp(argv[1], "status") && argc == 3 &&
		   !strcmp(argv[2], "bob")) {
		ret = status_bob();
	} else {
		usage(argv[0]);
		return 2;
	}

	if (ret) {
		fprintf(stderr, "%s: %s\n", argv[0], strerror(-ret));
		return 1;
	}

	return 0;
}
