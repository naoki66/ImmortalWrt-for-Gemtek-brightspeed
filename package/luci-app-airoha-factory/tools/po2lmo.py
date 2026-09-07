#!/usr/bin/env python3
# po2lmo.py — byte-compatible Python reimplementation of LuCI's po2lmo
# (modules/luci-base/src/po2lmo.c + lib/lmo.c), used to hot-deploy updated
# translations to a running device without a full firmware rebuild.
#
# Usage:
#   po2lmo.py input.po output.lmo     create lmo from po
#   po2lmo.py -d file.lmo             dump an existing lmo (index + values)
#
# LMO format (all u32 big-endian):
#   [ value strings, each NUL-padded to a 4-byte boundary ]
#   [ index entries, sorted by key hash: key_id, val_id, offset, length ]
#   [ u32: byte offset where the index starts ]
#
# Key hash = sfh_hash(msgid, init=len) — Paul Hsieh's hash as in lmo.c.
# Note: po2lmo keeps "\n" (backslash-n) LITERAL in keys/values; only \" and
# \\ are unescaped. Entries whose key hash equals the value hash (msgstr
# identical to msgid) are skipped, as is LuCI's behaviour.

import struct
import sys


def sfh_hash(data: bytes, init: int) -> int:
    """Paul Hsieh's SuperFastHash, ported from lmo.c."""
    length = len(data)
    if length <= 0:
        return 0
    h = init & 0xffffffff
    rem = length & 3
    n = length >> 2
    i = 0
    for _ in range(n):
        h = (h + (data[i] | (data[i + 1] << 8))) & 0xffffffff
        tmp = (((data[i + 2] | (data[i + 3] << 8)) << 11) ^ h) & 0xffffffff
        h = ((h << 16) ^ tmp) & 0xffffffff
        i += 4
        h = (h + (h >> 11)) & 0xffffffff
    if rem == 3:
        h = (h + (data[i] | (data[i + 1] << 8))) & 0xffffffff
        h ^= (h << 16) & 0xffffffff
        b = data[i + 2] - 256 if data[i + 2] >= 128 else data[i + 2]
        h = (h ^ ((b << 18) & 0xffffffff)) & 0xffffffff
        h = (h + (h >> 11)) & 0xffffffff
    elif rem == 2:
        h = (h + (data[i] | (data[i + 1] << 8))) & 0xffffffff
        h ^= (h << 11) & 0xffffffff
        h = (h + (h >> 17)) & 0xffffffff
    elif rem == 1:
        b = data[i] - 256 if data[i] >= 128 else data[i]
        h = (h + b) & 0xffffffff
        h ^= (h << 10) & 0xffffffff
        h = (h + (h >> 1)) & 0xffffffff
    h ^= (h << 3) & 0xffffffff
    h = (h + (h >> 5)) & 0xffffffff
    h ^= (h << 4) & 0xffffffff
    h = (h + (h >> 17)) & 0xffffffff
    h ^= (h << 25) & 0xffffffff
    h = (h + (h >> 6)) & 0xffffffff
    return h


def extract_string(line: str):
    """Port of extract_string() in po2lmo.c. Returns bytes or None."""
    if line.startswith('#'):
        return None
    out = bytearray()
    off = -1
    esc = False
    for pos, ch in enumerate(line):
        if off == -1:
            if ch == '"':
                off = pos + 1
            continue
        if esc:
            if ch not in ('"', '\\'):
                out += b'\\'  # keep the backslash (e.g. literal \n)
            # append the escaped char itself (skipping the backslash for " and \)
            try:
                out += ch.encode('utf-8')
            except UnicodeEncodeError:
                return None
            esc = False
        elif ch == '\\':
            out += b'\\'
            esc = True
        elif ch != '"':
            try:
                out += ch.encode('utf-8')
            except UnicodeEncodeError:
                return None
        else:
            break
    if off > -1:
        return bytes(out)
    return None


def parse_po(path: str):
    """Yield (msgid_bytes, msgstr_bytes) pairs, in file order."""
    msgid = None
    msgstr = None
    target = None  # 'id' or 'str'
    entries = []

    def flush():
        nonlocal msgid, msgstr
        if msgid is not None and msgstr is not None and len(msgstr) > 0:
            entries.append((bytes(msgid), bytes(msgstr)))
        msgid = None
        msgstr = None

    def assign(part):
        # like po2lmo.c: a line only contributes when extract_string() > 0;
        # an entirely empty field (e.g. the po header's msgid "") stays unset
        # so the header never becomes a translation entry.
        nonlocal msgid, msgstr
        if part is None or len(part) == 0:
            return
        if target == 'id':
            msgid = bytearray(part) if msgid is None else msgid + part
        else:
            msgstr = bytearray(part) if msgstr is None else msgstr + part

    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if line.startswith('msgctxt ') or line.startswith('msgid_plural '):
                # not used by our po files; treat as entry boundary
                flush()
                target = None
                continue
            if line.startswith('msgid '):
                flush()
                target = 'id'
                assign(extract_string(line))
                continue
            if line.startswith('msgstr'):
                target = 'str'
                assign(extract_string(line))
                continue
            # continuation line
            if target:
                assign(extract_string(line))
    flush()
    return entries


def build_lmo(entries):
    data = bytearray()
    index = []
    for msgid, msgstr in entries:
        key_id = sfh_hash(msgid, len(msgid))
        val_id = sfh_hash(msgstr, len(msgstr))
        if key_id == val_id:
            continue  # untranslated (msgstr == msgid): LuCI skips these
        index.append((key_id, 1, len(data), len(msgstr)))
        data += msgstr
        pad = (4 - (len(msgstr) % 4)) % 4
        data += b'\x00' * pad

    index.sort(key=lambda e: e[0])

    out = bytearray()
    out += data
    for key_id, val_id, offset, length in index:
        out += struct.pack('>IIII', key_id, val_id, offset, length)
    out += struct.pack('>I', len(data))
    return bytes(out)


def dump_lmo(path: str):
    raw = open(path, 'rb').read()
    (idx_offset,) = struct.unpack('>I', raw[-4:])
    n = (len(raw) - idx_offset - 4) // 16
    print(f"file: {len(raw)} bytes, index @{idx_offset}, {n} entries")
    for i in range(n):
        key_id, val_id, offset, length = struct.unpack(
            '>IIII', raw[idx_offset + i * 16: idx_offset + (i + 1) * 16])
        val = raw[offset:offset + length]
        print(f"  [{i:3d}] key={key_id:08x} val_id={val_id} off={offset:6d} len={length:3d} : {val.decode('utf-8', 'replace')}")


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '-d':
        dump_lmo(sys.argv[2])
        return
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.po output.lmo | -d file.lmo", file=sys.stderr)
        sys.exit(1)
    entries = parse_po(sys.argv[1])
    blob = build_lmo(entries)
    with open(sys.argv[2], 'wb') as f:
        f.write(blob)
    n = (len(blob) - 4 - struct.unpack('>I', blob[-4:])[0]) // 16
    print(f"wrote {sys.argv[2]}: {len(blob)} bytes, {n} entries from {len(entries)} po msgids")


if __name__ == '__main__':
    main()
