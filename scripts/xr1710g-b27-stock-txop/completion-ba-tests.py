from pathlib import Path
import os, subprocess
B=Path(__file__).resolve().parents[2]
D=Path(os.environ.get('B27_MT76_DIR',str(B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
T=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-b27-scheduler-tests'));T.mkdir(parents=True,exist_ok=True)
h=(D/'mt7996/mt7996.h').read_text();mac=(D/'mt7996/mac.c').read_text()
state=h[h.index('struct mt7996_stock_ba {'):h.index('struct mt7996_stock_edca {')]
addr=mac[mac.index('u32 mt7996_mac_wtbl_lmac_addr('):mac.index('static void mt7996_mac_sta_poll(')]
fn=(D/'mt7996/stock_ba.c').read_text();fn=fn[fn.index('void mt7996_stock_ba_update('):]
(T/'stock_policy.h').write_bytes((D/'mt7996/stock_policy.h').read_bytes())
pre=r"""
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdio.h>
#include <assert.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
typedef uint8_t u8;typedef uint16_t u16;typedef uint32_t u32;typedef uint64_t u64;
#define READ_ONCE(x) (x)
#define BIT(n) (1UL<<(n))
#define GENMASK(h,l) ((UINT32_MAX>>(31-(h)))&~((1U<<(l))-1))
#define U32_MAX UINT32_MAX
#define U64_MAX UINT64_MAX
#define div64_u64(n,d) ((n)/(d))
#define min(a,b) ((a)<(b)?(a):(b))
#define MT76_MCU_RESET 0
#define MT76_RESET 1
#define MT_WTBLON_TOP_WDUCR 0x1000
#define MT_WTBLON_TOP_WDUCR_GROUP 31
#define MT_WTBL_LMAC_OFFS(id,dw) (0x10000|(((id)&127)<<8)|((dw)*4))
#define FIELD_PREP(mask,val) ((val)<<__builtin_ctz(mask))
#define test_bit(b,p) (!!(*(p)&BIT(b)))
#define lockdep_assert_held(p) ((void)(p))
static _Thread_local bool window_locked;
static void lock_window(pthread_mutex_t *m){assert(!window_locked);pthread_mutex_lock(m);window_locked=true;}
static void unlock_window(pthread_mutex_t *m){assert(window_locked);window_locked=false;pthread_mutex_unlock(m);}
#define spin_lock_bh(p) lock_window(p)
#define spin_unlock_bh(p) unlock_window(p)
#include "stock_policy.h"
"""
shim=r"""
struct mt7996_dev {bool stock_policy;struct {unsigned long state;} mphy;struct {int mutex;bool valid_chip;} mt76;pthread_mutex_t wtbl_lock;u32 stock_epoch;u64 stock_ba_updates,stock_ba_errors,stock_ba_skips;};
struct mt7996_sta {u32 stock_ba_generation;u16 ba_tx_mask;struct {u16 buf_size;} ba_tx[16];};
struct mt7996_sta_link {struct {u16 idx;} wcid;struct mt7996_stock_ba stock_ba;struct {bool tx_per_valid;u8 tx_per;} stock_avg;bool connected;};
#define is_mt7996(m) ((m)->valid_chip)
static u32 words[4096],group;
static int writes,reads,bad_write,bad_read;
static void mt76_wr(struct mt7996_dev *d,u32 a,u32 v){
 (void)d;assert(window_locked);
 if(a==MT_WTBLON_TOP_WDUCR){group=v;sched_yield();return;}
 unsigned idx=group*128+((a>>8)&127);assert(idx<4096);writes++;if(!bad_write)words[idx]=v;
}
static u32 mt76_rr(struct mt7996_dev *d,u32 a){(void)d;assert(window_locked);reads++;return bad_read?UINT32_MAX:words[group*128+((a>>8)&127)];}
"""
main=r"""
static atomic_bool stop;
static void *reader(void *p){
 struct mt7996_dev *d=p;
 while(!atomic_load(&stop)){
  spin_lock_bh(&d->wtbl_lock);u32 a=mt7996_mac_wtbl_lmac_addr(d,1,7);assert(mt76_rr(d,a)==0xcafebabe);spin_unlock_bh(&d->wtbl_lock);
 }
 return 0;
}
int main(void){
 struct mt7996_dev d={.stock_policy=true,.mt76.valid_chip=true,.wtbl_lock=PTHREAD_MUTEX_INITIALIZER,.stock_epoch=7};
 struct mt7996_sta m={.stock_ba_generation=3,.ba_tx_mask=1,.ba_tx={{64}}};
 struct mt7996_sta_link l={.wcid.idx=129,.stock_avg={true,36},.connected=true};
 words[129]=0xabcd1237;
 mt7996_stock_ba_update(&d,&m,&l,true,true);assert(words[129]==0xabcd1236&&l.stock_ba.baseline==7&&l.stock_ba.cap==7&&l.stock_ba.changed);
 l.stock_avg.tx_per=35;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==6);
 l.stock_avg.tx_per=15;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==6);
 l.stock_avg.tx_per=14;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==7);
 l.stock_avg.tx_per=36;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==6);
 mt7996_stock_ba_update(&d,&m,&l,false,false);assert((words[129]&15)==7&&!l.stock_ba.valid);
 int n=reads;l.stock_avg.tx_per_valid=false;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(reads==n);
 l.stock_avg.tx_per_valid=true;mt7996_stock_ba_update(&d,&m,&l,true,false);assert(reads==n);
 m.ba_tx[0].buf_size=256;m.stock_ba_generation++;words[129]=0xabcd1239;l.stock_avg.tx_per=36;
 mt7996_stock_ba_update(&d,&m,&l,true,true);assert(l.stock_ba.cap==9&&(words[129]&15)==4);
 l.stock_avg.tx_per=0;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==5);
 mt7996_stock_ba_update(&d,&m,&l,false,false);assert((words[129]&15)==9);
 m.stock_ba_generation++;words[129]=0xabcd123e;m.ba_tx[0].buf_size=1024;l.stock_avg.tx_per=36;
 mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==7&&l.stock_ba.cap==14);
 for(int i=0;i<10;i++){mt7996_stock_ba_update(&d,&m,&l,true,true);}assert((words[129]&15)==3);
 /* BA stop must never restore an index into a freed/reused WCID. */
 m.ba_tx_mask=0;n=writes;mt7996_stock_ba_update(&d,&m,&l,false,false);assert(writes==n&&!l.stock_ba.valid);
 m.ba_tx_mask=1;m.stock_ba_generation++;m.ba_tx[0].buf_size=64;words[129]=0xabcd1237;
 bad_write=1;u64 errors=d.stock_ba_errors;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(d.stock_ba_errors==errors+1&&(words[129]&15)==7);
 bad_write=0;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&15)==6);
 d.mphy.state=BIT(MT76_RESET);n=reads;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(reads==n);
 d.mphy.state=BIT(MT76_MCU_RESET);mt7996_stock_ba_update(&d,&m,&l,true,true);assert(reads==n);
 d.mphy.state=0;d.stock_epoch++;words[129]=0xabcd1237;l.stock_avg.tx_per=0;
 mt7996_stock_ba_update(&d,&m,&l,true,true);assert(l.stock_ba.epoch==d.stock_epoch&&l.stock_ba.baseline==7&&(words[129]&15)==7);
 m.stock_ba_generation++;words[129]=UINT32_MAX;u64 skips=d.stock_ba_skips;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(!l.stock_ba.valid&&d.stock_ba_skips==skips+1);
 words[129]=0xabcd123f;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(!l.stock_ba.valid);
 words[129]=0xabcd123e;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(!l.stock_ba.valid); /* mismatched <=64 window */
 words[129]=0xabcd1232;mt7996_stock_ba_update(&d,&m,&l,true,true);assert(l.stock_ba.cap==2&&(words[129]&15)==2);
 /* Force adversarial scheduling while another WCID group is being read. */
 m.stock_ba_generation++;words[129]=0xabcd1237;words[1]=0xcafebabe;l.stock_avg.tx_per=36;
 pthread_t thread;assert(!pthread_create(&thread,0,reader,&d));
 for(int i=0;i<10000;i++){l.stock_avg.tx_per=i&1?0:100;mt7996_stock_ba_update(&d,&m,&l,true,true);assert((words[129]&~15U)==0xabcd1230);}
 atomic_store(&stop,true);pthread_join(thread,0);assert(words[1]==0xcafebabe);
 puts("PASS: actual BA WTBL path: limits, PER boundaries, other TIDs, stop/reset/generation/disable restoration, invalid reads, write retry and concurrent group selection");
}
"""
p=T/'completion-ba-test.c';p.write_text(pre+state+shim+addr+fn+main)
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-pthread','-g','-O1','-I'+str(T),str(p),'-o',str(T/'completion-ba-test')],capture_output=True,text=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'completion-ba-test')],capture_output=True,text=True);(T/'completion-ba-tests.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr;print(r.stdout)
