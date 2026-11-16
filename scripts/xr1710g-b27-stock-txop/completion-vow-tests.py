from pathlib import Path
import os, subprocess
B=Path(__file__).resolve().parents[2]
D=Path(os.environ.get('B27_MT76_DIR',str(B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d')))
T=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-b27-scheduler-tests'));T.mkdir(parents=True,exist_ok=True)
def function(s, name):
 start=s.index(name+'(');start=s.rfind('\n',0,start)+1
 if s[start:].startswith(name):start=s.rfind('\n',0,start-1)+1
 end=s.index('{',start);depth=1;pos=end+1
 while depth:
  if s[pos]=='{':depth+=1
  elif s[pos]=='}':depth-=1
  pos+=1
 return s[start:pos]+'\n'
source=(D/'mt7996/stock_vow.c').read_text();source='\n'.join(l for l in source.splitlines() if not l.startswith(('#include','module_param','MODULE_PARM')))
mcu=(D/'mt7996/mcu.c').read_text();h=(D/'mt7996/mt7996.h').read_text();conn=(D/'mt76_connac.h').read_text()
constants=h[h.index('enum {\n\tVOW_SEARCH_AC_FIRST'):h.index('/* Raw firmware counters')]
constants+=conn[conn.index('#define VOW_DRR_QUANTUM_NUM'):conn.index('struct mt76_connac_reg_map')]
pre=r"""
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdarg.h>
#include <assert.h>
#include <errno.h>
typedef uint8_t u8;typedef uint16_t u16;typedef uint32_t u32;typedef u16 __le16;typedef u32 __le32;
#define ETH_ALEN 6
#define PAGE_SIZE 4096
#define GFP_KERNEL 0
#define U32_MAX UINT32_MAX
#define ARRAY_SIZE(x) ((int)(sizeof(x)/sizeof((x)[0])))
#define BIT(n) (1U<<(n))
#define GENMASK(h,l) ((UINT32_MAX>>(31-(h)))&~((1U<<(l))-1))
#define FIELD_PREP(mask,val) (((u32)(val)<<__builtin_ctz(mask))&(mask))
#define IEEE80211_DEFAULT_AIRTIME_WEIGHT 256
#define IEEE80211_AC_BK 3
#define IEEE80211_AC_BE 2
#define IEEE80211_AC_VI 1
#define IEEE80211_AC_VO 0
#define clamp(x,l,h) ((x)<(l)?(l):(x)>(h)?(h):(x))
#define ilog2(x) ((x)?31-__builtin_clz(x):0)
#define container_of(ptr,type,member) ((type*)((char*)(ptr)-offsetof(type,member)))
#define is_mt7996(m) ((m)->chip)
#define __packed __attribute__((packed))
#define cpu_to_le16(x) (x)
#define cpu_to_le32(x) (x)
#define MCU_WM_UNI_CMD(x) 0x37
#define UNI_VOW_DRR_CTRL 0
#define UNI_VOW_FEATURE_CTRL 1
#define HW_BSSID_MAX 3
#define EXT_BSSID_START 0x10
struct kernel_param {void *arg;};
struct kernel_param_ops {int (*set)(const char*,const struct kernel_param*);int (*get)(char*,const struct kernel_param*);};
struct mt76_wcid {u16 idx;bool sta;};
struct mt7996_dev {bool stock_policy,vow_atf_en;struct {bool chip;} mt76;};
struct mt7996_sta {int dummy;};
struct ieee80211_sta {u8 addr[6];struct mt7996_sta drv_priv;};
struct mt7996_sta_link {struct mt76_wcid wcid;struct mt7996_sta *sta;};
struct mt76_vif_link {u8 omac_idx,wmm_idx;};
struct mt7996_phy {struct mt7996_dev *dev;struct {u8 band_idx;} *mt76;};
static bool fail_alloc;
static char *kstrdup(const char *s,int flags){(void)flags;return fail_alloc?NULL:strdup(s);}
#define kfree free
static char *strim(char *s){while(*s==' '||*s=='\n')s++;size_t n=strlen(s);while(n&&(s[n-1]==' '||s[n-1]=='\n'))s[--n]=0;return s;}
static int scnprintf(char *buf,size_t n,const char *fmt,...){va_list a;va_start(a,fmt);int r=vsnprintf(buf,n,fmt,a);va_end(a);return r<(int)n?r:(int)n-1;}
static bool mac_pton(const char *s,u8 *m){unsigned v[6];if(sscanf(s,"%2x:%2x:%2x:%2x:%2x:%2x",&v[0],&v[1],&v[2],&v[3],&v[4],&v[5])!=6)return false;for(int i=0;i<6;i++)m[i]=v[i];return true;}
static bool is_valid_ether_addr(const u8 *m){u8 n=0;for(int i=0;i<6;i++)n|=m[i];return n&&!(m[0]&1);}
#define ether_addr_equal(a,b) (!memcmp(a,b,6))
static u8 message[128];static int message_len,fw_error;
static int mt76_mcu_send_msg(void *d,int cmd,const void *p,int len,bool wait){(void)d;assert(cmd==0x37&&wait);assert(len<=(int)sizeof(message));memcpy(message,p,len);message_len=len;return fw_error;}
"""
code=pre+constants+source
for name in ['mt7996_vow_sta_bss_grp','mt7996_vow_quantum','mt7996_mcu_set_vow_drr_ctrl','mt7996_mcu_set_vow_feature_ctrl']:code+=function(mcu,name)
code+=r"""
static u16 get16(int o){u16 n;memcpy(&n,message+o,2);return n;}
static u32 get32(int o){u32 n;memcpy(&n,message+o,4);return n;}
int main(void){
 struct mt7996_dev d={.stock_policy=true,.vow_atf_en=true,.mt76.chip=true};
 struct mt7996_sta_link sl={.wcid={.idx=287,.sta=true}};
 struct ieee80211_sta sta={.addr={2,1,2,3,4,5}};sl.sta=&sta.drv_priv;
 struct mt76_vif_link vif={.omac_idx=0x11,.wmm_idx=2};
 struct {u8 band_idx;} band={.band_idx=1};struct mt7996_phy phy={.dev=&d};phy.mt76=(void*)&band;
 u8 table[8];const u8 normal[8]={6,12,16,20,24,28,32,36};const u8 weighted[8]={4,8,12,16,24,28,32,36};
 mt7996_stock_vow_table(&d,table);assert(!memcmp(table,normal,8));
 for(int ac=0;ac<4;ac++)assert(mt7996_stock_vow_quantum(&d,&sl.wcid,256,ac)==(ac<2?ac:2));
 assert(!mt7996_mcu_set_vow_drr_ctrl(&d,1,&sl.wcid,&vif,VOW_DRR_CTRL_STA_ALL,256));
 assert(message_len==28&&get16(4)==0&&get16(6)==24&&get16(8)==287);
 assert(message[10]==1&&message[11]==2&&get32(12)==0&&message[27]==0x11);
 assert(get32(16)==(4|(2<<8)|(2<<12)|(1<<16)));
 assert(!mt7996_mcu_set_vow_drr_ctrl(&d,1,NULL,NULL,VOW_DRR_CTRL_AIRTIME_QUANTUM_ALL,0));assert(!memcmp(message+16,normal,8));
 assert(!mt7996_mcu_set_vow_feature_ctrl(&phy));assert(message_len==48&&get16(6)==44);
 assert((get16(30)&(BIT(9)|BIT(13)))==BIT(13));assert(get16(10)&BIT(9));
 d.vow_atf_en=false;mt7996_mcu_set_vow_feature_ctrl(&phy);assert(!(get16(30)&(BIT(9)|BIT(13))));d.vow_atf_en=true;
 for(int watf=0;watf<2;watf++){
  stock_watf=watf;mt7996_stock_vow_table(&d,table);assert(!memcmp(table,watf?weighted:normal,8));
  for(int ac=0;ac<4;ac++){
   int prev=0;for(int w=1;w<=65535;w++){int q=mt7996_stock_vow_quantum(&d,NULL,w,ac);assert(q>=prev&&q<8);prev=q;}
  }
 }
 struct kernel_param kp={.arg=&stock_watf_levels[1]};
 assert(!mt7996_stock_watf_set("02:01:02:03:04:05,04:05:06:07:08:09",&kp));assert(stock_watf_levels[1].count==2);
 for(int ac=0;ac<4;ac++)assert(mt7996_stock_vow_quantum(&d,&sl.wcid,65535,ac)==1);
 kp.arg=&stock_watf_levels[3];assert(!mt7996_stock_watf_set("02:01:02:03:04:05",&kp));
 for(int ac=0;ac<4;ac++)assert(mt7996_stock_vow_quantum(&d,&sl.wcid,256,ac)==3);
 const char *bad[]={"02:01:02:03:04:05,","ff:ff:ff:ff:ff:ff","00:00:00:00:00:00","01:00:00:00:00:01","oops","02:01:02:03:04:05x"};
 for(int i=0;i<ARRAY_SIZE(bad);i++){assert(mt7996_stock_watf_set(bad[i],&kp)==-EINVAL);assert(stock_watf_levels[3].count==1);}
 fail_alloc=true;assert(mt7996_stock_watf_set("",&kp)==-ENOMEM);fail_alloc=false;
 assert(!mt7996_stock_watf_set("",&kp));assert(stock_watf_levels[3].count==0);
 assert(!mt7996_mcu_set_vow_drr_ctrl(&d,1,NULL,NULL,VOW_DRR_CTRL_AIRTIME_QUANTUM_ALL,0));assert(!memcmp(message+16,weighted,8));
 mt7996_mcu_set_vow_feature_ctrl(&phy);assert((get16(30)&(BIT(9)|BIT(13)))==(BIT(9)|BIT(13)));
 d.stock_policy=false;assert(!mt7996_stock_vow_watf(&d));mt7996_mcu_set_vow_drr_ctrl(&d,1,NULL,NULL,VOW_DRR_CTRL_AIRTIME_QUANTUM_ALL,0);const u8 upstream[8]=VOW_DRR_QUANTUM_TABLE;assert(!memcmp(message+16,upstream,8));
 assert(mt7996_vow_quantum(&d,&sl.wcid,256,IEEE80211_AC_BE)==3);
 mt7996_mcu_set_vow_feature_ctrl(&phy);assert((get16(30)&(BIT(9)|BIT(13)))==(BIT(9)|BIT(13)));
 fw_error=-EIO;assert(mt7996_mcu_set_vow_drr_ctrl(&d,1,NULL,NULL,VOW_DRR_CTRL_STA_PAUSE,0)==-EIO);assert(mt7996_mcu_set_vow_feature_ctrl(&phy)==-EIO);
 assert(mt7996_mcu_set_vow_drr_ctrl(&d,1,NULL,NULL,99,0)==-EINVAL);
 puts("PASS: actual retail VOW table, default AC indices, all 65535 numeric weights per AC, four MAC levels, list validation/atomic parse, WM wire layout, separate ATF/WATF, other-board compatibility and MCU errors");return 0;
}
"""
(T/'completion-vow-tests.c').write_text(code)
exe=T/'completion-vow-tests';subprocess.run(['gcc','-std=gnu11','-Wall','-Wextra','-Wno-unused-const-variable','-Wno-unused-function','-fsanitize=address,undefined','-g','-O1','-fno-omit-frame-pointer','-fno-pie','-no-pie',str(T/'completion-vow-tests.c'),'-o',str(exe)],check=True)
r=subprocess.run([str(exe)],capture_output=True,text=True);(T/'completion-vow-tests.log').write_text(r.stdout+r.stderr);print(r.stdout,r.stderr);assert r.returncode==0
