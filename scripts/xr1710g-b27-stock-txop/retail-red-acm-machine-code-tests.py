#!/usr/bin/env python3
"""Emulate only the verified retail host RED init; no device or network access."""
import argparse,hashlib,importlib.util,json,struct,sys
sys.dont_write_bytecode = True
from pathlib import Path
from elftools.elf.elffile import ELFFile
from elftools.elf.relocation import RelocationSection
from unicorn import Uc,UC_ARCH_ARM64,UC_MODE_ARM,UC_HOOK_CODE
from unicorn.arm64_const import UC_ARM64_REG_X0,UC_ARM64_REG_X1,UC_ARM64_REG_X2,UC_ARM64_REG_X3,UC_ARM64_REG_X30,UC_ARM64_REG_SP,UC_ARM64_REG_PC

spec=importlib.util.spec_from_file_location('model',Path(__file__).with_name('retail-red-acm-model.py'))
model=importlib.util.module_from_spec(spec);spec.loader.exec_module(model)
X=[UC_ARM64_REG_X0,UC_ARM64_REG_X1,UC_ARM64_REG_X2,UC_ARM64_REG_X3]

def emulate(module,tokens,software,tx_error=False):
    assert hashlib.sha256(module.read_bytes()).hexdigest()==model.RETAIL_SHA256
    uc=Uc(UC_ARCH_ARM64,UC_MODE_ARM)
    with module.open('rb') as fp:
        elf=ELFFile(fp);sections=list(elf.iter_sections());bases={};nextbase=0x1000000
        for i,sec in enumerate(sections):
            if not sec['sh_flags']&2 or not sec['sh_size']:
                continue
            size=(sec['sh_size']+4095)&~4095;bases[i]=nextbase;uc.mem_map(nextbase,size)
            if sec['sh_type']!='SHT_NOBITS':uc.mem_write(nextbase,sec.data())
            nextbase+=size+4096
        text=bases[next(i for i,s in enumerate(sections) if s.name=='.text')]
        calls={}
        for rs in sections:
            if not isinstance(rs,RelocationSection) or rs['sh_info'] not in bases:continue
            tab=sections[rs['sh_link']]
            for rel in rs.iter_relocations():
                sym=tab.get_symbol(rel['r_info_sym']);kind=rel['r_info_type'];pc=bases[rs['sh_info']]+rel['r_offset']
                if kind in (282,283):
                    calls[pc]=sym.name
                    continue
                idx=sym['st_shndx']
                if not isinstance(idx,int) or idx not in bases:continue
                target=bases[idx]+sym['st_value']+rel['r_addend']
                if kind==257:uc.mem_write(pc,struct.pack('<Q',target));continue
                op=struct.unpack('<I',uc.mem_read(pc,4))[0]
                if kind==275:
                    delta=((target&~4095)-(pc&~4095))>>12
                    op=(op&~0x60ffffe0)|((delta&3)<<29)|(((delta>>2)&0x7ffff)<<5)
                elif kind==277:op=(op&~0x3ffc00)|((target&4095)<<10)
                elif kind in (278,284,285,286):
                    shift={278:0,284:1,285:2,286:3}[kind]
                    op=(op&~0x3ffc00)|(((target&4095)>>shift)<<10)
                else:continue
                uc.mem_write(pc,struct.pack('<I',op))
    physical=0x10000000;adapter=0x20000000;stack=0x21000000;heap=0x22000000;stop=0x23000000
    for base,size in [(physical,0x2800000),(adapter,4096),(stack,0x10000),(heap,0x10000),(stop,4096)]:uc.mem_map(base,size)
    uc.mem_write(adapter+440,struct.pack('<Q',physical))
    uc.mem_write(physical+116,struct.pack('<I',1<<10))
    uc.mem_write(physical+92,struct.pack('<I',software))
    nextheap=heap;messages={};sent=[];trace=[];allocs=[]
    def hook(uc,pc,size,_):
        nonlocal nextheap
        if pc==stop:uc.emu_stop();return
        if pc not in calls:return
        name=calls[pc];a=[uc.reg_read(x) for x in X];ret=0
        if name=='hwifi_get_inf_num':pass
        elif name=='hwifi_get_tx_token_num':
            assert a[2]==4;uc.mem_write(a[1],struct.pack('<4H',*tokens))
        elif name=='UniCmdSetRedEnable':trace.append(['WM_RED',a[2]])
        elif name=='MtCmdCr4Set':trace.append(['WA_PARAM',*a[1:4]])
        elif name=='os_zero_mem':uc.mem_write(a[0],bytes(a[1]))
        elif name=='os_alloc_mem':
            allocs.append(a[2]);uc.mem_write(a[1],struct.pack('<Q',nextheap));nextheap+=(a[2]+15)&~15
        elif name=='AndesAllocCmdMsg':
            ret=nextheap;nextheap+=4096;messages[ret]=bytearray();trace.append(['ALLOC_MSG',a[1]])
        elif name=='AndesInitCmdMsg':pass
        elif name=='AndesAppendCmdMsg':messages[a[0]].extend(uc.mem_read(a[1],a[2]))
        elif name=='chip_cmd_tx':sent.append(bytes(messages[a[1]]));ret=0xfffffffb if tx_error else 0
        elif name=='os_free_mem':pass
        elif name=='HW_SET_PBC_CTRL':trace.append(['PBC',*a[1:4]])
        elif name=='mtwf_dbg_prt':raise AssertionError('Debug flags unexpectedly enabled')
        else:raise AssertionError((hex(pc-text),name,a))
        uc.reg_write(UC_ARM64_REG_X0,ret);uc.reg_write(UC_ARM64_REG_PC,pc+4)
    uc.hook_add(UC_HOOK_CODE,hook)
    uc.reg_write(UC_ARM64_REG_X0,physical);uc.reg_write(UC_ARM64_REG_X30,stop);uc.reg_write(UC_ARM64_REG_SP,stack+0x8000)
    uc.emu_start(text+0x339b04,stop+4,count=1000)
    uc.reg_write(UC_ARM64_REG_X0,adapter);uc.reg_write(UC_ARM64_REG_X30,stop)
    uc.emu_start(text+0x339b40,stop+4,count=1000000)
    assert uc.reg_read(UC_ARM64_REG_PC)==stop,'Instruction budget exhausted'
    assert len(sent)==1 and allocs==[632],(len(sent),allocs)
    return sent[0],trace

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--module',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    drops=model.retail_drop_table(a.module);cases=[]
    inputs=[([16384]*4,16384),([16384]*4,8192),([0,65535,1,8192],4096),([16385,16383,2,0],1)]
    for fail in [False,True]:
        for tokens,sw in inputs:
            actual,trace=emulate(a.module,tokens,sw,fail);expected=model.acm_token_config(tokens,sw,drops)
            assert actual==expected, next((i for i,(x,y) in enumerate(zip(actual,expected)) if x!=y),('length',len(actual),len(expected)))
            assert trace==[['WM_RED',2],['WA_PARAM',14,1,0],['ALLOC_MSG',644],['PBC',0,0,0]],trace
            cases.append({'sources':tokens,'software':sw,'injected_tx_failure':fail,'byte_exact':True,'payload_sha256':hashlib.sha256(actual).hexdigest(),'trace':trace})
    report={'module_sha256':model.RETAIL_SHA256,'emulation':'Unicorn ARM64; original red_init + nested ACM send machine code; host service calls intercepted','cases':cases,'all_passed':True,'actual_router_access':False,'firmware_internal_execution_verified':False}
    (a.output/'retail-red-acm-machine-code-tests.json').write_text(json.dumps(report,indent=2)+'\n')
    print('PASS: 8 original ARM64 red_init/ACM-send executions; 644-byte payloads match reconstructed model byte for byte, including token boundary cases and injected transmit failures')

if __name__=='__main__':main()
