from pathlib import Path
import subprocess,json
B=Path(__file__).resolve().parents[2];O=Path(__import__('os').environ.get('B27_TEST_DIR','/tmp/xr1710g-scoped-stat-tests'));O.mkdir(parents=True,exist_ok=True);P=Path(__import__('os').environ.get('B27_MT76_DIR',str(B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')));s=(P/'mt7996/stock_policy.c').read_text()
base=(B/'scripts/xr1710g-b27-stock-txop/fixtures/stat-query-kernel-shim.c').read_text()
base=base.replace('int stock_stats_lock;u32 stock_epoch;u64 stock_missing,stock_events[3];bool stock_policy;', 'int stock_stats_lock;u32 stock_epoch;u64 stock_missing,stock_events[3],stock_polls,stock_query_attempts[3],stock_query_failures[3],stock_query_rebases[3];int stock_query_error[3];u8 stock_query_valid,stock_query_dirty;bool stock_query_started;struct mt7996_phy phy;bool stock_policy;')
pre=r'''
#define ARRAY_SIZE(x) (sizeof(x)/sizeof((x)[0]))
#define MT76_MCU_RESET 0
#define MT76_RESET 1
#define test_bit(b,p) (!!(*(p)&BIT(b)))
#define UNI_ALL_STA_TXRX_ADM_STAT 2
#define UNI_ALL_STA_TXRX_MSDU_COUNT 6
#define UNI_ALL_STA_TX_STAT 1
static unsigned sends;static int send_errors[3];
static int mt7996_mcu_get_all_sta_info(struct mt7996_phy *p,u16 tag){(void)p;(void)tag;return send_errors[sends++%3];}
'''
bands=s[s.index('struct mt7996_stock_band {'):s.index('/* AP MU EDCA')]
query=s[s.index('static void mt7996_stock_query('):s.index('void mt7996_stock_event(')]
event=s[s.index('void mt7996_stock_event('):s.index('/* Atomic iterator')]
collect=s[s.index('static void mt7996_stock_collect('):s.index('/* A second pass')]
apply=s[s.index('static void mt7996_stock_apply('):s.index('static void mt7996_stock_work(')]
main=r'''
struct fixture {struct mt7996_dev d;struct channel c;struct mt76_phy mp;struct mt7996_phy p;struct ieee80211_bss_conf conf;struct ieee80211_vif v;struct ieee80211_sta sta;struct mt7996_sta_link sl;};
static void setup(struct fixture *f){
 memset(f,0,sizeof(*f));sends=0;memset(send_errors,0,sizeof(send_errors));jiffies=1000;calls=0;
 f->d.stock_policy=true;f->d.stock_epoch=7;f->mp.chandef.chan=&f->c;f->p.mt76=&f->mp;f->conf.enable_beacon=true;f->v.type=NL80211_IFTYPE_AP;f->v.conf[0]=&f->conf;
 struct mt7996_vif *mv=(void*)f->v.drv_priv;mv->links[0].phy=&f->p;mv->link_info[0].stock.enabled=true;mv->link_info[0].queue_params[0].txop=42;
 struct mt7996_sta *ms=(void*)f->sta.drv_priv;ms->vif=mv;ms->link[0]=&f->sl;f->sl.wcid.idx=42;f->sl.wcid.sta=true;f->sl.connected=true;f->sl.stock_avg_epoch=7;f->sl.stock_sampled=jiffies-HZ;
}
static void full(struct fixture *f,unsigned interval){
 mt7996_stock_event(&f->d,&f->sl.wcid,UNI_ALL_STA_TXRX_ADM_STAT,70000000ULL*interval/HZ,10000000ULL*interval/HZ);
 mt7996_stock_event(&f->d,&f->sl.wcid,UNI_ALL_STA_TXRX_MSDU_COUNT,10000*interval/HZ,200000*interval/HZ);
 mt7996_stock_event(&f->d,&f->sl.wcid,UNI_ALL_STA_TX_STAT,100,20);
}
static void collect(struct fixture *f){struct mt7996_stock_scene sc={.dev=&f->d};mt7996_stock_collect(&sc,&f->sta);mt7996_stock_apply(&sc,NULL,&f->v);assert(((struct mt7996_vif*)f->v.drv_priv)->link_info[0].stock.active);}
int main(void){
 unsigned n=0;struct fixture f;
 for(unsigned interval=50;interval<=200;interval*=2)for(unsigned mask=0;mask<8;mask++){
  setup(&f);for(unsigned i=0;i<3;i++)send_errors[i]=(mask&BIT(i))?-5:0;
  mt7996_stock_query(&f.d);assert(sends==3&&f.d.stock_query_valid==(7^mask)&&f.d.stock_query_dirty==mask);
  for(unsigned i=0;i<3;i++)assert(f.d.stock_query_attempts[i]==1&&f.d.stock_query_failures[i]==!!(mask&BIT(i))&&f.d.stock_query_error[i]==send_errors[i]);
  full(&f,interval);f.sl.stock_sampled=jiffies-interval;collect(&f);
  assert(!!f.sl.stock_avg.rx_bytes==!(mask&3));assert(f.sl.stock_avg.tx_per_valid==(mask==0));n++;
  memset(send_errors,0,sizeof(send_errors));jiffies+=interval;mt7996_stock_query(&f.d);full(&f,interval);collect(&f);
  assert(f.d.stock_query_dirty==0&&f.d.stock_query_valid==(7^mask));
  assert(!!f.sl.stock_avg.rx_bytes==!(mask&3));assert(f.sl.stock_avg.tx_per_valid==(mask==0));
  for(unsigned i=0;i<3;i++){assert(f.d.stock_query_rebases[i]==!!(mask&BIT(i)));}n++;
  jiffies+=interval;mt7996_stock_query(&f.d);full(&f,interval);collect(&f);
  assert(f.d.stock_query_valid==7&&f.sl.stock_avg.rx_bytes==10000000&&f.sl.stock_avg.rx_pkt_len==50&&f.sl.stock_avg.tx_per_valid&&f.sl.stock_avg.tx_per==20);n++;
 }
 /* A missing optional TX_STAT must leave bytes/MSDU available, then recover. */
 setup(&f);mt7996_stock_query(&f.d);full(&f,HZ);f.sl.stock_stats.seen &= ~STOCK_MPDU;collect(&f);assert(f.sl.stock_avg.rx_bytes==10000000&&!f.sl.stock_avg.tx_per_valid);n++;
 jiffies+=HZ;mt7996_stock_query(&f.d);full(&f,HZ);collect(&f);assert(f.sl.stock_avg.tx_per_valid);n++;
 /* Duplicate or missing sample on one peer does not poison another peer. */
 setup(&f);struct fixture other;setup(&other);mt7996_stock_query(&f.d);full(&f,HZ);
 struct mt7996_stock_scene scene={.dev=&f.d};mt7996_stock_collect(&scene,&other.sta);mt7996_stock_collect(&scene,&f.sta);assert(f.sl.stock_avg.rx_bytes==10000000&&!other.sl.stock_avg.rx_bytes);n++;
 jiffies+=HZ;mt7996_stock_query(&f.d);full(&f,HZ);mt7996_stock_event(&f.d,&f.sl.wcid,UNI_ALL_STA_TX_STAT,100,20);collect(&f);assert(!f.sl.stock_avg.rx_bytes);n++;
 jiffies+=HZ;mt7996_stock_query(&f.d);full(&f,HZ);collect(&f);assert(f.sl.stock_avg.rx_bytes==10000000&&f.sl.stock_avg.tx_per_valid);n++;
 /* Consecutive send failures do not clear rebase debt; each recovery is counted. */
 setup(&f);for(unsigned k=0;k<3;k++){send_errors[1]=-12;mt7996_stock_query(&f.d);full(&f,HZ);collect(&f);jiffies+=HZ;}
 assert(f.d.stock_query_failures[1]==3&&f.d.stock_query_rebases[1]==0&&f.d.stock_query_dirty==2);n++;
 send_errors[1]=0;mt7996_stock_query(&f.d);assert(f.d.stock_query_rebases[1]==1&&f.d.stock_query_valid==5);n++;
 mt7996_stock_query(&f.d);full(&f,HZ);collect(&f);assert(f.d.stock_query_valid==7&&f.sl.stock_avg.rx_bytes);n++;
 /* Unknown/reset events do not turn into a device-lifetime fault. */
 setup(&f);f.d.mphy.state=BIT(MT76_RESET);full(&f,HZ);assert(!f.sl.stock_stats.seen);f.d.mphy.state=0;f.d.stock_epoch++;mt7996_stock_query(&f.d);full(&f,HZ);collect(&f);assert(f.sl.stock_avg.tx_per_valid);n++;
 printf("PASS %u actual C cases: per-tag send masks, read-clear rebase, automatic recovery, optional PER, peer isolation, no global shutdown\n",n);assert(n==81);
}
'''
code=base+pre+bands+query+event+collect+apply+main;(O/'actual-scoped-tests.c').write_text(code);(O/'stock_policy.h').write_bytes((P/'mt7996/stock_policy.h').read_bytes())
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-Wno-unused-parameter','-Wno-sign-compare','-fsanitize=address,undefined','-O1','-g','-I'+str(O),str(O/'actual-scoped-tests.c'),'-o',str(O/'actual-scoped-tests')],capture_output=True,text=True);(O/'compile.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
r=subprocess.run([str(O/'actual-scoped-tests')],capture_output=True,text=True);(O/'run.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
print(r.stdout)