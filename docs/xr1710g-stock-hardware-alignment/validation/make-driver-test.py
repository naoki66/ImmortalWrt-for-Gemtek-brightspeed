from pathlib import Path
out=Path(__file__).parent
c=(out/'patched/drivers/phy/airoha/phy-airoha-pcie.c').read_text()
c=c[c.index('#define LEQ_LEN_CTRL_MAX_VAL'):c.index('static int airoha_pcie_phy_exit')]
c=c.replace('struct device *dev;', 'void *dev;').replace('struct phy *phy;', 'void *phy;')
preamble=r'''
#include <assert.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef uint32_t u32;
#define __iomem
#define BIT(n) (1U << (n))
#define GENMASK(h,l) ((UINT32_MAX >> (31 - (h))) & (UINT32_MAX << (l)))
#define FIELD_GET(m,v) (((v) & (m)) >> __builtin_ctz(m))
#define FIELD_PREP(m,v) (((u32)(v) << __builtin_ctz(m)) & (m))
#define BUILD_BUG_ON_MSG(c,msg) _Static_assert(!(c),msg)
#define min(a,b) ((a)<(b)?(a):(b))
#include "phy-airoha-pcie-regs.h"
static u32 regs[6][0x2000/4];
static unsigned starts[2], samples[2], total[2], order[4], order_n;
static unsigned warnings, infos, elapsed, latch_n, cdr_n;
static unsigned lpf_exit_n[2];
static bool retail, never_lock;
static void *phy_get_drvdata(void *p) { return p; }
static unsigned bank(const void *p) {
    uintptr_t n=(uintptr_t)p-(uintptr_t)&regs[0][0];
    assert(n < sizeof(regs) && !(n & 3));
    return n / sizeof(regs[0]);
}
static unsigned offset(const void *p) {
    return ((uintptr_t)p-(uintptr_t)&regs[0][0]) % sizeof(regs[0]);
}
static u32 readl(const void *p) {
    unsigned b=bank(p), o=offset(p);
    if ((b==1||b==2) && o==0x530) {
        unsigned lane=b-1;
        unsigned target=(regs[b][0x150/4]&0xffff)+100;
        unsigned idac=regs[b][0x794/4]&0x7ff;
        unsigned cutoff=target==41600 ? 0x7af-lane : 0x56d+lane;
        bool lock=!never_lock && idac==cutoff;
        return (target+cutoff-idac)<<16 | lock;
    }
    return *(const u32 *)p;
}
static void writel(u32 val,void *p) {
    unsigned b=bank(p),o=offset(p);
    u32 old=*(u32*)p;
    if ((b==1||b==2) && o==0x150 && ((old^val)&0xffff)) {
        unsigned lane=b-1;
        assert(order_n<4);
        order[order_n++]=lane*10+((val&0xffff)==41500 ? 3 : 2);
        samples[lane]=0; starts[lane]++;
    }
    if ((b==1||b==2) && o==0x158 && (val&7)==3 && !(old&7)) {
        unsigned lane=b-1;
        samples[lane]++; total[lane]++;
        if(samples[lane]<=7) assert((regs[b][0x794/4]&0x7ff)==samples[lane]<<8);
    }
    if ((b==1||b==2) && o==0x820 && (old&BIT(8)) && !(val&BIT(8))) {
        unsigned lane=b-1;
        assert((val&BIT(24))==(retail?BIT(24):0));
        assert(val&BIT(16));
        lpf_exit_n[lane]++;
    }
    if ((b==1||b==2) && o==0x8c0 && retail && order_n==4 && samples[1]==25) {
        assert(retail && order_n==4 && samples[0]==25 && samples[1]==25);
        latch_n++;
    }
    if ((b==1||b==2) && o==0x34c && order_n==4) {
        if(retail) assert(latch_n==4);
        cdr_n++;
    }
    *(u32*)p=val;
}
static void usleep_range(unsigned lo, unsigned hi) { assert(lo<=hi);elapsed+=lo; }
static void msleep(unsigned ms) {elapsed+=ms*1000;}
static void dev_info(void *dev,const char *fmt,...) {(void)dev;(void)fmt;infos++;}
static void dev_warn(void *dev,const char *fmt,...) {(void)dev;(void)fmt;warnings++;}
'''
main=r'''
static void test(bool optin, bool fail) {
    memset(regs,0,sizeof(regs));
    memset(starts,0,sizeof(starts)); memset(samples,0,sizeof(samples));
    memset(total,0,sizeof(total)); memset(lpf_exit_n,0,sizeof(lpf_exit_n));
    order_n=warnings=infos=elapsed=latch_n=cdr_n=0;
    retail=optin;never_lock=fail;
    struct airoha_pcie_phy p={.csr_2l=regs[0],.pma0=regs[1],.pma1=regs[2],
        .p0_xr_dtime=regs[3],.p1_xr_dtime=regs[4],.rx_aeq=regs[5],
        .retail_rx_kflow=optin};
    assert(airoha_pcie_phy_init((struct phy *)&p)==0);
    assert((regs[0][0xec/4]&1)==(optin?1U:0U));
    assert(order_n==4 && order[0]==3 && order[1]==13 && order[2]==2 && order[3]==12);
    assert(infos==4 && warnings==(fail?4U:0U));
    assert(regs[3][0]==0x23020133 && regs[4][0]==0x23020133);
    assert(regs[5][0]==0x50500032 && regs[5][0x100/4]==0x50500032);
    for(unsigned lane=0;lane<2;lane++) {
        unsigned b=lane+1;
        unsigned gen2=0x56d+lane,gen3=0x7af-lane;
        unsigned count=optin||fail?50:32;
        assert(starts[lane]==2 && total[lane]==count);
        assert(lpf_exit_n[lane]==2);
        assert((regs[b][0x8c0/4]&0x7ff)==gen3);
        assert((regs[b][0x8bc/4]&0x7ff)==gen2);
        assert(((regs[b][0x8bc/4]>>16)&0x7ff)==gen2);
        assert(!(regs[b][0x794/4]&BIT(16)));
        if(optin) {
            assert((regs[b][0x174/4]&0x7ff)==gen2);
            assert(regs[b][0x19c/4]&1);
            assert(!(regs[b][0x8c0/4]&BIT(16)));
            assert(regs[b][0x8c0/4]&BIT(20));
        } else {
            assert(regs[b][0x174/4]==0 && regs[b][0x19c/4]==0);
            assert(regs[b][0x8c0/4]&BIT(16));
        }
    }
    assert(latch_n==(optin?4U:0U) && cdr_n==4);
    printf("PASS optin=%u never_lock=%u: 4 calibration passes, per-lane samples=%u, LPF/IDAC/latch/CDR/MAC verified\n",
           optin,fail,total[0]);
}
int main(void) {
    test(false,false);
    test(false,true);
    test(true,false);
    test(true,true);
    return 0;
}
'''
# Pointers to incomplete struct phy are used only by the original entry point.
(out/'patched/drivers/phy/airoha/test_actual_driver.c').write_text(
    preamble+'\nstruct phy;\n'+c+'\n'+main)
