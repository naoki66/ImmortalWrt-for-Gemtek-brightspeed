from pathlib import Path
import subprocess,hashlib,json,tempfile,shutil
import os
T=Path(os.environ.get('B27_TEST_DIR', '/mnt/f/openwrt/wifi-fix27-stock'));B=Path('/home/builder/immortalwrt-B13');D=B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d'
code=r'''
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <assert.h>
typedef uint8_t u8; typedef uint16_t u16; typedef uint32_t u32; typedef uint64_t u64;
#include "stock_policy.h"
int main(void) {
 struct mt7996_stock_vote v={0};
 assert(mt7996_stock_mlo_txop(700000,1000,0)==0);
 assert(mt7996_stock_mlo_txop(701000,1000,0)==187);
 assert(mt7996_stock_mlo_txop(700000,1000,1)==187);
 assert(mt7996_stock_mlo_txop(0,0,0)==0);
 assert(mt7996_stock_mlo_txop(0,0,1)==187);
 assert(!mt7996_stock_ap_ul(0,1000000,1000,0));
 assert(mt7996_stock_ap_ul(0,1001000,1000,0));
 assert(!mt7996_stock_ap_ul(0,1001000,1000,1));
 assert(!mt7996_stock_ap_ul(100,1000,0,0));
 assert(mt7996_stock_ap_ul(100,1001,0,1));
 assert(!mt7996_stock_sta_ul(1000000,1000));
 assert(mt7996_stock_sta_ul(1001000,1000));
 assert(!mt7996_stock_sta_ul(1001000,0));
 assert(!mt7996_stock_high_rate((500ULL<<17)-1,0));
 assert(mt7996_stock_high_rate(500ULL<<17,0));
 assert(mt7996_stock_ewma(0,100)==100);
 assert(mt7996_stock_ewma(101,100)==100);
 assert(mt7996_stock_ewma(UINT64_MAX,UINT64_MAX)==UINT64_MAX);
 mt7996_stock_vote_set(&v,MT7996_STOCK_DEFAULT,187,1);
 assert(mt7996_stock_winner(&v)==187);
 mt7996_stock_vote_set(&v,MT7996_STOCK_UL,0,1);
 assert(mt7996_stock_winner(&v)==0); /* priority wins over numeric maximum */
 mt7996_stock_vote_set(&v,MT7996_STOCK_UL,0,0);
 assert(mt7996_stock_winner(&v)==187); /* exit restores default vote */
 mt7996_stock_vote_set(&v,MT7996_STOCK_DEFAULT,0,0);
 assert(mt7996_stock_winner(&v)==0);
 for(u32 n=1;n<2048;n++)for(u32 len=0;len<2000;len++) {
  assert(mt7996_stock_mlo_txop((u64)n*len,n,0)==(len<=700?0:187));
  assert(mt7996_stock_ap_ul(0,(u64)n*len,n,0)==(len>1000));
  assert(mt7996_stock_sta_ul((u64)n*len,n)==(len>1000));
 }
 puts("PASS: boundaries, MU, AP/STA/MLO, 500Mbps gate, EWMA overflow, priority restoration; 12,282,000 sweep checks");
 return 0;
}
'''
(T/'policy-test.c').write_text(code)
shutil.copyfile(T/'current-stock_policy.h',T/'stock_policy.h')
r=subprocess.run(['gcc','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-g','-O1','-I'+str(T),str(T/'policy-test.c'),'-o',str(T/'policy-test')],capture_output=True,text=True);assert r.returncode==0,r.stderr
r=subprocess.run([str(T/'policy-test')],capture_output=True,text=True);(T/'policy-test.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
print(r.stdout)
# Verify full patch applies with fuzz=0 and reverses against saved preimage.
with tempfile.TemporaryDirectory(prefix='b27-roundtrip-') as td:
 root=Path(td);(root/'mt7996').mkdir();names=['Makefile','debugfs.c','main.c','mcu.c','mcu.h','mt7996.h','mac.c','init.c']
 for n in names:shutil.copyfile(T/'preimage/mt7996'/n,root/'mt7996'/n)
 patch=B/'package/kernel/mt76/patches/147-mt7996-stock-host-txop-policy.patch'
 for opts in [[],['-R']]:
  r=subprocess.run(['patch','--batch','--fuzz=0','-p1',*opts,'-i',str(patch)],cwd=root,capture_output=True,text=True);assert r.returncode==0,r.stdout+r.stderr
  if not opts:
   for p in (root/'mt7996').iterdir():assert p.read_bytes()==(T/('current-'+p.name)).read_bytes(),p
 for n in names:assert (root/'mt7996'/n).read_bytes()==(T/'preimage/mt7996'/n).read_bytes(),n
(T/'automatic-policy-tests.json').write_text(json.dumps({'policy_boundaries_and_sweeps':'pass','asan_ubsan':'pass','patch_fuzz_zero_forward_reverse':'pass','physical_router_tested':False},indent=2))
print('PASS: patch forward/reverse, byte-for-byte')