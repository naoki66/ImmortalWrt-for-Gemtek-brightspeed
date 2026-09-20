/* SPDX-License-Identifier: GPL-2.0-only */
#ifndef AIROHA_DSD_H
#define AIROHA_DSD_H

#include <stddef.h>

#define AIROHA_DSD_DEFAULT_DEVICE "/dev/mtdblock2"
#define AIROHA_DSD_READ_SIZE 4096
#define AIROHA_DSD_MAX_PAIRS 32
#define AIROHA_DSD_KEY_SIZE 64
#define AIROHA_DSD_VALUE_SIZE 256

#define AIROHA_BOB_DEFAULT_PATH "/etc/lddla/en7572_bob.conf"
#define AIROHA_BOB_DEFAULT_OFFSET 0x12000
#define AIROHA_BOB_LENGTH 512

struct airoha_dsd_pair {
	char key[AIROHA_DSD_KEY_SIZE];
	char value[AIROHA_DSD_VALUE_SIZE];
};

const char *airoha_dsd_device(void);
const char *airoha_bob_path(void);

int airoha_dsd_read_pairs(struct airoha_dsd_pair *pairs, size_t capacity,
			  const char *path);
const struct airoha_dsd_pair *
airoha_dsd_find_pair(const struct airoha_dsd_pair *pairs, size_t count,
		     const char *key);
void airoha_dsd_print_shell_quoted(const char *value);

int airoha_bob_validate(const unsigned char *bob, size_t len);
int airoha_dsd_read_bob(unsigned char *bob, size_t len, const char *path);
int airoha_bob_write_atomic(const unsigned char *bob, size_t len,
			    const char *path);

#endif
