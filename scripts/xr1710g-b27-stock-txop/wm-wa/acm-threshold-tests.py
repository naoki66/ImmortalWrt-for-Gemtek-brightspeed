from pathlib import Path
import json,random
s=Path(__file__).with_name('acm-config-tests.py').read_text(encoding='utf-8-sig');ns={};exec(s[:s.index('def expected')],ns);Machine=ns['Machine'];T=ns['T'];rng=random.Random(7699);results=[]
for scale in [0,1,64,512,4096,16384,65535]:
 for case in range(8):
  full=[rng.randrange(0,65536) for _ in range(8)] if case else [15,30,45,60,75,95,100,107]
  drop=[rng.randrange(0,65536) for _ in range(8)] if case else [0,0,0,100,100,100,100,100]
  src=case%4;expect=[[((scale*x)&0xffffffff)//100 for x in full],[((255*x)&0xffffffff)//100 for x in drop]]
  for name,entry,end,capture in [('stock_WA',0xe0002c84,0xe0002d50,[0xe0002cf4+4,0xe0002d46+4]),('current_WA',0xe0003328,0xe00033f4,[0xe0003398+4,0xe00033ea+4])]:
   m=Machine(name);m.entry=entry;m.end=end;m.capture=capture;m.reg['a0']=src;m.wr(m.base+0x20a,scale,2)
   for i in range(8):m.wr(m.base+0x38c+src*64+i*8,full[i]);m.wr(m.base+0x390+src*64+i*8,drop[i])
   steps=m.run();got=[c[2] for c in m.calls if c[2] is not None]
   assert got==expect,(name,hex(entry),got,expect,m.calls)
   results.append(dict(sample=name,scale=scale,source=src,passed=True,steps=steps))
(T/'acm-threshold-offline-tests.json').write_text(json.dumps(dict(cases=len(results),passed=True,scope='Integer percent conversion and setter argument buffers; external log and hardware setters stubbed.',results=results),indent=2));print('PASS',len(results))
