from pathlib import Path
import ast,subprocess,json,hashlib,os
B=Path(__file__).resolve().parents[2];M=Path(os.environ.get('B27_MT76_DIR',str(B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')));T=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-reviewed-fixes-tests'))/'stat-windows';T.mkdir(parents=True,exist_ok=True)
fixture=B/'scripts/xr1710g-b27-stock-txop/completion-collect-tests.py';constants={}
for node in ast.parse(fixture.read_text()).body:
 if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str):
  for name in node.targets:
   if isinstance(name,ast.Name):constants[name.id]=node.value.value
pre=constants['pre']+'\n#define UNI_ALL_STA_TXRX_ADM_STAT 2\n#define UNI_ALL_STA_TXRX_MSDU_COUNT 3\n#define UNI_ALL_STA_TX_STAT 1\n#define MT76_MCU_RESET 0\n#define MT76_RESET 1\n#define test_bit(n,p) ((*(p) >> (n)) & 1)\n'
shim=constants['shim'].replace('struct mt76_wcid {u16 idx;};','struct mt76_wcid {u16 idx;bool sta;};').replace('bool stock_query_started;u8 stock_query_valid;};','bool stock_query_started;u8 stock_query_valid;bool stock_policy;struct {unsigned long state;} mphy;u64 stock_events[3];};')
s=(M/'mt7996/stock_policy.c').read_text();header=(M/'mt7996/mt7996.h').read_text();fields=header[header.index('struct mt7996_stock_stats {'):header.index('struct mt7996_stock_edca {')];bands=s[s.index('struct mt7996_stock_band {'):s.index('void mt7996_stock_event(')].split('/* AP MU EDCA', 1)[0]
event=s[s.index('void mt7996_stock_event('):s.index('/* Atomic iterator')];collect=s[s.index('static void mt7996_stock_collect('):s.index('/* A second pass')]
main=r'''
static void full(struct mt7996_dev *d,struct mt7996_sta_link *sl) {
 mt7996_stock_event(d,&sl->wcid,2,2000000,800000);
 mt7996_stock_event(d,&sl->wcid,3,1500,1000);
 mt7996_stock_event(d,&sl->wcid,1,1500,0);
}
int main(void) {
 for (int scenario=0;scenario<10;scenario++) {
  jiffies=100;
  struct mt7996_dev dev={.stock_epoch=7,.stock_policy=true};
  struct channel chan={0};struct mt76_phy mp={.band_idx=0,.chandef={&chan}};struct mt7996_phy phy={&mp};
  struct ieee80211_vif vif={.type=NL80211_IFTYPE_AP};struct mt7996_vif *mv=(void*)vif.drv_priv;mv->links[0].phy=&phy;
  struct ieee80211_sta sta={0};struct mt7996_sta *ms=(void*)sta.drv_priv;
  struct mt7996_sta_link sl={.wcid={.idx=42,.sta=true},.connected=true};ms->vif=mv;ms->link[0]=&sl;
  struct mt7996_stock_scene scene={.dev=&dev};
  full(&dev,&sl);mt7996_stock_collect(&scene,&sta);assert(sl.stock_avg.rx_pkt_len==800);
  jiffies=200;scene=(struct mt7996_stock_scene){.dev=&dev};
  if (scenario==7) {
   mt7996_stock_event(&dev,&sl.wcid,2,2000000,800000);dev.stock_epoch++;
   mt7996_stock_event(&dev,&sl.wcid,3,1500,1000);
  } else {
   if (scenario!=1) mt7996_stock_event(&dev,&sl.wcid,2,2000000,800000);
   if (scenario!=2) mt7996_stock_event(&dev,&sl.wcid,3,1500,1000);
   if (scenario!=3) mt7996_stock_event(&dev,&sl.wcid,1,1500,0);
   if (scenario>=4 && scenario<=6) mt7996_stock_event(&dev,&sl.wcid,scenario==6?1:scenario-2,2000000,800000);
   if (scenario==8) jiffies=500;
   if (scenario==9) mt7996_stock_event(&dev,&sl.wcid,99,0,0);
  }
  mt7996_stock_collect(&scene,&sta);
  assert(sl.stock_stats.seen==0);
  bool invalid=scenario==1||scenario==2||(scenario>=4&&scenario<=8);
  assert((sl.stock_avg.rx_pkt_len==0)==invalid);
  if (scenario==3) assert(!scene.band[0].main_valid);
  jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};
  full(&dev,&sl);mt7996_stock_collect(&scene,&sta);
  assert(sl.stock_avg.rx_pkt_len==800);
  assert(sl.stock_avg.rx_bytes==800000 && sl.stock_avg.rx_msdu==1000);
  assert(sl.stock_stats.seen==0);
  printf("scenario=%d recovered_avg_len=%u rx_bytes=%llu missing=%llu\n",scenario,sl.stock_avg.rx_pkt_len,(unsigned long long)sl.stock_avg.rx_bytes,(unsigned long long)dev.stock_missing);
 }
}
'''
(T/'stock_policy.h').write_bytes((M/'mt7996/stock_policy.h').read_bytes());c=T/'window-regression.c';c.write_text(pre+fields+shim+bands+event+collect+main)
cmd=['gcc','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-g','-O1','-I'+str(T),str(c),'-o',str(T/'window-regression')]
r=subprocess.run(cmd,text=True,capture_output=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'window-regression')],capture_output=True,text=True);(T/'window-regression.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
logs=[]
for name in ['completion-collect-tests.py','completion-event-tests.py']:
 env=dict(__import__('os').environ,B27_TEST_DIR=str(T/'existing-regressions'))
 r2=subprocess.run(['python3',str(fixture.parent/name)],text=True,capture_output=True,env=env);(T/(name+'.log')).write_text(r2.stdout+r2.stderr);assert r2.returncode==0,(name,r2.stderr);logs.append(name)
(T/'window-regression.json').write_text(json.dumps(dict(passed=True,scenarios=10,source_sha256=hashlib.sha256(s.encode()).hexdigest(),output=r.stdout,existing_regressions=logs,compile=cmd,limits=['Complete actual event and collect C functions with actual state/header; kernel locks, RCU/topology, BA calls and clock are shims.', 'Repairs tested host carry-over/duplication, no shared firmware request ID exists; arbitrary late replies/counter interval mismatches are not solved or proven safe.', 'No hardware, airtime, PPP or actual latency/iperf test.']),indent=2)+'\n')
print(r.stdout);print('PASS existing event/collect regressions')
