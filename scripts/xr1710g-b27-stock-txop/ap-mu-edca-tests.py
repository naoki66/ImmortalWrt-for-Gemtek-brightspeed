from pathlib import Path
import re,json,subprocess,hashlib,os
B=Path(__file__).resolve().parents[2];L=B/'build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581';K=L/'mac80211-regular/backports-7.2';M=L/'mt76-2026.10.28~0936617d';H=B/'build_dir/target-aarch64_cortex-a53_musl/hostapd-wpad-full-mbedtls/hostapd-2026.08.07~831364bf'
T=Path(os.environ.get('B27_TEST_DIR','/tmp/xr1710g-ap-mu-edca-tests'));T.mkdir(parents=True,exist_ok=True)
def fn(p,name):
 s=p.read_text();m=re.search(r'\b'+name+r'\([^;]*?\n\{',s,re.M);assert m,(p,name)
 end=s.index('\n}',m.end())+2;return s[m.start():end]
def struct(p,name):
 s=p.read_text();m=re.search(r'struct '+name+r' \{.*?\n\}[^;]*;',s,re.S);assert m,(p,name);return m[0]
def macro(p,name):
 s=p.read_text();m=re.search(r'^#define '+name+r'\(.*$',s,re.M);assert m;end=m.end()
 while s[end-1]=='\\':end=s.index('\n',end+1)
 return s[m.start():end]
ie=K/'include/linux/ieee80211.h';he=K/'include/linux/ieee80211-he.h';mh=K/'include/net/mac80211.h';ch=K/'include/net/cfg80211.h';defs=H/'src/common/ieee802_11_defs.h'
functions=[('static int',K/'net/mac80211/cfg.c','ieee80211_set_txq_params'),('static int',M/'mt7996/main.c','mt7996_conf_tx'),('void',M/'mt7996/stock_policy.c','mt7996_stock_update_beacon'),('static inline bool',M/'mt7996/stock_policy.h','mt7996_stock_ap_ul'),('u8 *',H/'src/ap/ieee802_11_he.c','hostapd_eid_he_mu_edca_parameter_set'),('const struct element *',K/'net/wireless/scan.c','cfg80211_find_elem_match'),('static inline const struct element *',ch,'cfg80211_find_ext_elem')]
c=r'''
#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <errno.h>
typedef uint8_t u8;typedef uint16_t u16;typedef uint32_t u32;typedef uint64_t u64;
#define __packed __attribute__((packed))
#define STRUCT_PACKED __packed
#define IEEE80211_NUM_ACS 4
#define IEEE80211_MLD_MAX_NUM_LINKS 4
#define IEEE80211_AC_VO 0
#define IEEE80211_AC_VI 1
#define IEEE80211_AC_BE 2
#define IEEE80211_AC_BK 3
#define NL80211_IFTYPE_AP 3
#define NL80211_IFTYPE_STATION 2
#define WLAN_EID_EXTENSION 255
#define BSS_CHANGED_QOS 1
#define MSG_DEBUG 0
#define os_memcpy memcpy
#define wpa_hexdump(...) do {} while(0)
struct element {u8 id,datalen,data[];};
'''
kernel_mu=int(re.search(r'WLAN_EID_EXT_HE_MU_EDCA\s*=\s*(\d+)',ie.read_text())[1]);host_mu=int(re.search(r'#define WLAN_EID_EXT_HE_MU_EDCA_PARAMS\s+(\d+)',defs.read_text())[1]);assert kernel_mu==host_mu
c+=f'#define WLAN_EID_EXT_HE_MU_EDCA {kernel_mu}\n#define WLAN_EID_EXT_HE_MU_EDCA_PARAMS {host_mu}\n'
for p,name in [(he,'ieee80211_he_mu_edca_param_ac_rec'),(he,'ieee80211_mu_edca_param_set'),(mh,'ieee80211_tx_queue_params'),(defs,'ieee80211_he_mu_edca_parameter_set')]:c+=struct(p,name)+'\n'
c+=macro(ie,'for_each_element')+'\n'+macro(ie,'for_each_element_id')+'\n'
c+=r'''
struct mt7996_vif_link_info {struct ieee80211_tx_queue_params queue_params[4];bool stock_mu_edca;};
struct mt7996_vif {struct mt7996_vif_link_info link_info[4];};
struct ieee80211_vif {int type;void *drv_priv;};
struct ieee80211_bss_conf {int link_id;bool enable_beacon;};
struct ieee80211_mgmt {u8 hdr[24];union {struct {u8 fixed[12];u8 variable[];} beacon;}u;};
struct sk_buff {u8 *data;size_t len;};
struct ieee80211_hw {int queues;void *wiphy;};
struct ieee80211_link_data {struct ieee80211_tx_queue_params tx_conf[4];int link_id;};
struct ieee80211_ops {void *conf_tx;};
struct ieee80211_local {struct ieee80211_hw hw;struct ieee80211_ops *ops;struct ieee80211_vif *vif;};
struct ieee80211_sub_if_data {struct ieee80211_local *local;struct ieee80211_link_data links[4];};
struct wiphy {struct ieee80211_local *local;};
struct net_device {struct ieee80211_sub_if_data *sdata;};
struct ieee80211_txq_params {int link_id,ac;u16 aifs,cwmax,cwmin,txop;};
struct hostapd_config {struct ieee80211_he_mu_edca_parameter_set he_mu_edca;};
struct hostapd_iface {struct hostapd_config *conf;};
struct hostapd_data {struct hostapd_iface *iface;};
#define wiphy_priv(w) ((w)->local)
#define IEEE80211_DEV_TO_SUB_IF(d) ((d)->sdata)
#define IS_ERR(p) false
#define PTR_ERR(p) (-EINVAL)
#define wiphy_debug(...) do {} while(0)
static struct ieee80211_link_data *ieee80211_link_or_deflink(struct ieee80211_sub_if_data *s,int i,bool b){return &s->links[i];}
static void ieee80211_regulatory_limit_wmm_params(struct ieee80211_sub_if_data *s,struct ieee80211_tx_queue_params *p,int ac){}
static void ieee80211_link_info_change_notify(struct ieee80211_sub_if_data *s,struct ieee80211_link_data *l,int changed){}
static int mt7996_conf_tx(struct ieee80211_hw *,struct ieee80211_vif *,unsigned int,u16,const struct ieee80211_tx_queue_params *);
static int drv_conf_tx(struct ieee80211_local *l,struct ieee80211_link_data *link,int ac,const struct ieee80211_tx_queue_params *p){return mt7996_conf_tx(&l->hw,l->vif,link->link_id,ac,p);}
static u8 frames[4][128];static size_t lengths[4];static int allocations,frees;static bool fail_template;
static struct sk_buff *ieee80211_beacon_get_template(struct ieee80211_hw *hw,struct ieee80211_vif *v,void *offs,unsigned int link){
 if(fail_template)return NULL;struct sk_buff *s=malloc(sizeof(*s));s->len=lengths[link];s->data=malloc(s->len?s->len:1);memcpy(s->data,frames[link],s->len);allocations++;return s;
}
static void dev_kfree_skb(struct sk_buff *s){free(s->data);free(s);frees++;}
'''
# Definitions ordered so the original helper functions can call one another.
for k in [5,6,1,0,3,4,2]:
 ret,p,name=functions[k];c+='\n'+ret+'\n'+fn(p,name)+'\n'
c+=r'''
int main(void){
 _Static_assert(offsetof(struct ieee80211_mgmt,u.beacon.variable)==36,"beacon fixed header layout");
 _Static_assert(sizeof(struct ieee80211_mu_edca_param_set)==13,"kernel MU layout");
 _Static_assert(sizeof(struct ieee80211_he_mu_edca_parameter_set)==13,"hostapd MU layout");
 struct mt7996_vif mvif={0};struct ieee80211_vif vif={NL80211_IFTYPE_AP,&mvif};
 struct ieee80211_ops ops={(void*)1};struct ieee80211_local local={.ops=&ops,.vif=&vif,.hw={.queues=4}};
 struct ieee80211_sub_if_data sdata={.local=&local};for(int i=0;i<4;i++)sdata.links[i].link_id=i;
 struct wiphy wiphy={&local};struct net_device dev={&sdata};
 struct hostapd_config cfg={0};struct hostapd_iface iface={&cfg};struct hostapd_data hapd={&iface};
 struct ieee80211_bss_conf conf={.link_id=1,.enable_beacon=true};int cases=0;
 int timers[]={0,1,187,255};
 for(int i=0;i<4;i++){
  memset(&cfg,0,sizeof(cfg));cfg.he_mu_edca.he_mu_ac_be_param[0]=8;cfg.he_mu_edca.he_mu_ac_be_param[1]=0xa9;cfg.he_mu_edca.he_mu_ac_be_param[2]=timers[i];
  cfg.he_mu_edca.he_mu_ac_vo_param[2]=timers[i]?0:255;
  memset(frames,0,sizeof(frames));u8 *end=hostapd_eid_he_mu_edca_parameter_set(&hapd,frames[1]+36);lengths[1]=end-frames[1];
  for(int ac=0;ac<4;ac++){
   struct ieee80211_txq_params p={.link_id=1,.ac=ac,.aifs=3,.cwmin=15,.cwmax=1023,.txop=0};
   assert(!ieee80211_set_txq_params(&wiphy,&dev,&p));
  }
  assert(!mvif.link_info[1].queue_params[0].mu_edca_param_rec.mu_edca_timer);
  mt7996_stock_update_beacon(&local.hw,&vif,&conf);
  assert(mvif.link_info[1].stock_mu_edca==!!timers[i]);assert(!mvif.link_info[0].stock_mu_edca);
  assert(mt7996_stock_ap_ul(1000,120000,100,false));
  assert(mt7996_stock_ap_ul(1000,120000,100,mvif.link_info[1].stock_mu_edca)==!timers[i]);cases++;
 }
 /* Beacon disable, transient template loss, no element, short fixed header. */
 mvif.link_info[1].stock_mu_edca=true;fail_template=true;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(mvif.link_info[1].stock_mu_edca);cases++;
 conf.enable_beacon=false;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(!mvif.link_info[1].stock_mu_edca);cases++;
 conf.enable_beacon=true;fail_template=false;
 for(int len=0;len<=36;len++){
  mvif.link_info[1].stock_mu_edca=true;lengths[1]=len;memset(frames[1],0,128);mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(!mvif.link_info[1].stock_mu_edca);cases++;
 }
 /* All truncated MU payloads, and a claimed length beyond available bytes. */
 for(int len=0;len<14;len++){
  memset(frames[1],0,128);frames[1][36]=255;frames[1][37]=len;frames[1][38]=38;lengths[1]=38+len;
  mvif.link_info[1].stock_mu_edca=true;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(!mvif.link_info[1].stock_mu_edca);cases++;
 }
 frames[1][37]=14;lengths[1]=40;mvif.link_info[1].stock_mu_edca=true;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(!mvif.link_info[1].stock_mu_edca);cases++;
 /* Per-link/MBSSID profile templates are read for the requested vif+link. */
 memset(frames[2],0,128);cfg.he_mu_edca.he_mu_ac_be_param[2]=187;lengths[2]=hostapd_eid_he_mu_edca_parameter_set(&hapd,frames[2]+36)-frames[2];
 conf.link_id=2;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(mvif.link_info[2].stock_mu_edca && !mvif.link_info[1].stock_mu_edca);cases++;
 vif.type=NL80211_IFTYPE_STATION;int before=allocations;mvif.link_info[2].stock_mu_edca=false;mt7996_stock_update_beacon(&local.hw,&vif,&conf);assert(!mvif.link_info[2].stock_mu_edca && allocations==before);cases++;
 assert(allocations==frees);printf("PASS %d cases; actual hostapd IE -> beacon callback, actual AP cfg -> mt7996 conf_tx zero-MU reproduction, branch correction, malformed IE and lifecycle\n",cases);
}
'''
src=T/'ap-mu-edca-actual-functions.c';src.write_text(c)
cmd=['gcc','-O1','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer',str(src),'-o',str(T/'ap-mu-edca-actual-functions')]
r=subprocess.run(cmd,capture_output=True,text=True);(T/'ap-mu-edca-build.log').write_text(r.stdout+r.stderr);assert not r.returncode,r.stderr
r=subprocess.run([str(T/'ap-mu-edca-actual-functions')],capture_output=True,text=True);(T/'ap-mu-edca-run.log').write_text(r.stdout+r.stderr);assert not r.returncode,r.stderr
paths=set(p for _,p,_ in functions)|{ie,he,mh,defs}
(T/'ap-mu-edca-verification.json').write_text(json.dumps(dict(passed=True,cases=int(re.search(r'PASS (\d+)',r.stdout)[1]),result=r.stdout,source_sha256={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)},functions=[n for _,_,n in functions],limits=['Complete selected actual functions and actual IE iterator macros; surrounding kernel/hostapd structs and API callbacks modeled. No full kernel, firmware or RF execution.','Per-link synthetic templates exercise cache separation; not an over-air MBSSID inheritance or MLO interoperability test.','The demonstrated AP_UL correction requires the existing high-throughput gate; not proof of the 2.4GHz root cause.']),indent=2)+'\n');print(r.stdout,end='')
