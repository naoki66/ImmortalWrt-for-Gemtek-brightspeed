from pathlib import Path
import json,re,hashlib
import os
T=Path(os.environ.get('XR_WMWA_WORKDIR', '/mnt/f/openwrt/wifi-fix27-wm-wa-reverse'))
RN=['zero','ra','sp','gp','tp','t0','t1','t2','s0','s1','a0','a1','a2','a3','a4','a5','a6','a7','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','t3','t4','t5','t6']
U=lambda x:x&0xffffffff
S=lambda x:x-(1<<32) if x&(1<<31) else x
class Interpreter:
 def __init__(self,name):
  self.name=name;self.reg={'gp':0x10216800,'sp':0x21001000,'a0':0x20000000,'a1':0x20001000};self.mem={};self.calls=[];self.code={i[0]:i for i in json.loads((T/(name+'-andes-index.json')).read_text())['instructions']};self.regions=[(int(p.stem.split('_')[1],16),p.read_bytes()) for p in (T/'decrypted-clean'/name).glob('*.bin')]
 def byte(self,a):
  a=U(a)
  if a in self.mem:return self.mem[a]
  for base,b in self.regions:
   if base<=a<base+len(b):return b[a-base]
  return 0
 def rd(self,a,n=4,signed=False):return int.from_bytes(bytes(self.byte(a+i) for i in range(n)),'little',signed=signed)
 def wr(self,a,v,n=4):
  for i,x in enumerate(U(v).to_bytes(4,'little')[:n]):self.mem[U(a+i)]=x
 def v(self,s):return 0 if s=='zero' else self.reg.get(s,0)
 def addr(self,s):
  m=re.fullmatch(r'(-?(?:0x[0-9a-f]+|\d+))\((\w+)\)',s);assert m,s;return U(self.v(m[2])+int(m[1],0))
 def run(self,entry,limit=1000):
  pc=entry
  for steps in range(limit):
   _,size,mn,op=self.code[pc];args=[x.strip() for x in op.split(',')];nxt=pc+size;d=args[0];m=mn.removeprefix('c.');v=None
   if m in ('ret','jr'):
    assert m=='ret' or d=='ra';return self.v('a0'),steps
   if m in ('lw','lh','lhu','lb','lbu','lwsp') or (mn.startswith('nds.l') and mn.endswith('gp')):
    width=1 if 'lb' in m else 2 if 'lh' in m else 4;v=self.rd(self.addr(args[1]),width,m in ('lb','lh'))
   elif m in ('sw','sh','sb','swsp'):self.wr(self.addr(args[1]),self.v(d),{'sb':1,'sh':2}.get(m,4))
   elif m=='mv':v=self.v(args[1])
   elif m=='li':v=int(args[1],0)
   elif m=='lui':v=int(args[1],0)<<12
   elif m=='auipc':v=pc+(int(args[1],0)<<12)
   elif mn=='nds.addigp':v=self.addr(args[1])
   elif m in ('addi','addi16sp','addi4spn','andi','ori','xori','slli','srli'):
    a=self.v(args[1]) if len(args)==3 else self.v(d);b=int(args[-1],0)
    v={'addi':lambda:a+b,'addi16sp':lambda:a+b,'addi4spn':lambda:a+b,'andi':lambda:a&b,'ori':lambda:a|b,'xori':lambda:a^b,'slli':lambda:a<<(b&31),'srli':lambda:a>>(b&31)}[m]()
   elif m in ('add','mul','or','and','srl','sll','xor','sub'):
    a=self.v(args[1]) if len(args)==3 else self.v(d);b=self.v(args[-1]);v={'add':lambda:a+b,'mul':lambda:a*b,'or':lambda:a|b,'and':lambda:a&b,'srl':lambda:a>>(b&31),'sll':lambda:a<<(b&31),'xor':lambda:a^b,'sub':lambda:a-b}[m]()
   elif mn.startswith('nds.b'):
    a=self.v(args[1]) if mn in ('nds.bfoz','nds.bfos') else self.v(d);b=int(args[-2],0);c=int(args[-1],0)
    if mn in ('nds.bfoz','nds.bfos'):
     h,l=b,c
     if h==0:v=(a&1)<<l;bits=l+1
     elif h<l:v=(a&((1<<(l-h+1))-1))<<h;bits=l+1
     else:v=(a>>l)&((1<<(h-l+1))-1);bits=h-l+1
     if mn=='nds.bfos' and v&(1<<(bits-1)):v-=1<<bits
    else:
     taken={'nds.bbc':lambda:not(a&(1<<b)),'nds.bbs':lambda:bool(a&(1<<b)),'nds.bnec':lambda:a!=b,'nds.beqc':lambda:a==b}[mn]()
     if taken:nxt=pc+c
   elif m in ('bltu','bgeu','bne','beq','beqz','bnez','bltz','bgez'):
    a=self.v(d);b=0 if m.endswith('z') else self.v(args[1]);taken={'bltu':lambda:a<b,'bgeu':lambda:a>=b,'bne':lambda:a!=b,'beq':lambda:a==b,'beqz':lambda:a==0,'bnez':lambda:a!=0,'bltz':lambda:S(a)<0,'bgez':lambda:S(a)>=0}[m]()
    if taken:nxt=pc+int(args[-1],0)
   elif m=='j':nxt=pc+int(d,0)
   elif m in ('jal','jalr'):raise RuntimeError('Unexpected external call '+hex(pc))
   else:raise RuntimeError((hex(pc),mn,op))
   if v is not None and d!='zero':self.reg[d]=U(v)
   pc=nxt
  raise RuntimeError('instruction budget exceeded')

def model(byte,qos,mask):
 up=byte>>2;ac=[1,0,0,1,2,2,3,3][up] if up<8 else 1
 if not qos:return ac,byte
 while ac and mask&(1<<ac):ac-=1
 if ac==0:return 0,((byte&3)|4) if up<8 else byte
 return ac,((byte&3)|([1,0,5,7][ac]<<2)) if up<8 else byte

def test_ac():
 machines={n:Interpreter(n) for n in ['stock_WA','current_WA']};h=hashlib.sha256();count=0;steps=0
 for byte in range(256):
  for qos in [0,1]:
   for mask in range(16):
    expect=model(byte,qos,mask)
    for name,m in machines.items():
     m.mem={};m.reg={'gp':0x10216800,'sp':0x21001000,'a0':0x20000000,'a1':0x20001000};m.wr(0x20000011,qos<<7,1);m.wr(0x20000014,mask<<4,2);m.wr(0x2000101b,byte,1);m.wr(0x10216800+(261448 if name=='stock_WA' else 260576),0)
     ret,n=m.run(0x1000aa84 if name=='stock_WA' else 0x10009fc0);got=(ret,m.rd(0x2000101b,1));assert got==expect,(name,byte,qos,mask,got,expect);h.update(bytes([ret,got[1]]));count+=1;steps+=n
 result=dict(passed=True,cases=count,instructions_interpreted=steps,result_digest=h.hexdigest(),scope='Whole decoded WA map_acm_up_to_ac function with logging disabled; actual firmware UP/AC tables; all 256 input priority bytes, 16 ACM masks, both QoS states for both samples',tables={'up_to_ac':[1,0,0,1,2,2,3,3],'ac_to_up':[1,0,5,7]})
 (T/'ac-mapping-review-tests.json').write_text(json.dumps(result,indent=2));print(result)
if __name__=='__main__':test_ac()
