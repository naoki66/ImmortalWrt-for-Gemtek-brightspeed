from pathlib import Path
import os, subprocess
B = Path(__file__).resolve().parents[2]
D = Path(os.environ.get('B27_MT76_DIR', str(B / 'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
T = Path(os.environ.get('B27_TEST_DIR', '/tmp/xr1710g-b27-scheduler-tests'))
T.mkdir(parents=True, exist_ok=True)
for name in ['stock_policy.c', 'mt7996.h', 'stock_policy.h']:
    dest = name if name == 'stock_policy.h' else 'current-' + name
    (T / dest).write_bytes((D / 'mt7996' / name).read_bytes())
# Execute the actual event function, with only kernel locks and reset bits shimmed.
s=(D/'mt7996/stock_policy.c').read_text();h=(D/'mt7996/mt7996.h').read_text();fn=s[s.index('void mt7996_stock_event('):s.index('/* Atomic iterator')];stats=h[h.index('struct mt7996_stock_stats {'):h.index('struct mt7996_stock_average {')]
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
#define BIT(n) (1UL<<(n))
#define MT76_MCU_RESET 0
#define MT76_RESET 1
#define UNI_ALL_STA_TXRX_ADM_STAT 2
#define UNI_ALL_STA_TXRX_MSDU_COUNT 3
#define UNI_ALL_STA_TX_STAT 1
#define STOCK_BYTES BIT(0)
#define STOCK_MSDU BIT(1)
#define STOCK_MPDU BIT(2)
#define STOCK_INVALID BIT(3)
#define spin_lock_bh(p) ((void)(p))
#define spin_unlock_bh(p) ((void)(p))
#define test_bit(b,p) (!!(*(p)&BIT(b)))
#define container_of(ptr,type,member) ((type*)((char*)(ptr)-offsetof(type,member)))
static unsigned long jiffies=100;
#include "stock_policy.h"
'''
shim=r'''
struct mt76_wcid {bool sta;};
struct mt7996_sta_link {struct mt76_wcid wcid;struct mt7996_stock_stats stock_stats;};
struct mt7996_dev {bool stock_policy;struct {unsigned long state;} mphy;int stock_stats_lock;u32 stock_epoch;u64 stock_events[3];};
'''
main=r'''
int main(void){
 struct mt7996_dev d={.stock_policy=true,.stock_epoch=7};struct mt7996_sta_link l={.wcid.sta=true};
 struct mt7996_stock_stats *s=&l.stock_stats;u8 per=0;
 mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,25,9);
 assert(s->epoch==7&&s->tx_attempts==25&&s->tx_failed==9&&!s->tx_stat_invalid);
 assert(mt7996_stock_per(s->tx_attempts,s->tx_failed,&per)&&per==36);
 mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,10,2);
 assert(s->tx_attempts==35&&s->tx_failed==11);
 mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,1,2);assert(s->tx_stat_invalid);
 d.stock_epoch++;mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,100,0);
 assert(s->epoch==8&&s->tx_attempts==100&&s->tx_failed==0&&!s->tx_stat_invalid);
 assert(mt7996_stock_per(s->tx_attempts,s->tx_failed,&per)&&per==0);
 d.mphy.state=BIT(MT76_RESET);mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,500,20);assert(s->tx_attempts==100);
 d.mphy.state=BIT(MT76_MCU_RESET);mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,500,20);assert(s->tx_attempts==100);
 d.mphy.state=0;l.wcid.sta=false;mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,500,20);assert(s->tx_attempts==100);
 l.wcid.sta=true;d.stock_policy=false;mt7996_stock_event(&d,&l.wcid,UNI_ALL_STA_TX_STAT,500,20);assert(s->tx_attempts==100);
 puts("PASS: actual event ingestion paired counters, accumulation, invalid sample, epoch clearing, both reset states, nonstation/disabled gating");
}
'''
p=T/'completion-event-test.c';p.write_text(pre+stats+shim+fn+main)
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-g','-O1','-I'+str(T),str(p),'-o',str(T/'completion-event-test')],text=True,capture_output=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'completion-event-test')],text=True,capture_output=True);(T/'completion-event-test.log').write_text(r.stdout+r.stderr);print(r.stdout,r.stderr);assert r.returncode==0
