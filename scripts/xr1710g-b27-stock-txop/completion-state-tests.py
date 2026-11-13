from pathlib import Path
import subprocess
import os
B = Path(__file__).resolve().parents[2]
D = Path(os.environ.get('B27_MT76_DIR', str(B / 'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
T = Path(os.environ.get('B27_TEST_DIR', '/tmp/xr1710g-b27-scheduler-tests'))
T.mkdir(parents=True, exist_ok=True)
for name in ['stock_policy.c', 'mt7996.h', 'stock_policy.h']:
    dest = name if name == 'stock_policy.h' else 'current-' + name
    (T / dest).write_bytes((D / 'mt7996' / name).read_bytes())
s=(T/'current-stock_policy.c').read_text();h=(T/'current-mt7996.h').read_text()
fn=s[s.index('static void mt7996_stock_apply('):s.index('static void mt7996_stock_work(')]
bands=s[s.index('struct mt7996_stock_band {'):s.index('void mt7996_stock_event(')]
edca=h[h.index('struct mt7996_stock_edca {'):h.index('struct mt7996_sta_link {')]
preamble=r'''
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <assert.h>
typedef uint8_t u8;typedef uint16_t u16;typedef uint32_t u32;typedef uint64_t u64;
#define IEEE80211_MLD_MAX_NUM_LINKS 16
#define MT7996_MAX_RADIOS 3
#define NL80211_IFTYPE_AP 1
#define NL80211_IFTYPE_STATION 2
#define READ_ONCE(x) (x)
#define U16_MAX UINT16_MAX
#define U64_MAX UINT64_MAX
#define div64_u64(n,d) ((n)/(d))
#define min_t(t,a,b) ((t)(a)<(t)(b)?(t)(a):(t)(b))
#define dev_warn_ratelimited(...) ((void)0)
#include "stock_policy.h"
'''
shim=r'''
struct queue_params { unsigned mu_edca_timer; };
struct params {struct queue_params mu_edca_param_rec;u16 txop;};
struct mt7996_vif_link_info {struct params queue_params[4];struct mt7996_stock_edca stock;};
struct mt76_phy {u8 band_idx;};
struct mt7996_phy {struct mt76_phy *mt76;};
struct mt7996_vif_link {struct mt7996_phy *phy;};
struct mt7996_vif {struct mt7996_vif_link_info link_info[16];struct mt7996_vif_link links[16];};
struct ieee80211_bss_conf {bool enable_beacon;};
struct ieee80211_vif {void *drv_priv;int type;struct ieee80211_bss_conf *conf[16];};
struct mt7996_dev {unsigned stock_epoch;struct {void *dev;} mt76;};
static struct ieee80211_bss_conf *link_conf_dereference_protected(struct ieee80211_vif *v,int i){return v->conf[i];}
static struct mt7996_vif_link *mt7996_vif_link(struct mt7996_dev *d,struct ieee80211_vif *v,int i){(void)d;return &((struct mt7996_vif *)v->drv_priv)->links[i];}
static struct mt7996_phy *mt7996_vif_link_phy(struct mt7996_vif_link *v){return v->phy;}
static int calls, fail, actual;
static int mt7996_mcu_set_tx(struct mt7996_dev *d,struct ieee80211_vif *v,struct ieee80211_bss_conf *c){
 struct mt7996_vif *m=v->drv_priv;(void)d;(void)c;calls++;
 if(fail)return -110;
 actual=m->link_info[0].stock.active?m->link_info[0].stock.txop:m->link_info[0].queue_params[0].txop;return 0;
}
'''
main=r'''
int main(void){
 assert(!mt7996_stock_near_far_fast(10,5200));
 assert(mt7996_stock_near_far_fast(11,5200));
 assert(!mt7996_stock_near_far_fast(11,5199));
 assert(mt7996_stock_near_far_slow(11,540));
 assert(!mt7996_stock_near_far_slow(11,541));
 assert(!mt7996_stock_near_far_slow(11,0));
 struct mt7996_dev dev={0};struct mt76_phy mp={0};struct mt7996_phy phy={&mp};
 struct mt7996_vif mv={0};struct ieee80211_bss_conf conf={true};
 struct ieee80211_vif vif={.drv_priv=&mv,.type=NL80211_IFTYPE_AP,.conf={&conf}};
 struct mt7996_stock_scene scene={.dev=&dev};struct mt7996_stock_band *b=&scene.band[0];
 struct mt7996_stock_edca *st=&mv.link_info[0].stock;
 mv.links[0].phy=&phy;st->enabled=true;
 mt7996_stock_apply(&scene,0,&vif);assert(actual==187&&st->updates==1);
 b->selected=&vif;b->near_fast=true;b->near_slow=true;
 mt7996_stock_apply(&scene,0,&vif);assert(actual==0&&st->near_far);
 b->near_fast=false;mt7996_stock_apply(&scene,0,&vif);assert(actual==187&&!st->near_far);
 b->selected=0;b->near_slow=false;
 int n=calls;mt7996_stock_apply(&scene,0,&vif);assert(calls==n);
 b->ap=&vif;b->ap_rx=2000000;b->ap_packets=1000;
 mt7996_stock_apply(&scene,0,&vif);assert(actual==0&&st->ul);
 b->ap_rx=0;b->ap_packets=0;
 mt7996_stock_apply(&scene,0,&vif);assert(actual==187&&!st->ul);
 b->ap_rx=2000000;b->ap_packets=1000;mv.link_info[0].queue_params[0].mu_edca_param_rec.mu_edca_timer=1;
 mt7996_stock_apply(&scene,0,&vif);assert(actual==187&&!st->ul);
 mv.link_info[0].queue_params[0].mu_edca_param_rec.mu_edca_timer=0;
 b->mlo=true;b->main=&vif;b->selected=&vif;b->main_valid=true;b->main_tx=700000;b->main_mpdu=1000;
 fail=1;unsigned updates=st->updates;
 mt7996_stock_apply(&scene,0,&vif);assert(st->txop==187&&actual==187&&st->error==-110&&st->failures==1&&st->updates==updates);
 fail=0;mt7996_stock_apply(&scene,0,&vif);assert(st->txop==0&&actual==0&&st->error==0);
 b->main_tx=701000;mt7996_stock_apply(&scene,0,&vif);assert(actual==187);
 b->main_tx=700000;b->main_valid=false;mt7996_stock_apply(&scene,0,&vif);assert(actual==187);
 st->enabled=false;mt7996_stock_apply(&scene,0,&vif);assert(!st->active&&actual==0);
 st->enabled=true;mt7996_stock_apply(&scene,0,&vif);assert(st->active&&actual==187);
 n=calls;dev.stock_epoch++;mt7996_stock_apply(&scene,0,&vif);assert(calls==n+1&&st->epoch==dev.stock_epoch);
 n=calls;conf.enable_beacon=false;st->enabled=false;mt7996_stock_apply(&scene,0,&vif);assert(calls==n);

 /* Paired PER input: valid zero failure differs from no report/attempts. */
 u8 per=99;
 assert(!mt7996_stock_per(0,0,&per)&&per==99);
 assert(!mt7996_stock_per(10,11,&per));
 assert(mt7996_stock_per(100,0,&per)&&per==0);
 assert(mt7996_stock_per(100,35,&per)&&per==35);
 assert(mt7996_stock_per(100,36,&per)&&per==36);
 assert(mt7996_stock_per(UINT32_MAX,UINT32_MAX,&per)&&per==100);
 assert(!mt7996_stock_per(UINT64_MAX,0,&per));
 /* Staged rounding and previous RX length matter around ACK thresholds. */
 assert(mt7996_stock_traffic(0,0,0)==0);
 assert(mt7996_stock_traffic(4,6,0)==MT7996_STOCK_UPLINK);
 assert(mt7996_stock_traffic(4,6,256)==0);
 assert(mt7996_stock_traffic(7,3,256)==0);
 assert(mt7996_stock_traffic(8,2,256)==MT7996_STOCK_DL);
 assert(mt7996_stock_traffic(1,1,0)==(MT7996_STOCK_DL|MT7996_STOCK_UPLINK));
 assert(!mt7996_stock_mcli_qualified(10,2560,0));
 assert(mt7996_stock_mcli_qualified(11,0,0));
 assert(mt7996_stock_mcli_qualified(0,2561,0));
 assert(!mt7996_stock_mcli_qualified(10,12800,1));
 assert(mt7996_stock_mcli_qualified(0,12801,1));
 /* Exercise actual apply: enter, hold, withdraw, target change, MCU retry. */
 conf.enable_beacon=true;st->enabled=true;b->mlo=false;b->ap_rx=0;b->ap_packets=0;
 b->mcli_target=&vif;b->main_mode=MT7996_STOCK_UPLINK;b->mcli_rx_clients=15;
 mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187);
 b->mcli_rx_clients=16;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli&&actual==0);
 b->main_mode=0;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli&&actual==0);
 b->main_mode=MT7996_STOCK_DL;mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187);
 b->main_mode=MT7996_STOCK_UPLINK;fail=1;unsigned mcli_failures=st->failures;
 mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187&&st->failures==mcli_failures+1);
 fail=0;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli&&actual==0);
 b->mcli_target=0;mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187);
 b->mcli_target=&vif;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli&&actual==0);
 b->main_mode=0;dev.stock_epoch++;mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187);
 b->main_mode=MT7996_STOCK_UPLINK;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli);
 st->enabled=false;mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&!st->active);
 st->enabled=true;mt7996_stock_apply(&scene,0,&vif);assert(st->mcli&&st->active);
 b->mcli_rx_clients=15;mt7996_stock_apply(&scene,0,&vif);assert(!st->mcli&&actual==187);
 puts("PASS: paired PER validation; MCLI qualification boundaries, previous RX length, actual apply enter/hold/withdraw/target/reset/MCU retry/disable; earlier TXOP regressions");
 puts("PASS: actual driver apply function: automatic AP/MLO selection, idle restoration, MU, missing MPDU fallback, MCU failure rollback/retry, disable, reset epoch resend, stopped beacon");
 return 0;
}
'''
(T/'state-fault-test.c').write_text(preamble+edca+shim+bands+fn+main)
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-Wno-unused-parameter','-fsanitize=address,undefined','-g','-O1','-I'+str(T),str(T/'state-fault-test.c'),'-o',str(T/'state-fault-test')],capture_output=True,text=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'state-fault-test')],capture_output=True,text=True);(T/'state-fault-test.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr;print(r.stdout)