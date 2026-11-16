from pathlib import Path
import subprocess,os
B=Path(__file__).resolve().parents[2]
O=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-scoped-stat-worker-tests'));O.mkdir(parents=True,exist_ok=True)
P=Path(os.environ.get('B27_MT76_DIR',str(B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
env=dict(os.environ,B27_TEST_DIR=str(O),B27_MT76_DIR=str(P));subprocess.run(['python3',str(B/'scripts/xr1710g-b27-stock-txop/stat-query-send-tests.py')],env=env,check=True)
s=(O/'actual-scoped-tests.c').read_text()
s=s.replace('struct mt7996_dev {','struct wiphy {int dummy;};struct wiphy_work {int dummy;};struct wiphy_delayed_work {struct wiphy_work work;};\nstruct mt7996_dev {')
s=s.replace('struct mt7996_phy phy;bool stock_policy;','struct mt7996_phy phy;unsigned stock_interfaces;struct wiphy_delayed_work stock_work;bool stock_policy;')
s=s.replace('struct mt76_phy {u8 band_idx;', 'struct mt76_phy {unsigned long state;u8 band_idx;')
s=s.replace('struct {void *dev;} mt76;', 'struct {void *dev;int mutex;} mt76;')
a=(P/'mt7996/stock_policy.c').read_text();worker=a[a.index('static void mt7996_stock_work('):a.index('void mt7996_stock_init(')]
shim=r'''
#define MT76_STATE_RUNNING 2
#define mt7996_for_each_phy(dev,phy) for((phy)=&(dev)->phy;(phy);(phy)=NULL)
#define mutex_lock(p) ((void)(p))
#define mutex_unlock(p) ((void)(p))
#define mt76_hw(d) ((void*)(d))
static struct ieee80211_sta *test_stations[2];static unsigned test_num,queued;
static struct ieee80211_vif *test_vifs[2];
static void ieee80211_iterate_stations_atomic(void *hw,void(*fn)(void*,struct ieee80211_sta*),void *d){(void)hw;for(unsigned i=0;i<test_num;i++)fn(d,test_stations[i]);}
static void ieee80211_iterate_active_interfaces_mtx(void *hw,int flag,void(*fn)(void*,u8*,struct ieee80211_vif*),void *d){(void)hw;(void)flag;for(unsigned i=0;i<test_num;i++)fn(d,NULL,test_vifs[i]);}
static void mt7996_stock_near_far(void *d,struct ieee80211_sta *sta){(void)d;(void)sta;}
static void wiphy_delayed_work_queue(struct wiphy *w,struct wiphy_delayed_work *dw,unsigned delay){(void)w;(void)dw;assert(delay==HZ);queued++;}
'''
s=s.replace('struct fixture {',shim+worker+'struct fixture {',1);s=s[:s.index('int main(void)')]+r'''
int main(void){
 struct fixture f;setup(&f);struct wiphy w={0};test_num=1;test_stations[0]=&f.sta;test_vifs[0]=&f.v;f.d.phy.mt76=&f.mp;
 mt7996_stock_work(&w,&f.d.stock_work.work);assert(!sends&&!queued);
 f.d.stock_interfaces=1;mt7996_stock_work(&w,&f.d.stock_work.work);assert(!sends&&queued==1);
 f.mp.state=BIT(MT76_STATE_RUNNING);mt7996_stock_work(&w,&f.d.stock_work.work);assert(sends==3&&f.d.stock_query_valid==7);
 struct mt7996_vif *mv=(void*)f.v.drv_priv;
 jiffies+=HZ;full(&f,HZ);send_errors[1]=-5;mt7996_stock_work(&w,&f.d.stock_work.work);assert(f.d.stock_query_dirty==2&&f.d.stock_query_valid==5&&mv->link_info[0].stock.active&&actual==187);
 jiffies+=HZ;full(&f,HZ);send_errors[1]=0;mt7996_stock_work(&w,&f.d.stock_work.work);assert(!f.sl.stock_avg.rx_bytes&&f.d.stock_query_dirty==0&&f.d.stock_query_valid==5&&mv->link_info[0].stock.active);
 jiffies+=HZ;full(&f,HZ);mt7996_stock_work(&w,&f.d.stock_work.work);assert(!f.sl.stock_avg.rx_bytes&&f.d.stock_query_valid==7&&mv->link_info[0].stock.active);
 jiffies+=HZ;full(&f,HZ);mt7996_stock_work(&w,&f.d.stock_work.work);assert(f.sl.stock_avg.rx_bytes==10000000&&f.sl.stock_avg.tx_per_valid&&mv->link_info[0].stock.active&&f.d.stock_query_rebases[1]==1);
 f.d.mphy.state=BIT(MT76_RESET);unsigned saved=sends;mt7996_stock_work(&w,&f.d.stock_work.work);assert(sends==saved);
 f.d.mphy.state=0;jiffies+=HZ;f.d.stock_epoch++;full(&f,HZ);mt7996_stock_work(&w,&f.d.stock_work.work);assert(sends==saved+3&&mv->link_info[0].stock.active);
 puts("PASS 9 actual worker cases: no-interface, stopped, running, failure, rebase, automatic recovery, reset; no global policy shutdown");
}
'''
(O/'actual-scoped-worker-tests.c').write_text(s)
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-Wno-unused-parameter','-Wno-sign-compare','-Wno-unused-function','-fsanitize=address,undefined','-O1','-g','-I'+str(O),str(O/'actual-scoped-worker-tests.c'),'-o',str(O/'actual-scoped-worker-tests')],capture_output=True,text=True);(O/'worker-compile.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
r=subprocess.run([str(O/'actual-scoped-worker-tests')],capture_output=True,text=True);(O/'worker-run.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
print(r.stdout)