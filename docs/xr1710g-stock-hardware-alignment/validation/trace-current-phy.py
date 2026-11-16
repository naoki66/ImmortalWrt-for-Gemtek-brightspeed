from pathlib import Path
import subprocess,json,difflib
lab=Path(__file__).parent
c=(lab/'patched/drivers/phy/airoha/phy-airoha-pcie.c').read_text()
c=c[c.index('#define LEQ_LEN_CTRL_MAX_VAL'):c.index('static int airoha_pcie_phy_exit')]
for lane in [0,1]:
    begin=c.index('static void\nairoha_phy_init_lane%d_rx_fw_pre_calib'%lane)
    end=c.index('\n}\n',begin)+3
    c=c[:begin]+f'''static void
airoha_phy_init_lane{lane}_rx_fw_pre_calib(struct airoha_pcie_phy *pcie_phy,
 enum airoha_pcie_port_gen gen)
{{
 (void)pcie_phy;
 printf("CAL {lane} %u\\n",gen);
}}
'''+c[end:]
c=c.replace('struct device *dev;', 'void *dev;').replace('struct phy *phy;', 'void *phy;')
preamble=r'''
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
typedef uint32_t u32;
#define __iomem
#define BIT(n) (1U << (n))
#define GENMASK(h,l) ((UINT32_MAX >> (31 - (h))) & (UINT32_MAX << (l)))
#define FIELD_GET(m,v) (((v)&(m))>>__builtin_ctz(m))
#define FIELD_PREP(m,v) (((u32)(v)<<__builtin_ctz(m))&(m))
#define BUILD_BUG_ON_MSG(c,msg) _Static_assert(!(c),msg)
#include "phy-airoha-pcie-regs.h"
struct phy;
static u32 regs[6][0x2000/4];
static void *phy_get_drvdata(void *p) {return p;}
static u32 readl(const void *p) {return *(const u32 *)p;}
static void writel(u32 v,void *p) {
 uintptr_t d=(uintptr_t)p-(uintptr_t)regs;
 assert(d<sizeof(regs) && !(d&3));
 unsigned bank=d/sizeof(regs[0]), offset=d%sizeof(regs[0]);
 *(u32*)p=v;
 if(bank<3) printf("W %#x %#x\n",0x1fa5a000+0x1000*bank+offset,v);
}
static void usleep_range(unsigned lo,unsigned hi) {(void)hi;printf("D %u\n",lo);}
static void msleep(unsigned ms) {printf("D %u\n",ms*1000);}
'''
main=r'''
int main(int argc,char **argv) {
 assert(argc==3);
 u32 seed=strtoul(argv[1],NULL,0);
 for(unsigned i=0;i<6;i++)
  for(unsigned j=0;j<0x2000/4;j++)regs[i][j]=seed;
 struct airoha_pcie_phy p={.csr_2l=regs[0],.pma0=regs[1],.pma1=regs[2],
 .p0_xr_dtime=regs[3],.p1_xr_dtime=regs[4],.rx_aeq=regs[5],.retail_rx_kflow=atoi(argv[2])};
 return airoha_pcie_phy_init((struct phy*)&p);
}
'''
file=lab/'patched/drivers/phy/airoha/trace_actual_driver.c'
file.write_text(preamble+c+main)
exe='/tmp/xr1710g-trace-phy'
subprocess.run(['cc','-std=gnu11','-Wall','-Wextra','-Werror','-fsanitize=undefined','-fno-sanitize-recover=undefined',str(file),'-o',exe],check=True)
for seed in [0,0xa5a5a5a5]:
    orig=json.loads((lab/f'retail-main-phy-trace-{seed:08x}.json').read_text())
    for enabled in [0,1]:
        lines=subprocess.check_output([exe,hex(seed),str(enabled)],text=True).splitlines()
        actual=[]
        for line in lines:
            cells=line.split()
            if cells[0]=='W':actual.append(['W',hex(int(cells[1],0)),hex(int(cells[2],0))])
            else:actual.append([cells[0],*map(int,cells[1:])])
        (lab/f'current-main-phy-trace-{seed:08x}-{enabled}.json').write_text(json.dumps(actual,indent=2)+'\n')
        def fmt(t):return [' '.join(map(str,x))+'\n' for x in t]
        diff=''.join(difflib.unified_diff(fmt(orig),fmt(actual),'retail',f'current optin={enabled}'))
        (lab/f'phy-trace-diff-{seed:08x}-{enabled}.txt').write_text(diff)
        print(hex(seed),enabled,len(actual),'events',len(diff.splitlines()),'diff lines')
        if enabled:print(diff[:6000])
