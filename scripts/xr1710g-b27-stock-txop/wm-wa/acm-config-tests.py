from pathlib import Path
import json,re,random,hashlib
import os
T=Path(os.environ.get('XR_WMWA_WORKDIR', '/mnt/f/openwrt/wifi-fix27-wm-wa-reverse'))
U=lambda x:x&0xffffffff
class Machine:
 def __init__(self,name):
  self.name=name;self.stock=name=='stock_WA';self.entry=0xe0003a6e if self.stock else 0xe000412c;self.end=0xe0003c6a if self.stock else 0xe0004328
  self.base=0x10216800+(-70016 if self.stock else -70912);self.debug=0x10216800+(261448 if self.stock else 260576)
  self.code={i[0]:i for i in json.loads((T/(name+'-andes-index.json')).read_text())['instructions']};self.mem={};self.reg={'a0':0x20000000,'gp':0x10216800,'sp':0x21001000};self.calls=[]
 def rd(self,a,n=4,signed=False):return int.from_bytes(bytes(self.mem.get(U(a+i),0) for i in range(n)),'little',signed=signed)
 def wr(self,a,v,n=4):
  for i,x in enumerate(U(v).to_bytes(4,'little')[:n]):self.mem[U(a+i)]=x
 def val(self,s):return 0 if s=='zero' else self.reg.get(s,0)
 def addr(self,s):
  m=re.fullmatch(r'(-?(?:0x[0-9a-f]+|\d+))\((\w+)\)',s);return U(self.val(m[2])+int(m[1],0))
 def run(self):
  pc=self.entry
  for step in range(2000):
   if pc==self.end:return step
   _,size,mn,op=self.code[pc];args=[x.strip() for x in op.split(',')];nxt=pc+size;v=None;d=args[0];m=mn.removeprefix('c.')
   if m in ('lw','lh','lhu','lb','lbu','lwsp') or (mn.startswith('nds.l') and mn.endswith('gp')):
    width=1 if ('lb' in m) else 2 if ('lh' in m) else 4;v=self.rd(self.addr(args[1]),width,m in ('lb','lh'))
   elif m in ('sw','sh','sb','swsp'):
    self.wr(self.addr(args[1]),self.val(d),{'sb':1,'sh':2}.get(m,4))
   elif m in ('mv',):v=self.val(args[1])
   elif m=='li':v=int(args[1],0)
   elif m=='lui':v=int(args[1],0)<<12
   elif m=='auipc':v=pc+(int(args[1],0)<<12)
   elif mn=='nds.addigp':v=self.addr(args[1])
   elif m in ('addi','addi16sp','addi4spn','andi','ori','slli'):
    a=self.val(args[1]) if len(args)==3 else self.val(d);b=int(args[-1],0)
    v={'addi':lambda:a+b,'addi16sp':lambda:a+b,'addi4spn':lambda:a+b,'andi':lambda:a&b,'ori':lambda:a|b,'slli':lambda:a<<b}[m]()
   elif mn.startswith('nds.lea.'):
    v=self.val(args[1])+(self.val(args[2])<<{'h':1,'w':2,'d':3}[mn[-1]])
   elif m=='divu':v=self.val(args[1])//self.val(args[2]) if self.val(args[2]) else 0xffffffff
   elif m in ('add','mul','or'):
    a=self.val(args[1]);b=self.val(args[2]);v={'add':lambda:a+b,'mul':lambda:a*b,'or':lambda:a|b}[m]()
   elif mn in ('nds.bbc','nds.bbs','nds.bnec','nds.beqc'):
    a=self.val(d);b=int(args[1],0);taken={'nds.bbc':lambda:not(a&(1<<b)),'nds.bbs':lambda:bool(a&(1<<b)),'nds.bnec':lambda:a!=b,'nds.beqc':lambda:a==b}[mn]()
    if taken:nxt=pc+int(args[2],0)
   elif m in ('bltu','bne','beq','beqz','bnez'):
    a=self.val(d);b=0 if m.endswith('z') else self.val(args[1]);taken={'bltu':lambda:a<b,'bne':lambda:a!=b,'beq':lambda:a==b,'beqz':lambda:a==0,'bnez':lambda:a!=0}[m]()
    if taken:nxt=pc+int(args[-1],0)
   elif m in ('jal','jalr'):
    self.calls.append((pc-self.entry,[self.val('a'+str(i)) for i in range(3)], [self.rd(self.val('a1')+4*i) for i in range(8)] if pc in getattr(self,'capture',[]) else None));self.reg['a0']=0
   else:raise RuntimeError((hex(pc),mn,op))
   if v is not None and d!='zero':self.reg[d]=U(v)
   pc=nxt
  raise RuntimeError('instruction budget exceeded')

def expected(initial,packet):
 s=bytearray(initial)
 def get(o,n=4):return int.from_bytes(s[o:o+n],'little')
 def put(o,v,n=4):s[o:o+n]=U(v).to_bytes(4,'little')[:n]
 def pget(o,n=2):return int.from_bytes(packet[o:o+n],'little')
 op=packet[0x2c];f=get(0x1d4)
 if op==1:f|=15
 if op==2:f|=2
 if op==3:f|=1
 if op==4:f|=4
 if op==5:f|=16
 if op==9:f=0;put(0x1d0,get(0x1d0)&~2)
 put(0x1d4,f)
 if f&8:put(0x21a,pget(0x34),1);put(0x21b,pget(0x36),1)
 if f&2:
  put(0x21d,0)
  if packet[0x2d]:s[0x21d:0x221]=packet[0x2a4:0x2a8]
  for i in range(4):put(0x1f0+2*i,pget(0x38+2*i),2);put(0x1f8+2*i,pget(0x40+2*i),2)
 if f&1:
  put(0x1d0,get(0x1d0)|2)
  for src in range(4):
   for j in range(8):put(0x38c+src*64+j*8,pget(0x48+src*16+j*2));put(0x390+src*64+j*8,pget(0x88+src*16+j*2))
 if f&4:
  for band in range(4):
   for ac in range(4):put(0x32c+band*16+ac*2,pget(0xc8+band*10+ac*2),2);put(0x334+band*16+ac*2,pget(0xf0+band*10+ac*2),2)
 return bytes(s)
if __name__ != '__main__':
 raise SystemExit('Import through runpy is not supported; use class-only loader')
results=[];rng=random.Random(7996)
for op in [0,1,2,3,4,5,6,7,8,9,10,255]:
 for flags in [0,1,2,4,8,16,31]:
  packet=bytearray(rng.randbytes(0x300));packet[0x2c]=op;packet[0x2d]=op%2
  initial=bytearray(rng.randbytes(0x1000));initial[0x1d4:0x1d8]=flags.to_bytes(4,'little');expect=expected(initial,packet);outputs=[]
  for name in ['stock_WA','current_WA']:
   m=Machine(name)
   for i,v in enumerate(initial):m.mem[m.base+i]=v
   for i,v in enumerate(packet):m.mem[0x20000000+i]=v
   m.wr(m.debug,0);steps=m.run();out=bytes(m.mem.get(m.base+i,0) for i in range(len(initial)))
   assert out==expect,(name,op,flags,[(hex(i),a,b) for i,(a,b) in enumerate(zip(out,expect)) if a!=b][:20])
   outputs.append(out);results.append(dict(sample=name,op=op,initial_flags=flags,steps=steps,passed=True,state_sha256=hashlib.sha256(out).hexdigest(),calls_stubbed=len(m.calls)))
  assert outputs[0]==outputs[1]
report=dict(scope='Decoded instruction interpreter of acm_cmd_config body; logging, hardware setters, table-programming helpers and STA helper calls stubbed. Not whole-firmware emulation.',cases=len(results),passed=True,results=results)
(T/'acm-config-offline-tests.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
