#!/usr/bin/env python3
"""Extract XR1710G retail SkuTableIdx=3 tables; requires pyelftools.
Usage: python3 extract.py mt_wifi.ko output-directory
No EEPROM or router writes. Output is board ceilings in half-dBm.
"""
from pathlib import Path
import hashlib,json,sys
from elftools.elf.elffile import ELFFile

def convert(module,out):
    out.mkdir(parents=True,exist_ok=True)
    digest=lambda b:hashlib.sha256(b).hexdigest()
    records={}; arrays={}
    with module.open('rb') as f:
        e=ELFFile(f);sy=e.get_section_by_name('.symtab')
        for name in ['Sku_04','Backoff_04']:
            s=sy.get_symbol_by_name(name)[0];sec=e.get_section(s['st_shndx'])
            data=sec.data()[s['st_value']:s['st_value']+s['st_size']]
            assert len(data)==117*496,(name,len(data))
            arrays[name]=data
            records[name]={'section':sec.name,'section_offset':s['st_value'],'file_offset':sec['sh_offset']+s['st_value'],'size':len(data),'sha256':digest(data)}
            (out/(name+'.bin')).write_bytes(data)
    def arr(name,a):return name+' = [ '+' '.join(f'{v:02x}' for v in a)+' ];'
    def repeated(name,rows):
        a=[];i=0
        while i<len(rows):
            j=i+1
            while j<len(rows) and rows[j]==rows[i]:j+=1
            a.extend([j-i,*rows[i]]);i=j
        return arr(name,a)
    lines=['// SPDX-License-Identifier: GPL-2.0-or-later OR MIT',
      '/* Generated from XR1710G retail 5.1.1.12 mt_wifi.ko.',
      ' * SkuTableIdx=3 is zero-based: Sku_04 / Backoff_04.',
      ' * Values are half-dBm ceilings; 0x7e is vendor unused padding.',
      ' * This table cannot restore unit-specific RF calibration.',
      ' * See scripts/xr1710g-power-tables/README.md.',
      ' */','power-limits {','\tboard {']
    allrows=[]
    for band in range(3):
        lines.append('\t\ttxpower-'+['2g','5g','6g'][band]+' {')
        for i in range(117):
            s=arrays['Sku_04'][i*496:(i+1)*496];b=arrays['Backoff_04'][i*496:(i+1)*496]
            assert s[:2]==b[:2]
            if s[0]!=band:continue
            ch=s[1];r=s[2:419];p=b[2:496]
            assert len(r)==417 and len(p)==494
            # mt76 shares HT20/40 with the first two VHT MCS rows.
            assert r[12:20]==r[29:37] and r[20:29]==r[41:50]
            props={}
            props['rates-cck']=list(r[:4]);props['rates-ofdm']=list(r[4:12])
            props['rates-mcs']=[list(r[29+j*12:39+j*12]) for j in range(4)]
            props['rates-ru']=[list(r[77+j*12:89+j*12]) for j in range(7)]
            props['rates-eht']=[list(r[161+j*16:177+j*16]) for j in range(16)]
            props['paths-cck']=list(p[:5]);props['paths-ofdm']=list(p[5:10]);props['paths-ofdm-bf']=list(p[10:14])
            props['paths-ru']=[list(p[14+j*30:29+j*30]) for j in range(16)]
            props['paths-ru-bf']=[list(p[29+j*30:44+j*30]) for j in range(16)]
            lines.extend(['\t\t\tchannel-'+str(ch)+' {','\t\t\t\tchannels = <'+str(ch)+' '+str(ch)+'>;'])
            for name,a in props.items():
                text=repeated(name,a) if isinstance(a[0],list) else arr(name,a)
                lines.append('\t\t\t\t'+text)
            lines.append('\t\t\t};')
            allrows.append({'band':band,'channel':ch,'properties':props,'rate_sha256':digest(r),'path_sha256':digest(p)})
        lines.append('\t\t};')
    lines+=['\t};','};','']
    text='\n'.join(lines);(out/'an7581-xr1710g-stock-power.dtsi').write_text(text)
    metadata={'module_sha256':digest(module.read_bytes()),'profile_index':3,'selection':'zero-based pointer array entry 3 = *_04','units':'0.5 dBm','record_size':496,'rate_bytes':417,'path_bytes':494,'source_symbols':records,'channel_counts':[sum(x['band']==i for x in allrows) for i in range(3)],'rows':allrows,'dtsi_sha256':digest(text.encode())}
    (out/'tables.json').write_text(json.dumps(metadata,indent=2)+'\n')
    return metadata
if __name__=='__main__':
    m=convert(Path(sys.argv[1]),Path(sys.argv[2]));print(json.dumps({k:v for k,v in m.items() if k!='rows'},indent=2))
