from pathlib import Path
import tempfile,subprocess,json
lab=Path(__file__).parent;w=Path(__file__).resolve().parents[3]
board=(w/'target/linux/airoha/an7581/base-files/etc/init.d/airoha_fan').read_text();feed=(lab/'fan-feed-patched.sh').read_text()
results=[]
with tempfile.TemporaryDirectory(prefix='xr1710g-fan-') as tmp:
 root=Path(tmp);sys=root/'hwmon';sys.mkdir();wrong=sys/'hwmon5';wrong.mkdir();(wrong/'name').write_text('unrelated-device\n');(wrong/'pwm1_enable').write_text('sentinel\n')
 def run(src,kind,expect_ok,extra=''):
  text=src.replace('. "$IPKG_INSTROOT/lib/functions.sh"','').replace('/sys/class/hwmon/',str(sys)+'/')
  mock='''
logger() { printf '%s\\n' "$*"; }
board_name() { echo gemtek,xr1710g; }
uci() {
 case "$4" in *) ;; esac
 key="$3"
 case "$key" in
 fan.settings.mode) echo "${TEST_MODE:-auto}";;
 fan.settings.curve_preset) echo "${TEST_PRESET:-balanced}";;
 fan.settings.manual_pwm) echo "${TEST_PWM:-127}";;
 *.point1_temp) echo "${TEST_T1:-40}";;
 *.point2_temp) echo 50;; *.point3_temp) echo 60;; *.point4_temp) echo 70;; *.point5_temp) echo 80;;
 *.point1_pwm) echo 54;; *.point2_pwm) echo 69;; *.point3_pwm) echo 95;; *.point4_pwm) echo 199;;
 esac
}
'''
  p=root/'test.sh';p.write_text(mock+text+'\n'+extra+'\n'+('boot' if kind=='board' else 'apply_settings')+'\n')
  subprocess.run(['sh','-n',str(p)],check=True)
  res=subprocess.run(['sh',str(p)],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  assert (res.returncode==0)==expect_ok,(kind,extra,res.stdout)
  assert (wrong/'pwm1_enable').read_text()=='sentinel\n'
  return res
 for src,kind in [(board,'board'),(feed,'feed')]:
  run(src,kind,False);results.append(kind+': missing NCT7802 does not write unrelated hwmon5')
 hw=sys/'hwmon9';hw.mkdir();(hw/'name').write_text('nct7802\n')
 for n in ['pwm1_enable','pwm1']+[f'pwm1_auto_point{i}_temp' for i in range(1,6)]+[f'pwm1_auto_point{i}_pwm' for i in range(1,5)]: (hw/n).write_text('0\n')
 for src,kind in [(board,'board'),(feed,'feed')]:
  run(src,kind,True);assert (hw/'pwm1_enable').read_text().strip()=='2';assert (hw/'pwm1_auto_point3_temp').read_text().strip()=='60000';results.append(kind+': discovers hwmon9 and programs existing curve')
 for extra in ['TEST_T1=60','TEST_T1=invalid','TEST_T1=08','TEST_PRESET=unknown','TEST_MODE=manual; TEST_PWM=300','TEST_MODE=invalid']:
  run(feed,'feed',False,extra);assert (hw/'pwm1_enable').read_text().strip()=='1';assert (hw/'pwm1').read_text().strip()=='255';results.append('feed: invalid setting -> full PWM ('+extra+')')
 run(feed,'feed',True,'TEST_MODE=manual; TEST_PWM=127');assert (hw/'pwm1').read_text().strip()=='127';results.append('feed: valid manual mode retained')
 broken=hw/'pwm1_auto_point3_temp';broken.unlink();broken.mkdir()
 for src,kind in [(board,'board'),(feed,'feed')]:
  run(src,kind,False);assert (hw/'pwm1_enable').read_text().strip()=='1';assert (hw/'pwm1').read_text().strip()=='255';results.append(kind+': failed table write -> full PWM requested')
print('\n'.join('PASS '+x for x in results));(lab/'fan-behavior-test.log').write_text('\n'.join('PASS '+x for x in results)+'\n')