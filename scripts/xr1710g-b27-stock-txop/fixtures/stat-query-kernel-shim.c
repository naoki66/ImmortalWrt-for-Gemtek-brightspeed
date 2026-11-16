
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
#define STOCK_INVALID BIT(3)
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
#define U16_MAX UINT16_MAX
#define min_t(t,a,b) ((t)(a)<(t)(b)?(t)(a):(t)(b))
#define dev_warn_ratelimited(...) ((void)0)
#include "stock_policy.h"
struct mt7996_stock_stats {
	u64 tx_bytes, rx_bytes;
	u64 tx_attempts, tx_failed;
	bool tx_stat_invalid;
	u32 tx_msdu, rx_msdu, tx_mpdu;
	u8 seen;
	u32 epoch;
	unsigned long started;
};

struct mt7996_stock_average {
	u64 tx_bytes, rx_bytes;
	u64 tx_attempts, tx_failed;
	u8 tx_per;
	bool tx_per_valid;
	u32 rx_pkt_len;
	u32 tx_msdu, rx_msdu, tx_mpdu;
};

struct mt7996_stock_ba {
	u32 epoch, generation;
	u8 baseline, index, cap;
	bool valid, changed;
};

struct mt7996_stock_edca {
	bool enabled;
	bool active;
	bool ul;
	bool near_far;
	bool mcli;
	u16 mcli_tx_clients, mcli_rx_clients;
	u8 main_mode;
	bool main_per_valid;
	u8 main_per;
	u16 main_wcid;
	u64 main_attempts, main_failed;
	u16 txop;
	u16 average_tx_len;
	u32 average_rx_len;
	int error;
	u64 updates, failures;
	u32 epoch;
};


struct mt76_wcid {u16 idx;bool sta;};
struct mt7996_sta_link {struct mt76_wcid wcid;struct mt7996_stock_stats stock_stats;struct mt7996_stock_average stock_avg;u32 stock_avg_epoch;unsigned long stock_sampled;bool connected;};
struct channel {int band;};
struct mt76_phy {u8 band_idx;struct {struct channel *chan;} chandef;};
struct mt7996_phy {struct mt76_phy *mt76;};
struct mt7996_vif_link {struct mt7996_phy *phy;};
struct params {struct {unsigned mu_edca_timer;} mu_edca_param_rec;u16 txop;};
struct mt7996_vif_link_info {struct params queue_params[4];bool stock_mu_edca;struct mt7996_stock_edca stock;};
struct mt7996_vif {struct mt7996_vif_link links[16];struct mt7996_vif_link_info link_info[16];};
struct ieee80211_bss_conf {bool enable_beacon;};
struct ieee80211_vif {int type;_Alignas(16) unsigned char drv_priv[sizeof(struct mt7996_vif)];struct ieee80211_bss_conf *conf[16];};
struct mt7996_sta {struct mt7996_vif *vif;struct mt7996_sta_link *link[16];};
struct ieee80211_sta {bool mlo;_Alignas(16) unsigned char drv_priv[sizeof(struct mt7996_sta)];};
struct mt7996_dev {int stock_stats_lock;u32 stock_epoch;u64 stock_missing,stock_events[3];bool stock_policy;struct {unsigned long state;} mphy;struct {void *dev;} mt76;};
static void mt7996_stock_ba_update(struct mt7996_dev *d,struct mt7996_sta *m,struct mt7996_sta_link *s,bool enable,bool sample){(void)d;(void)m;(void)s;(void)enable;(void)sample;}
static struct mt7996_vif_link *mt7996_vif_link(struct mt7996_dev *d,struct ieee80211_vif *v,int i){(void)d;return &((struct mt7996_vif*)v->drv_priv)->links[i];}
static struct mt7996_phy *mt7996_vif_link_phy(struct mt7996_vif_link *v){return v->phy;}

static struct ieee80211_bss_conf *link_conf_dereference_protected(struct ieee80211_vif *v,int i){return v->conf[i];}
static unsigned calls, actual;
static int mt7996_mcu_set_tx(struct mt7996_dev *d,struct ieee80211_vif *v,struct ieee80211_bss_conf *c){
 (void)d;(void)c;struct mt7996_vif *m=(void*)v->drv_priv;calls++;
 actual=m->link_info[0].stock.active?m->link_info[0].stock.txop:m->link_info[0].queue_params[0].txop;return 0;
}
