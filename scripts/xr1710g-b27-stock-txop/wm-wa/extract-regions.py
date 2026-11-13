#!/usr/bin/env python3
"""Offline MT7996 region extraction for the four recorded samples only."""
from pathlib import Path
import argparse,hashlib,json,struct,subprocess
ap=argparse.ArgumentParser();ap.add_argument('--metadata',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);args=ap.parse_args();manifest=[]
for item in json.loads(args.metadata.read_text()):
 data=Path(item['path']).read_bytes();digest=hashlib.sha256(data).hexdigest();assert digest==item['sha256'],item['name']+' input hash mismatch'
 n=data[-34];assert n==len(item['regions']);table=len(data)-36-40*n;off=0;regions=[]
 for i,expected in enumerate(item['regions']):
  row=data[table+i*40:table+(i+1)*40];_,_,_,_,addr,length,feature,_=struct.unpack('<III4sIIB15s',row)
  assert addr==int(expected['addr'],16) and length==expected['length'];assert length>=16 and (length-16)%16==0;assert off+length<=table
  raw=data[off:off+length];payload,footer=raw[:-16],raw[-16:];assert footer[:12]==bytes(12)
  if feature&1:
   assert feature&0x16==0,'This tool only validates recorded key-index-0 CBC samples'
   plain=subprocess.run(['openssl','enc','-d','-aes-128-cbc','-K','0'*32,'-iv','0'*32,'-nopad'],input=payload,capture_output=True,check=True).stdout
  else:plain=payload
  path=args.out/item['name']/f'region{i:02d}_{addr:08x}.bin';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(plain)
  regions.append(dict(index=i,address=hex(addr),feature=hex(feature),payload_bytes=len(plain),payload_sha256=hashlib.sha256(plain).hexdigest(),footer_hex=footer.hex(),integrity='footer final word semantics not established; no checksum/signature validation claimed'));off+=length
 manifest.append(dict(name=item['name'],path=item['path'],sha256=digest,build=item['build'],regions=regions,build_tlv_hex=data[off:table].hex()))
args.out.mkdir(parents=True,exist_ok=True);(args.out/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Extracted',sum(len(i['regions']) for i in manifest),'regions; clear 16-byte footers excluded.')
