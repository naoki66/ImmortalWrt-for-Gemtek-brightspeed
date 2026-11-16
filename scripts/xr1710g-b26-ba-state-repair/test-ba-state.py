from pathlib import Path
import subprocess,json,argparse,tempfile
parser=argparse.ArgumentParser(description='Inject BA setup failures into the real driver callback')
parser.add_argument('--source',type=Path,help='Patched mt7996/main.c')
parser.add_argument('--patch',type=Path,help='Patch used to reconstruct the original source')
parser.add_argument('--output',type=Path,default=Path('/mnt/f/openwrt/wifi-fix26/ba-state-repair'))
args=parser.parse_args();T=args.output;T.mkdir(parents=True,exist_ok=True)
if args.source:
 assert args.patch, '--patch is required with --source'
 after=args.source.read_bytes();(T/'main-after.c').write_bytes(after)
 with tempfile.TemporaryDirectory() as d:
  q=Path(d);(q/'mt7996').mkdir();f=q/'mt7996/main.c';f.write_bytes(after)
  subprocess.run(['patch','--batch','--fuzz=0','-R','-p1','-i',str(args.patch.resolve())],cwd=q,check=True)
  (T/'main-before.c').write_bytes(f.read_bytes())
prefix=r'''
#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include <errno.h>
#include <stdlib.h>
typedef uint16_t u16;
enum { IEEE80211_AMPDU_RX_START, IEEE80211_AMPDU_RX_STOP,
 IEEE80211_AMPDU_TX_OPERATIONAL, IEEE80211_AMPDU_TX_STOP_FLUSH,
 IEEE80211_AMPDU_TX_STOP_FLUSH_CONT, IEEE80211_AMPDU_TX_START,
 IEEE80211_AMPDU_TX_STOP_CONT, IEEE80211_AMPDU_TX_START_IMMEDIATE=1 };
struct mt76_txq { bool aggr,send_bar; };
struct mt76_wcid { unsigned long ampdu_state; };
struct mt7996_sta { struct {struct mt76_wcid wcid;} deflink; unsigned long ba_rx_mask,ba_tx_mask; int ba_rx[16],ba_tx[16]; };
struct ieee80211_txq {void *drv_priv;};
struct ieee80211_sta {void *drv_priv;struct ieee80211_txq *txq[16];unsigned char addr[6];};
struct ieee80211_ampdu_params {struct ieee80211_sta *sta;u16 tid,ssn,buf_size;int action;};
struct ieee80211_hw {void *priv;};struct ieee80211_vif {int dummy;};
struct mt7996_dev {struct {int mutex;void *dev;} mt76;};
static int alloc_error,rx_error,tx_error,rx_starts,rx_adds,rx_deletes,rx_stops,stop_calls,warnings;
static bool reorder_exists,stop_after_unlock;
static struct mt7996_dev dev;
static struct mt7996_dev *mt7996_hw_dev(struct ieee80211_hw *h){return h->priv;}
static void mutex_lock(int *p){*p=1;}static void mutex_unlock(int *p){*p=0;}
static unsigned long mt7996_mac_sta_links(void *d,void *v,void *s){return 1;}
static void set_bit(unsigned n,unsigned long *p){*p|=1UL<<n;}
static void clear_bit(unsigned n,unsigned long *p){*p&=~(1UL<<n);}
static int mt76_rx_aggr_start(void *d,void *w,u16 t,u16 s,u16 b){rx_starts++;if(!alloc_error)reorder_exists=true;return alloc_error;}
static void mt76_rx_aggr_stop(void *d,void *w,u16 t){rx_stops++;reorder_exists=false;}
static int mt7996_mcu_add_rx_ba(void *d,void *p,void *v,unsigned long l,bool en){if(en){rx_adds++;return rx_error;}rx_deletes++;return 0;}
static int mt7996_mcu_add_tx_ba(void *d,void *p,void *v,unsigned long l,bool en){return en?tx_error:0;}
static void mt7996_sta_ba_update(unsigned long *m,void *b,struct ieee80211_ampdu_params *p,bool en){if(en)set_bit(p->tid,m);else clear_bit(p->tid,m);}
static void ieee80211_stop_tx_ba_cb_irqsafe(void *v,void *a,u16 t){}
static int ieee80211_stop_tx_ba_session(void *s,u16 t){stop_calls++;stop_after_unlock=!dev.mt76.mutex;return 0;}
#define dev_warn_ratelimited(...) ((void)warnings++)
'''
suffix=r'''
static int run(int scenario) {
 struct mt7996_sta sta_priv={0};struct mt76_txq tq={0};
 struct ieee80211_txq txq={.drv_priv=&tq};
 struct ieee80211_sta sta={.drv_priv=&sta_priv};sta.txq[0]=&txq;
 struct ieee80211_hw hw={.priv=&dev};struct ieee80211_vif vif={0};
 struct ieee80211_ampdu_params p={.sta=&sta,.tid=0,.ssn=123,.buf_size=256};
 alloc_error=rx_error=tx_error=rx_starts=rx_adds=rx_deletes=rx_stops=stop_calls=warnings=0;
 reorder_exists=stop_after_unlock=false;dev.mt76.mutex=0;
 if(scenario==0) {p.action=IEEE80211_AMPDU_RX_START;alloc_error=-ENOMEM;}
 if(scenario==1) {p.action=IEEE80211_AMPDU_RX_START;rx_error=-ETIMEDOUT;}
 if(scenario==2) {p.action=IEEE80211_AMPDU_TX_OPERATIONAL;tx_error=-EIO;sta_priv.deflink.wcid.ampdu_state=1;}
 if(scenario==3) p.action=IEEE80211_AMPDU_RX_START;
 if(scenario==4) p.action=IEEE80211_AMPDU_TX_OPERATIONAL;
 if(scenario==5) {p.action=IEEE80211_AMPDU_TX_STOP_CONT;tq.aggr=true;sta_priv.ba_tx_mask=1;}
 if(scenario==6) {p.action=IEEE80211_AMPDU_RX_STOP;reorder_exists=true;sta_priv.ba_rx_mask=1;}
 int rc=mt7996_ampdu_action(&hw,&vif,&p);bool ok=false;
 switch(scenario) {
 case 0:ok=rc==-ENOMEM && rx_adds==0 && !reorder_exists && !sta_priv.ba_rx_mask;break;
 case 1:ok=rc==-ETIMEDOUT && rx_deletes==1 && rx_stops==1 && !reorder_exists && !sta_priv.ba_rx_mask;break;
 case 2:ok=rc==-EIO && !tq.aggr && !sta_priv.ba_tx_mask && stop_calls==1 && stop_after_unlock;break;
 case 3:ok=rc==0 && reorder_exists && sta_priv.ba_rx_mask==1 && rx_adds==1 && !rx_deletes;break;
 case 4:ok=rc==0 && tq.aggr && sta_priv.ba_tx_mask==1 && !stop_calls;break;
 case 5:ok=rc==0 && !tq.aggr && !sta_priv.ba_tx_mask;break;
 case 6:ok=rc==0 && !reorder_exists && !sta_priv.ba_rx_mask && rx_deletes==1;break;
 }
 printf("scenario %d %s\n",scenario,ok?"PASS":"FAIL");return !ok;
}
int main(void){int fails=0;for(int n=0;n<7;n++)fails+=run(n);return fails?1:0;}
'''
results={}
for version in ['before','after']:
 s=(T/('main-'+version+'.c')).read_text();start=s.index('static int\nmt7996_ampdu_action(');end=s.index('\nstatic int\nmt7996_get_stats',start)
 p=T/('failure-injection-'+version+'.c');p.write_text(prefix+s[start:end]+suffix)
 binary=T/('failure-injection-'+version)
 subprocess.run(['gcc','-std=gnu11','-Wall','-Wextra','-Wno-unused-parameter','-Wno-unused-function','-Werror','-o',str(binary),str(p)],check=True)
 x=subprocess.run([str(binary)],capture_output=True,text=True);(T/('failure-injection-'+version+'.log')).write_text(x.stdout+x.stderr)
 print(version,x.returncode,x.stdout,flush=True);results[version]={'exit':x.returncode,'output':x.stdout}
 assert x.returncode==(1 if version=='before' else 0)
(T/'failure-injection.json').write_text(json.dumps(results,indent=2))
