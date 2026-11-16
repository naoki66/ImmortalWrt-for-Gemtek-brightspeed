from pathlib import Path
import subprocess,tempfile,json,hashlib,re,os
B=Path(__file__).resolve().parents[2];T=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-reviewed-fixes-tests'))/'ppp-authfiles';T.mkdir(parents=True,exist_ok=True);p=B/'package/network/services/ppp/files/ppp.sh';raw=p.read_text()
def function(name):
 m=re.search(r'^'+re.escape(name)+r'\(\)\s*\n?\{',raw,re.M);assert m,name
 end=re.search(r'^}',raw[m.end():],re.M);assert end
 return raw[m.start():m.end()+end.end()]+'\n'
defs=''.join(function(n) for n in ['ppp_exitcode_tostring','ppp_opt_quote','ppp_install_file','ppp_write_auth_file','ppp_generic_setup','ppp_generic_teardown'])
cases=[]
for mode,stale,jail in [('normal',False,False),('normal',True,False),('normal',False,True),('mktemp',False,False),('mktemp',True,False),('cat',False,False),('cat',True,False),('mv',True,False),('mkdir',True,False),('chown',True,True),('secret-copy',True,True)]:
 with tempfile.TemporaryDirectory(prefix='xr-ppp-fix-') as td:
  root=Path(td);run=root/'run';(run/'pppd').mkdir(parents=True);etc=root/'etc';etc.mkdir();opt=run/'pppd/wan.opts'
  old='user "obsolete"\npassword "obsolete"\n';expected='user "synthetic-user"\npassword "synthetic-password"\n'
  if stale:opt.write_text(old)
  if mode=='secret-copy':(etc/'pap-secrets').write_text('synthetic secret\n')
  body=defs.replace('/var/run/',str(run)+'/').replace('/etc/ppp/',str(etc)+'/').replace('/tmp/resolv.conf.ppp',str(root/'dns')).replace('/dev/ppp',str(root/'dev-ppp'))
  body=body.replace('[ -x /sbin/ujail ] && [ -f "$caps" ] && id -u ppp >/dev/null 2>&1', '[ "$JAIL_TEST" = 1 ]')
  pre='''#!/bin/sh
json_get_vars() { username=synthetic-user; password=synthetic-password; }
json_get_var() { eval "$1="; }
proto_run_command() { printf '%s\n' "$@" > "$TRACE/argv"; printf 'run\n' >> "$TRACE/events"; }
proto_notify_error() { printf 'notify:%s\n' "$2" >> "$TRACE/events"; }
proto_setup_failed() { printf 'setup-failed\n' >> "$TRACE/events"; }
proto_block_restart() { printf 'block-restart\n' >> "$TRACE/events"; }
proto_kill_command() { printf 'kill\n' >> "$TRACE/events"; }
chown() { [ "$MODE" != chown ] || [ "$2" = "$TRACE/dev-ppp" ] || [ "$2" = "$TRACE/run/pppd" ]; }
'''
  if mode in ['mktemp','mv','cat']:pre+=mode+'() { return 1; }\n'
  if mode=='secret-copy':pre+='cat() { return 1; }\n'
  if mode=='mkdir':pre+='mkdir() { return 1; }\n'
  tail='\nppp_generic_setup wan plugin pppoe.so nic-synthetic\nprintf "setup-rc:%s\\n" "$?" >> "$TRACE/events"\n'
  script=root/'test.sh';script.write_text(pre+body+tail)
  env=dict(PATH='/usr/bin:/bin',TRACE=td,JAIL_TEST=str(int(jail)),MODE=mode)
  r=subprocess.run(['/bin/sh',str(script)],env=env,text=True,capture_output=True,timeout=10);assert r.returncode==0,r.stderr
  events=(root/'events').read_text().splitlines();success=mode=='normal'
  assert (root/'argv').exists()==success,(mode,events,r.stderr)
  assert ('setup-rc:0' in events)==success,(mode,events)
  if success:
   assert opt.read_text()==expected
   assert opt.stat().st_mode&0o777==0o600
  else:
   assert 'notify:AUTH_FILE_ERROR' in events and 'setup-failed' in events and 'block-restart' not in events
   assert (opt.read_text() if opt.exists() else None)==(old if stale else None)
  assert not list(run.glob('.pppd.*')),(mode,'leaked temp')
  cases.append(dict(mode=mode,stale=stale,jail=jail,events=events,launch=success,tempfiles_clean=True))
  if mode in ['mktemp','cat','mv']:
   # Repeat setup after transient command failure; neither restart nor credentials are changed.
   retry=root/'retry.sh';retry.write_text(pre+body+'\nunset -f '+mode+'\n'+tail)
   (root/'events').unlink();rr=subprocess.run(['/bin/sh',str(retry)],env=env,text=True,capture_output=True,timeout=10)
   assert rr.returncode==0 and (root/'argv').exists() and opt.read_text()==expected,(mode,rr.stderr)
   cases[-1]['retry_after_fault_removed']='launches with current credentials'
subprocess.run(['/bin/sh','-n',str(p)],check=True)
(T/'failure-path-tests.json').write_text(json.dumps(dict(source_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),cases=cases,case_count=len(cases),passed=True,limits=['Complete selected shell functions; JSON/proto/chown callbacks and command failures modeled; paths relocated to isolated temporary directories.', 'No pppd/netifd process, ISP, router or RF execution. Filesystem install, permissions and cleanup use host filesystem.']),indent=2)+'\n')
print('PASS',len(cases),'setup/failure cases; transient retry and shell syntax')
