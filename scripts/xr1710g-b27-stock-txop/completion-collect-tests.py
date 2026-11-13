from pathlib import Path
import os, subprocess
B = Path(__file__).resolve().parents[2]
D = Path(os.environ.get('B27_MT76_DIR', str(B / 'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
T = Path(os.environ.get('B27_TEST_DIR', '/tmp/xr1710g-b27-scheduler-tests'))
T.mkdir(parents=True, exist_ok=True)
for name in ['stock_policy.c', 'mt7996.h', 'stock_policy.h']:
    dest = name if name == 'stock_policy.h' else 'current-' + name
    (T / dest).write_bytes((D / 'mt7996' / name).read_bytes())
s=(D/'mt7996/stock_policy.c').read_text();h=(D/'mt7996/mt7996.h').read_text()
fn=s[s.index('static void mt7996_stock_collect('):s.index('/* A second pass')];bands=s[s.index('struct mt7996_stock_band {'):s.index('void mt7996_stock_event(')];fields=h[h.index('struct mt7996_stock_stats {'):h.index('struct mt7996_stock_edca {')]
pre=r'''
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include <string.h>
#include <assert.h>
#include <stdio.h>
typedef uint8_t u8;typedef uint16_t u16;typedef uint32_t u32;typedef uint64_t u64;
#define READ_ONCE(x) (x)
#define U64_MAX UINT64_MAX
#define div64_u64(n,d) ((n)/(d))
#define div_u64(n,d) ((n)/(d))
#define BIT(n) (1UL<<(n))
#define STOCK_BYTES BIT(0)
#define STOCK_MSDU BIT(1)
#define STOCK_MPDU BIT(2)
#define spin_lock_bh(p) ((void)(p))
#define spin_unlock_bh(p) ((void)(p))
#define container_of(ptr,type,member) ((type*)((char*)(ptr)-offsetof(type,member)))
#define rcu_dereference(p) (p)
#define IEEE80211_MLD_MAX_NUM_LINKS 16
#define MT7996_MAX_RADIOS 3
#define NL80211_IFTYPE_AP 1
#define NL80211_IFTYPE_STATION 2
#define NL80211_BAND_2GHZ 0
#define HZ 100
#define time_after(a,b) ((long)((b)-(a))<0)
#define jiffies_to_msecs(j) ((j)*10)
#define max_t(t,a,b) ((t)(a)>(t)(b)?(t)(a):(t)(b))
static unsigned long jiffies=100;
#include "stock_policy.h"
'''
shim=r'''
struct mt76_wcid {u16 idx;};
struct mt7996_sta_link {struct mt76_wcid wcid;struct mt7996_stock_stats stock_stats;struct mt7996_stock_average stock_avg;u32 stock_avg_epoch;unsigned long stock_sampled;bool connected;};
struct channel {int band;};
struct mt76_phy {u8 band_idx;struct {struct channel *chan;} chandef;};
struct mt7996_phy {struct mt76_phy *mt76;};
struct mt7996_vif_link {struct mt7996_phy *phy;};
struct mt7996_vif {struct mt7996_vif_link links[16];struct {struct {bool enabled;} stock;} link_info[16];};
struct ieee80211_vif {int type;_Alignas(16) unsigned char drv_priv[sizeof(struct mt7996_vif)];};
struct mt7996_sta {struct mt7996_vif *vif;struct mt7996_sta_link *link[16];};
struct ieee80211_sta {bool mlo;_Alignas(16) unsigned char drv_priv[sizeof(struct mt7996_sta)];};
struct mt7996_dev {int stock_stats_lock;u32 stock_epoch;u64 stock_missing;};
static void mt7996_stock_ba_update(struct mt7996_dev *d,struct mt7996_sta *m,struct mt7996_sta_link *s,bool enable,bool sample){(void)d;(void)m;(void)s;(void)enable;(void)sample;}
static struct mt7996_vif_link *mt7996_vif_link(struct mt7996_dev *d,struct ieee80211_vif *v,int i){(void)d;return &((struct mt7996_vif*)v->drv_priv)->links[i];}
static struct mt7996_phy *mt7996_vif_link_phy(struct mt7996_vif_link *v){return v->phy;}
'''
main=r'''
static void sample(struct mt7996_sta_link *sl,unsigned epoch,unsigned seen){
 sl->stock_stats=(struct mt7996_stock_stats){.epoch=epoch,.seen=seen,.started=jiffies,.tx_bytes=4000,.rx_bytes=6000,.tx_msdu=5,.rx_msdu=10,.tx_mpdu=100,.tx_attempts=100,.tx_failed=40};
}
int main(void){
 struct mt7996_dev dev={.stock_epoch=7};struct channel chan={0};struct mt76_phy mp={.band_idx=0,.chandef={&chan}};struct mt7996_phy phy={&mp};
 struct ieee80211_vif vif={.type=NL80211_IFTYPE_AP};struct mt7996_vif *mv=(void*)vif.drv_priv;mv->links[0].phy=&phy;
 struct ieee80211_sta sta={0};struct mt7996_sta *ms=(void*)sta.drv_priv;struct mt7996_sta_link sl={.wcid.idx=42,.connected=true};ms->vif=mv;ms->link[0]=&sl;
 struct mt7996_stock_scene scene={.dev=&dev};
 sample(&sl,7,7);mt7996_stock_collect(&scene,&sta);
 assert(scene.band[0].mcli_rx_clients==1);assert(sl.stock_avg.rx_pkt_len==600);
 assert(sl.stock_avg.tx_per_valid&&sl.stock_avg.tx_per==40&&sl.stock_avg.tx_attempts==100);
 assert(scene.band[0].main_per_valid&&scene.band[0].main_per==40&&scene.band[0].main_wcid==42);
 assert(sl.stock_stats.seen==0);
 jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,7,7);mt7996_stock_collect(&scene,&sta);
 assert(scene.band[0].mcli_rx_clients==0); /* previous RX length=600 selects 70%, not 50% */
 jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,7,3);sl.stock_stats.tx_attempts=0;sl.stock_stats.tx_failed=0;mt7996_stock_collect(&scene,&sta);
 assert(!sl.stock_avg.tx_per_valid&&!scene.band[0].main_per_valid);
 jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,7,7);sl.stock_stats.tx_stat_invalid=true;mt7996_stock_collect(&scene,&sta);assert(!sl.stock_avg.tx_per_valid);
 jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,7,1);mt7996_stock_collect(&scene,&sta);assert(!sl.stock_avg.tx_per_valid&&sl.stock_avg.rx_pkt_len==0&&dev.stock_missing==1);
 dev.stock_epoch++;jiffies+=HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,8,7);mt7996_stock_collect(&scene,&sta);
 assert(sl.stock_avg_epoch==8&&sl.stock_avg.tx_per_valid&&scene.band[0].mcli_rx_clients==1);
 jiffies+=4*HZ;scene=(struct mt7996_stock_scene){.dev=&dev};sample(&sl,8,7);mt7996_stock_collect(&scene,&sta);assert(!sl.stock_avg.tx_per_valid&&dev.stock_missing==2);

 jiffies+=HZ;mp.chandef.chan=0;scene=(struct mt7996_stock_scene){.dev=&dev};memset(&sl.stock_avg,0,sizeof(sl.stock_avg));sample(&sl,8,7);mt7996_stock_collect(&scene,&sta);
 assert(scene.band[0].mcli_tx_clients==0&&scene.band[0].mcli_rx_clients==0);
 puts("PASS: actual collection: paired PER, missing/invalid reports, previous-cycle length ordering, epoch clearing and long-gap invalidation");
}
'''
p=T/'completion-collect-test.c';p.write_text(pre+fields+shim+bands+fn+main)
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-g','-O1','-I'+str(T),str(p),'-o',str(T/'completion-collect-test')],text=True,capture_output=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'completion-collect-test')],text=True,capture_output=True);(T/'completion-collect-test.log').write_text(r.stdout+r.stderr);print(r.stdout,r.stderr);assert r.returncode==0
