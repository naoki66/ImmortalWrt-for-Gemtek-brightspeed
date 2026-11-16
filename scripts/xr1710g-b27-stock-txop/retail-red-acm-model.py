#!/usr/bin/env python3
"""Offline reconstruction of the retail ACM_TOKEN_CONFIG command, never transmits."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

RETAIL_SHA256 = '04c2b073664d471b6d557bfde46cc191f53303aeb3a0b29cacbe4a08d2e4ddf0'

def retail_drop_table(module):
    data = Path(module).read_bytes()
    if hashlib.sha256(data).hexdigest() != RETAIL_SHA256:
        raise ValueError('Only the verified retail 5.1.1.12 module is accepted')
    if data[:6] != b'\x7fELF\x02\x01':
        raise ValueError('Expected little-endian ELF64')
    shoff = struct.unpack_from('<Q', data, 40)[0]
    stride, count, names = struct.unpack_from('<HHH', data, 58)
    sections = [struct.unpack_from('<IIQQQQIIQQ', data, shoff + i * stride)
                for i in range(count)]
    ns = sections[names]
    strings = data[ns[4]:ns[4] + ns[5]]
    for sec in sections:
        end = strings.index(0, sec[0])
        if strings[sec[0]:end] != b'.rodata':
            continue
        # red_init 0x339c38..3c + 0x339d80: .rodata+0x284c0+0x68.
        values = struct.unpack_from('<32I', data, sec[4] + 0x28528)
        if any(n > 100 for n in values):
            raise ValueError('Unexpected retail drop thresholds')
        return [list(values[i:i+8]) for i in range(0, 32, 8)]
    raise ValueError('Missing .rodata')

def acm_token_config(tokens, software_tokens, drop_table):
    if len(tokens) != 4 or any(not 0 <= n <= 65535 for n in tokens):
        raise ValueError('Four u16 source token counts are required')
    if not 1 <= software_tokens <= 16384:
        raise ValueError('Software token count must be 1..16384')
    if len(drop_table) != 4 or any(len(row) != 8 for row in drop_table):
        raise ValueError('Expected 4x8 drop table')
    bounded = [n if 1 <= n <= 16384 else 16384 for n in tokens]
    effective = bounded[:]
    effective[3] = software_tokens
    cmd = bytearray(632)
    struct.pack_into('<BB4xH', cmd, 0, 2, 0, len(cmd))
    struct.pack_into('<HH', cmd, 8, 200, 255)
    struct.pack_into('<4H', cmd, 12, *effective)
    struct.pack_into('<4H', cmd, 20, *bounded)
    full = [15, 30, 45, 60, 75, 95, 100, 107]
    for band in range(4):
        struct.pack_into('<8H', cmd, 28 + band * 16, *full)
        struct.pack_into('<8H', cmd, 92 + band * 16, *drop_table[band])
    # Retail binary initializes 3 physical bands and 4 ACs; fifth queue and
    # fourth table row remain zero. Public SDK dimensions alone miss this.
    for band in range(3):
        for base in (156, 196):
            struct.pack_into('<4H', cmd, base + band * 10, 900, 1500, 1900, 1900)
    # Zero STA count, padding, 34 bitmap words and 256 per-STA bytes.
    return struct.pack('<III', 0x40, 0, 0) + cmd

def selftest():
    drops = [[0] * 8 for _ in range(4)]
    p = acm_token_config([0, 20000, 8192, 16384], 8192, drops)
    assert len(p) == 644 and struct.unpack_from('<III', p) == (64, 0, 0)
    c = p[12:]
    assert struct.unpack_from('<BB4xH', c) == (2, 0, 632)
    assert struct.unpack_from('<HH', c, 8) == (200, 255)
    assert struct.unpack_from('<4H', c, 12) == (16384, 16384, 8192, 8192)
    assert struct.unpack_from('<4H', c, 20) == (16384, 16384, 8192, 16384)
    for band in range(4):
        assert struct.unpack_from('<8H', c, 28+16*band) == (15,30,45,60,75,95,100,107)
        for base in (156, 196):
            assert struct.unpack_from('<5H', c, base+10*band) == ((900,1500,1900,1900,0) if band<3 else (0,0,0,0,0))
    assert not any(c[236:])
    for t, sw in [([1]*3,1),([-1]*4,1),([65536]*4,1),([1]*4,0),([1]*4,16385)]:
        try:
            acm_token_config(t,sw,drops)
        except ValueError:
            continue
        raise AssertionError((t,sw))
    print('PASS: retail ACM 632-byte layout, 12-byte WA prefix, source clamping, separate software pool, four threshold rows, three active-band tail-drop rows and zeroed STA controls')

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--selftest',action='store_true')
    ap.add_argument('--module',type=Path)
    ap.add_argument('--tokens',help='Four decimal source capacities; these must be supplied, not inferred')
    ap.add_argument('--software-tokens',type=int)
    ap.add_argument('--output',type=Path)
    a=ap.parse_args()
    if a.selftest:
        selftest()
        return
    if a.module is None or a.tokens is None or a.software_tokens is None or a.output is None:
        ap.error('--module, --tokens, --software-tokens and --output are required')
    tokens=[int(n) for n in a.tokens.split(',')]
    drops=retail_drop_table(a.module)
    payload=acm_token_config(tokens,a.software_tokens,drops)
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/'retail-acm-candidate-WA-payload.bin').write_bytes(payload)
    report={'status':'offline reconstruction only; not sent to router',
            'module_sha256':RETAIL_SHA256,'input_source_capacities':tokens,
            'input_software_capacity':a.software_tokens,'drop_table':drops,
            'acm_length':632,'wa_parameter_prefix_length':12,
            'payload_sha256':hashlib.sha256(payload).hexdigest(),
            'runtime_acceptance_verified':False,'current_NPU_source_mapping_verified':False,
            'retail_initialization_order':['WM VOW tag 0x18 value 2','WA parameter 0x0e value 1','WA parameter 0x40 + ACM_TOKEN_CONFIG','WA packet budget NORMAL'],
            'notes':['20000/15000/20000us are host defaults; initialization does not prove that a separate WA target-delay command is sent.',
                     'The original send routine returns success even when the nested transmit fails; that behavior must not be copied.',
                     'This is not an implemented or enabled RED/ACM port in mt76.']}
    (a.output/'retail-acm-candidate.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    main()
