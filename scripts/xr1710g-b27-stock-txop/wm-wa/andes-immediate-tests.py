from pathlib import Path
import re,subprocess,ctypes,random,json
import os
T=Path(os.environ.get('XR_WMWA_WORKDIR', '/mnt/f/openwrt/wifi-fix27-wm-wa-reverse'));src=(T/'references/andes-binutils/include/opcode/riscv.h').read_text();macros=[]
for key in ['GPTYPE_LB','GPTYPE_LH','GPTYPE_LW','GPTYPE_SB','GPTYPE_SH','GPTYPE_SW','STYPE_IMM10','STYPE_IMM7','TYPE_CIMM6']:
 name='EXTRACT_'+key+('_IMM' if key.startswith('GPTYPE') else '')
 m=re.search(r'#define '+name+r'\(x\) \\\n([^\n]+)',src);assert m,name;macros.append(m.group(0))
c='#include <stdint.h>\n#define RV_X(x,s,n) (((x)>>(s))&((1ULL<<(n))-1))\n#define RV_IMM_SIGN(x) (-((int64_t)((x)>>31)))\n'+'\n'.join(macros)+'\n'
for i,key in enumerate(['LB','LH','LW','SB','SH','SW']):c+=f'int64_t test{i}(uint32_t x) {{return EXTRACT_GPTYPE_{key}_IMM(x);}}\n'
p=T/'andes-immediate-reference.c';p.write_text(c);subprocess.run(['cc','-shared','-fPIC','-o',str(T/'andes-immediate-reference.so'),str(p)],check=True)
lib=ctypes.CDLL(str(T/'andes-immediate-reference.so'));scope={};s=Path(__file__).with_name('andes-index.py').read_text(encoding='utf-8-sig');exec(s[:s.index('results=[]')],scope);imm=scope['imm'];decode=scope['decode'];gp=0x10216800;rng=random.Random(1817996);n=0
for _ in range(5000):
 w=rng.getrandbits(32)
 for i,k in enumerate('bhw'):
  f=getattr(lib,'test'+str(i));f.argtypes=[ctypes.c_uint32];f.restype=ctypes.c_int64
  assert imm(w,k)==f(w),(hex(w),k,imm(w,k),f(w));n+=1
 for i,(match,mask) in enumerate([(0x300b,0x307f),(0x2b,0x707f),(0x402b,0x707f)]):
  enc=(w&~mask)|match;it=next(decode(enc.to_bytes(4,'little'),0));got=int(it[3].split(', ')[1].split('(')[0]);f=getattr(lib,'test'+str(i+3));f.argtypes=[ctypes.c_uint32];f.restype=ctypes.c_int64
  assert got==f(enc),(hex(enc),got,f(enc));n+=1
report=dict(passed=True,cases=n,reference='Andes binutils pinned source extraction macros compiled by host cc',commit='dd22be9a0ef80fde64e65e57d25f988a1ea1460f',scope='GP load/add address and store signed immediates; not every opcode')
(T/'andes-immediate-tests.json').write_text(json.dumps(report,indent=2));print(report)
