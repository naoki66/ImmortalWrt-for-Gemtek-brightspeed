from pathlib import Path
import subprocess,json
lab=Path(__file__).parent
subprocess.run(['python3',str(lab/'make-driver-test.py')],check=True)
p=lab/'patched/drivers/phy/airoha/test_actual_driver.c';exe='/tmp/xr1710g-stock-phy-test'
subprocess.run(['cc','-std=gnu11','-Wall','-Wextra','-Werror','-fsanitize=undefined','-fno-sanitize-recover=undefined',str(p),'-o',exe],check=True)
s=subprocess.check_output([exe],text=True);(lab/'phy-model-test.log').write_text(s);print(s)
subprocess.run(['python3',str(lab/'trace-current-phy.py')],check=True,stdout=subprocess.DEVNULL)
checks=[]
for seed in [0,0xa5a5a5a5]:
 def read(name):return json.loads((lab/name).read_text())
 a=read(f'retail-main-phy-trace-{seed:08x}.json');b=read(f'current-main-phy-trace-{seed:08x}-1.json')
 def finals(t):return {e[1]:e[2] for e in t if e[0]=='W'}
 assert finals(a)==finals(b)
 assert read(f'baseline-optout-main-trace-{seed:08x}.json')==read(f'current-main-phy-trace-{seed:08x}-0.json')
 checks.append({'seed':hex(seed),'main_register_final_states_equal':True,'registers_compared':len(finals(a)),'non_optin_trace_unchanged':True,'limitations':'main init only; calibration calls stubbed, dynamic MMIO readback and post-init diagnostics excluded'})
 print('PASS',checks[-1])
(lab/'phy-trace-checks.json').write_text(json.dumps(checks,indent=2)+'\n')