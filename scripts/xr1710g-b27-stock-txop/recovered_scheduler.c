/* XR1710G stock 5.1.1.12 mt_wifi.ko -- analytical reconstruction.
 * This is NOT original vendor source, NOT a loadable driver, and NOT a patch.
 * Reconstructed from AArch64 instructions + ELF relocations + diagnostic text.
 * Only the documented subpaths are represented. No guessed MCU opcodes.
 */
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

/* Relative to adapter+0x1083304, confirmed by init and setters. */
struct recovered_peak_cfg {
    uint8_t flags;                   /* +0, init 0x81; not all bits decoded */
    uint8_t aifsn;                   /* +1, init 5; storage != applied value */
    uint16_t txop;                   /* +2, chip capability value or zero */
    uint32_t avg_rx_length_th;        /* +4, init 1000 */
    uint32_t avg_tx_length_th;        /* +8, init 700 */
    uint32_t rx_high_bound;           /* +12, init 1450, units NOT established */
    uint32_t rx_low_bound;            /* +16, init 20, units NOT established */
    uint32_t simulated_avg_rx;        /* +20 */
    uint32_t simulated_avg_tx;        /* +24 */
    uint32_t tx_count_th[3];          /* +28,+32,+36, init 100000 each */
    uint32_t undecoded_40;            /* +40 */
    uint32_t simulated_tx_count[3];   /* +44,+48,+52 */
    uint32_t undecoded_56;            /* +56 */
};
_Static_assert(sizeof(struct recovered_peak_cfg)==60,"layout");
_Static_assert(offsetof(struct recovered_peak_cfg,tx_count_th)==28,"layout");

/* 0x297b54 peak_adjust_init_mac_ad: predicate is bEnableTxBurst.
 * physical_dev+690 initial capability is 187; see README pointer chain. */
void recovered_peak_init(struct recovered_peak_cfg *c,
                         bool capability_predicate, uint16_t cap_txop)
{
    *c=(struct recovered_peak_cfg){0};
    c->flags=0x81;
    c->aifsn=5;
    c->txop=capability_predicate?cap_txop:0;
    c->avg_rx_length_th=1000;
    c->avg_tx_length_th=700;
    c->rx_high_bound=1450;
    c->rx_low_bound=20;
    c->tx_count_th[0]=100000;
    c->tx_count_th[1]=100000;
    c->tx_count_th[2]=100000;
}

/* Vendor enum numbers belong to this API, not mac80211 AC enum numbers. */
extern void vendor_HW_SET_TX_BURST(void *adapter,void *wdev,
                                  unsigned ac_type,unsigned priority,
                                  unsigned txop,unsigned enable);

/* The primary-wdev branch of 0x297c10 peak_adjust_txop only.
 * Inputs correspond to already accumulated station counters. Other branches,
 * the profile parser and hardware worker are in the accompanying disassembly.
 */
void recovered_peak_primary(void *adapter,void *wdev,unsigned band,
                            const struct recovered_peak_cfg *c,
                            bool station_present,unsigned wdev_type,
                            bool mu_edca_present,bool mu_edca_byte4,
                            uint64_t tx_bytes,uint32_t tx_packets)
{
    if(!c->flags || band>2 || !wdev || !station_present)return;
    bool mu_condition=false;
    if(wdev_type==1){
        if(!mu_edca_present)return; /* 0x297e9c..0x297ea0 */
        mu_condition=mu_edca_byte4;
    }
    if(!c->txop || !(c->flags&1))return; /* 0x297db8..0x297dc4 */
    uint32_t count=c->simulated_tx_count[band];
    if(!count)count=tx_packets; /* 0x297d88..0x297d9c */
    uint32_t average=count?(uint32_t)(tx_bytes/count):0;
    unsigned txop=(average<=c->avg_tx_length_th && !mu_condition)?0:c->txop;
    vendor_HW_SET_TX_BURST(adapter,wdev,2,0,txop,1); /* 0x297e18/0x297fb8 */
}

/* Normalized view, not a vendor struct layout. Actual adapter offsets:
 * enabled +0x130bb28; dl_wrr +0x130bb32; state +0x130bb35;
 * dl_min +0x130bb36; ul_min +0x130bb37;
 * dl_max +0x130bb38; ul_max +0x130bb39.
 * UserCfgInit writes initial dl_min=4,ul_min=5,dl_max=6,ul_max=6.
 * Whether enabled is set during actual stock boot is NOT proven here.
 */
struct recovered_mcli_cfg {
    bool enabled,dl_wrr;
    uint8_t state,dl_min,ul_min,dl_max,ul_max;
};
extern void vendor_HW_SET_PART_WMM_PARAM(void *adapter,void *wdev,
        unsigned wmm_idx,unsigned ac_type,unsigned param,unsigned value);
extern void vendor_HW_SET_VOW_SCHEDULE_CTRL(void *adapter,
        unsigned a,unsigned b,unsigned c);

/* MacTableMaintenance 0x9fd8..0xa00c and 0xb580..0xc190.
 * Upstream scene classification and eligibility counters are supplied as
 * inputs, not guessed from names. Vendor diagnostic text identifies mode1=DL,
 * mode2=UL. This function is intentionally just the proven state transition.
 */
void recovered_mcli_transition(void *adapter,void *wdev,unsigned wmm,
        struct recovered_mcli_cfg *cfg,uint64_t periodic_counter,
        unsigned mode,unsigned dl_clients,unsigned ul_clients,
        unsigned tcp_qualified_clients,unsigned required_clients,
        unsigned default_min,unsigned default_max,
        unsigned default_schedule_b,unsigned default_schedule_c)
{
    if(!cfg->enabled || periodic_counter%3)return;
    bool scene=dl_clients+ul_clients>=required_clients &&
               tcp_qualified_clients>=required_clients;
    if(!wdev)return;
    unsigned min,max;
    if(scene && mode==1){
        if(cfg->state&1)return;
        cfg->state|=1; min=cfg->dl_min; max=cfg->dl_max;
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,3,max);
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,2,min);
        if(cfg->dl_wrr)vendor_HW_SET_VOW_SCHEDULE_CTRL(adapter,1,1,1);
    }else if(scene && mode==2){
        if(cfg->state&2)return;
        cfg->state|=2; min=cfg->ul_min; max=cfg->ul_max;
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,3,max);
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,2,min);
        if(cfg->dl_wrr)vendor_HW_SET_VOW_SCHEDULE_CTRL(adapter,1,1,1);
    }else if(!scene){
        if(!cfg->state)return;
        cfg->state=0;
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,3,default_max);
        vendor_HW_SET_PART_WMM_PARAM(adapter,wdev,wmm,1,2,default_min);
        if(cfg->dl_wrr)vendor_HW_SET_VOW_SCHEDULE_CTRL(adapter,1,
                default_schedule_b,default_schedule_c);
    }
}

/* Importantly, no recovered operation above edits ACKs already waiting in a
 * remote client's transmit queue. Any benefit to that path is indirect and
 * must be established by real-device measurement.
 */
