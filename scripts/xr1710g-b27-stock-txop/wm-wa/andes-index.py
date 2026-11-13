from pathlib import Path
import json,re,struct,collections
from capstone import *
import os
T=Path(os.environ.get('XR_WMWA_WORKDIR', '/mnt/f/openwrt/wifi-fix27-wm-wa-reverse'))
RN=['zero','ra','sp','gp','tp','t0','t1','t2','s0','s1','a0','a1','a2','a3','a4','a5','a6','a7','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','t3','t4','t5','t6']
def bits(w,p,n):return (w>>p)&((1<<n)-1)
def imm(w,k):
 sign=-(w>>31)
 if k=='b':return bits(w,14,1)|(bits(w,21,10)<<1)|(bits(w,20,1)<<11)|(bits(w,17,3)<<12)|(bits(w,15,2)<<15)|(sign<<17)
 if k=='h':return (bits(w,21,10)<<1)|(bits(w,20,1)<<11)|(bits(w,17,3)<<12)|(bits(w,15,2)<<15)|(sign<<17)
 return (bits(w,22,9)<<2)|(bits(w,20,1)<<11)|(bits(w,17,3)<<12)|(bits(w,15,2)<<15)|(bits(w,21,1)<<17)|(sign<<18)
def decode(b,base):
 md=Cs(CS_ARCH_RISCV,CS_MODE_RISCV32|CS_MODE_RISCVC)
 off=0
 while off+2<=len(b):
  h=int.from_bytes(b[off:off+2],'little');n=2 if h&3!=3 else 4
  if h&31==31:n=6 if h&63==31 else 8
  raw=b[off:off+n];pc=base+off;w=int.from_bytes(raw,'little');custom=None
  if n==4:
   for match,mask,mn,k in [(0x100b,0x307f,'nds.addigp','b'),(0x000b,0x307f,'nds.lbgp','b'),(0x200b,0x307f,'nds.lbugp','b'),(0x102b,0x707f,'nds.lhgp','h'),(0x502b,0x707f,'nds.lhugp','h'),(0x202b,0x707f,'nds.lwgp','w'),(0x602b,0x707f,'nds.lwugp','w')]:
    if w&mask==match:custom=(mn,f'{RN[bits(w,7,5)]}, {imm(w,k)}(gp)');break
  if n==4 and custom is None:
   rs=RN[bits(w,15,5)];rd=RN[bits(w,7,5)];rt=RN[bits(w,20,5)]
   if w&0x707f in (0x505b,0x605b):
    delta=(bits(w,8,4)<<1)|(bits(w,25,5)<<5)|(-(w>>31)<<10)
    const=bits(w,20,5)|(bits(w,7,1)<<5)|(bits(w,30,1)<<6)
    custom=('nds.beqc' if w&0x707f==0x505b else 'nds.bnec',f'{rs}, {const}, {delta:+d}')
   elif w&0x4000707f in (0x705b,0x4000705b):
    delta=(bits(w,8,4)<<1)|(bits(w,25,5)<<5)|(-(w>>31)<<10)
    custom=('nds.bbs' if w&0x40000000 else 'nds.bbc',f'{rs}, {bits(w,20,5)|(bits(w,7,1)<<5)}, {delta:+d}')
   elif w&0x707f in (0x205b,0x305b):
    custom=('nds.bfoz' if w&0x707f==0x205b else 'nds.bfos',f'{rd}, {rs}, {bits(w,26,6)}, {bits(w,20,6)}')
   elif w&0xfe00707f in (0xa00005b,0xc00005b,0xe00005b):
    custom=({0xa00005b:'nds.lea.h',0xc00005b:'nds.lea.w',0xe00005b:'nds.lea.d'}[w&0xfe00707f],f'{rd}, {rs}, {rt}')
   else:
    for match,mask,mn,k in [(0x300b,0x307f,'nds.sbgp','b'),(0x2b,0x707f,'nds.shgp','h'),(0x402b,0x707f,'nds.swgp','w')]:
     if w&mask!=match:continue
     v=(bits(w,25,6)<<5)|(bits(w,7,1)<<11)|(bits(w,17,3)<<12)|(bits(w,15,2)<<15)
     if k=='w':v|=(bits(w,9,3)<<2)|(bits(w,8,1)<<17)|(-(w>>31)<<18)
     else:v|=(bits(w,8,4)<<1)|(-(w>>31)<<17)|(bits(w,14,1) if k=='b' else 0)
     custom=(mn,f'{rt}, {v}(gp)');break
  if custom:mn,op=custom
  else:
   it=next(md.disasm(raw,pc,count=1),None)
   if it and it.size==n:mn,op=it.mnemonic,it.op_str
   else:mn,op=f'.insn{n*8}',f'0x{w:0{n*2}x}'
  yield pc,n,mn,op,raw
  off+=n
results=[]
for name in ['stock_WA','current_WA','stock_WM','current_WM']:
 regions=[];strings={};refs=[];ins=[];stats=collections.Counter()
 for p in sorted((T/'decrypted-clean'/name).glob('*.bin')):
  base=int(p.stem.split('_')[1],16);b=p.read_bytes();regions.append((p,base,b))
  for m in re.finditer(rb'[ -~]{5,}',b):strings[base+m.start()]=m.group().decode()
 gp=0x10216800 if name.endswith('WA') else None
 for p,base,b in regions:
  idx=int(p.stem[6:8])
  if idx not in ([0,2] if name.endswith('WA') else [0,2,8]):continue
  lines=[];regs={}
  for pc,n,mn,op,raw in decode(b,base):
   ins.append([pc,n,mn,op]);stats[mn]+=1;lines.append(f'{pc:08x}: {raw.hex():16s} {mn:14s} {op}')
   args=[a.strip() for a in op.split(',')];v=None;dst=args[0] if args else ''
   if mn=='nds.addigp' and gp:v=gp+int(args[1].split('(')[0])
   elif mn in ('lui','c.lui'):v=int(args[1],0)<<12
   elif mn=='auipc':v=pc+(int(args[1],0)<<12)
   elif mn=='addi' and args[1] in regs:v=regs[args[1]]+int(args[2],0)
   elif mn=='c.addi' and dst in regs:v=regs[dst]+int(args[1],0)
   elif mn in ('mv','c.mv') and args[1] in regs:v=regs[args[1]]
   elif mn in ('li','c.li'):v=int(args[1],0)
   # Only direct address construction is indexed; GP loads are not string addresses.
   if dst in RN:regs.pop(dst,None)
   if v is not None:
    v&=0xffffffff;regs[dst]=v
    if v in strings:refs.append(dict(pc=pc,address=v,string=strings[v],instruction=mn+' '+op))
   if mn.startswith(('.insn','b','c.b','nds.b')) or mn in ('ret','j','jal','jalr','c.j','c.jal','c.jr'):regs={}
  out=T/'andes-disassembly'/name;out.mkdir(parents=True,exist_ok=True);(out/(p.stem+'.dis')).write_text('\n'.join(lines)+'\n')
 sched=[r for r in refs if re.search(r'acm|red|vow|drr|txop|bawin|sched',r['string'],re.I)]
 report=dict(name=name,gp=gp,instructions=ins,string_references=refs,scheduler_string_references=sched,counts=dict(stats))
 (T/(name+'-andes-index.json')).write_text(json.dumps(report))
 results.append(dict(name=name,xrefs=len(refs),unknown=sum(v for k,v in stats.items() if k.startswith('.insn')),scheduler_xrefs=sched))
(T/'andes-scheduler-xrefs.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2)[:28000])
