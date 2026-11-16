from pathlib import Path
import tempfile,subprocess,os,json
repo=Path(__file__).resolve().parents[2];out=Path(os.environ.get('B20_TEST_OUTPUT', tempfile.mkdtemp(prefix='b20-test-results-')));out.mkdir(parents=True,exist_ok=True);root=Path(tempfile.mkdtemp(prefix='b20-migration-tests-'));bindir=root/'bin';bindir.mkdir()
uci='''#!/usr/bin/env python3
import os,json,sys
from pathlib import Path
p=Path(os.environ['TEST_STATE']);d=json.loads(p.read_text());a=[x for x in sys.argv[1:] if x!='-q'];cmd=a[0]
if cmd=='get':
 if a[1] not in d:sys.exit(1)
 print(d[a[1]])
elif cmd=='show':
 for k,v in d.items():
  if k.startswith(a[1]+'.'):print(k+'='+v)
elif cmd=='set':
 k,v=a[1].split('=',1);d[k]=v;p.write_text(json.dumps(d))
elif cmd=='commit':pass
else:sys.exit(1)
'''
(bindir/'uci').write_text(uci);(bindir/'uci').chmod(0o755)
(bindir/'logger').write_text('#!/bin/sh\nexit 0\n');(bindir/'logger').chmod(0o755)
(bindir/'cat').write_text('#!/bin/sh\nif [ "$1" = /tmp/sysinfo/board_name ]; then printf "%s\\n" "$TEST_BOARD"; else exec /bin/cat "$@"; fi\n');(bindir/'cat').chmod(0o755)
backup=root/'config';backup.mkdir();(backup/'network').write_text('private-test-placeholder');(backup/'wireless').write_text('private-test-placeholder')
env=dict(os.environ,PATH=str(bindir)+':'+os.environ['PATH'],TEST_STATE=str(root/'state.json'),TEST_BOARD='gemtek,xr1710g')
results=[]
def run(name,script,state,expected,board='gemtek,xr1710g'):
 src=(repo/'files/etc/uci-defaults'/script).read_text().replace('/root/xr1710g-B20-runtime-backup',str(root/'backup')).replace('/etc/config/network',str(backup/'network')).replace('/etc/config/wireless',str(backup/'wireless'))
 f=root/'under-test.sh';f.write_text(src);p=root/'state.json';p.write_text(json.dumps(state));e=dict(env,TEST_BOARD=board)
 for _ in range(2):
  subprocess.run(['/bin/sh',str(f)],env=e,check=True)
  assert json.loads(p.read_text())==expected,(name,json.loads(p.read_text()),expected)
 results.append(dict(case=name,passed=True,idempotent=True))
w={'network.wan.proto':'pppoe','network.wan.device':'wan','network.wan6.proto':'dhcpv6','network.wan6.device':'wan'}
s='98-xr1710g-pppoe-wan6'
run('PPPoE physical WAN corrected',s,w,{**w,'network.wan6.device':'@wan'})
for name,delta in [('DHCP untouched',{'network.wan.proto':'dhcp'}),('explicit alternate IPv6 device preserved',{'network.wan6.device':'other'}),('already logical preserved',{'network.wan6.device':'@wan'}),('static IPv6 preserved',{'network.wan6.proto':'static'})]:
 state={**w,**delta};run(name,s,state,state)
run('other board untouched',s,w,w,'mediatek,w1700k')
wifi={'wireless.radio0':'wifi-device','wireless.radio0.band':'2g','wireless.radio1':'wifi-device','wireless.radio1.band':'5g'}
s='97-xr1710g-2g-default'
run('missing 2G htmode fixed only on 2G',s,wifi,{**wifi,'wireless.radio0.htmode':'HE20'})
for mode in ['HT20','HE40','HE20','NOHT']:
 state={**wifi,'wireless.radio0.htmode':mode};run('existing '+mode+' preserved',s,state,state)
run('other board wireless untouched',s,wifi,wifi,'mediatek,w1700k')
(out/'migration-test-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
