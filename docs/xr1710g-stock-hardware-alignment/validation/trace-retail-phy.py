from pathlib import Path
import json,re
from collections import Counter

lab=Path(__file__).parent
text=(lab.parent/'stock-PCIe_G3_L0L1_init-369fd0.asm').read_text()
asm={}
for line in text.splitlines():
    m=re.match(r'\s*([0-9a-f]+):\s+[0-9a-f]+\s+(.+)',line)
    if m:
        body=m[2].split('//')[0].strip()
        op,_,args=body.partition('\t')
        if not args: op,_,args=body.partition(' ')
        asm[int(m[1],16)]=(op,args.strip())
def execute(seed=0):
    r={f'x{i}':0 for i in range(31)}
    r['sp']=0x70000000
    mem={0xbff958:0x1fa5a000,0xbff960:0x1fa5b000,0xbff968:0x1fa5c000}
    r['x0']=1
    trace=[];eq=False
    def rv(s):
        s=s.strip()
        if s=='wzr' or s=='xzr':return 0
        if s.startswith('#') or s.startswith('0x'):return int(s.lstrip('#'),0)
        return r.get('x'+s[1:] if s.startswith('w') else s,0)&(0xffffffff if s.startswith('w') else 0xffffffffffffffff)
    def setr(s,v):
        if s not in ('wzr','xzr'): r['x'+s[1:] if s.startswith('w') else s]=v&(0xffffffff if s.startswith('w') else 0xffffffffffffffff)
    def mmio(addr):
        return 0x1fa5a000<=addr<0x1fa5d000
    def load(addr):
        return mem.get(addr,seed if mmio(addr) else 0)
    def store(addr,v,bits):
        v&=(1<<bits)-1
        mem[addr]=v
        if mmio(addr):trace.append(['W',hex(addr),hex(v)])
    def addr(arg):
        m=re.fullmatch(r'\[(\w+)(?:,\s*(#[\-0-9xa-f]+))?\](!)?',arg.strip())
        assert m,arg
        a=rv(m[1])+ (rv(m[2]) if m[2] else 0)
        if m[3]:setr(m[1],a)
        return a
    pc=0x369fd0;count=0
    while True:
        count+=1
        assert count<10000
        if pc==0x36c390:
            # Diagnostic-only IDAC readback/retry after the cold-boot sequence.
            break
        op,args=asm[pc]
        nxt=pc+4
        a=[s.strip() for s in args.split(',')]
        if op in ('mov','adrp'):setr(a[0],rv(a[1]))
        elif op=='movk':
            shift=int(a[2].split('#')[1],0) if len(a)>2 else 0
            setr(a[0],rv(a[0])&~(0xffff<<shift)|rv(a[1])<<shift)
        elif op in ('add','and','orr','lsr','subs'):
            x,y=rv(a[1]),rv(a[2])
            if len(a)>3:
                shift=int(a[3].split('#')[1],0)
                if a[3].startswith('lsr'):y >>= shift
                elif a[3].startswith('lsl'):y <<= shift
                else:raise AssertionError(a[3])
            v={'add':lambda:x+y,'and':lambda:x&y,'orr':lambda:x|y,'lsr':lambda:x>>y,'subs':lambda:x-y}[op]()
            setr(a[0],v)
            if op=='subs':eq=rv(a[0])==0
        elif op in ('bfi','bfxil'):
            pos,width=rv(a[2]),rv(a[3])
            mask=(1<<width)-1
            v= ((rv(a[0])&~(mask<<pos))|((rv(a[1])&mask)<<pos)) if op=='bfi' else ((rv(a[0])&~mask)|((rv(a[1])>>pos)&mask))
            setr(a[0],v)
        elif op in ('cmp','tst'):
            eq= (rv(a[0])==rv(a[1])) if op=='cmp' else ((rv(a[0])&rv(a[1]))==0)
        elif op=='cset':setr(a[0],int(eq if a[1]=='eq' else not eq))
        elif op in ('b','b.eq','b.ne'):
            if op=='b' or (op=='b.eq' and eq) or (op=='b.ne' and not eq):nxt=rv(a[0].split()[0])
        elif op in ('cbz','cbnz'):
            if (rv(a[0])==0)==(op=='cbz'):nxt=rv(a[1].split()[0])
        elif op in ('ldr','str'):
            _,arg=args.split(',',1)
            ad=addr(arg)
            if op=='ldr':setr(a[0],load(ad))
            else:store(ad,rv(a[0]),32 if a[0].startswith('w') else 64)
        elif op in ('stp','ldp'):
            m=re.match(r'(\w+),\s*(\w+),\s*(\[[^\]]+\]!?)(?:,\s*(#[0-9xa-f]+))?',args)
            assert m,args
            ad=addr(m[3]);size=4 if m[1].startswith('w') else 8
            if op=='stp':
                store(ad,rv(m[1]),size*8);store(ad+size,rv(m[2]),size*8)
            else:
                setr(m[1],load(ad));setr(m[2],load(ad+size))
            if m[4]:setr('sp',rv('sp')+rv(m[4]))
        elif op=='bl':
            target=rv(a[0].split()[0])
            if target==0x369640:
                ad=rv('w0')+rv('w2')-rv('w1')
                assert mmio(ad),hex(ad)
                setr('w0',load(ad))
            elif target==0x6e07c0:
                trace.append(['D',round(rv('x0')/4295)])
            elif target==0x3aa770:
                assert rv('w0') in (2,3)
                setr('w0',0)
            elif target==0x3698d0:
                trace.append(['CAL',rv('w1'),rv('w0')])
            elif target==0xa7d50:pass
            else:raise AssertionError(hex(target))
        elif op in ('dmb','nop'):pass
        elif op=='ret':break
        else:raise AssertionError((hex(pc),op,args))
        pc=nxt
    return trace
for seed in (0,0xa5a5a5a5):
    t=execute(seed)
    (lab/f'retail-main-phy-trace-{seed:08x}.json').write_text(json.dumps(t,indent=2)+'\n')
    print(hex(seed),len(t),'events',Counter(x[0] for x in t))
