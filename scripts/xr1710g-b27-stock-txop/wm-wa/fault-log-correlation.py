from pathlib import Path
import json,re,hashlib
T=Path('/mnt/f/openwrt/wifi-fix27-wm-wa-reverse');D=Path('/home/builder/immortalwrt-B13/build_dir/target-aarch64_cortex-a53_musl/linux-airoha_an7581/mt76-2026.10.28~0936617d');rows=[]
paths=[Path('/mnt/d/iperf压测/XR1710G_复测_20261107_2127/故障日志提取/01_213300_MT7996超时与PCIe错误_原文.txt'),Path('/mnt/d/iperf压测/XR1710G_三频各2小时_20261110_143428/故障日志取回_20261110_215854/01_首次故障_MT7996与PCIe_原文.txt')]
for p in paths:
 b=p.read_bytes();s=b.decode('utf-8-sig');events=[]
 for line in s.splitlines():
  m=re.search(r'\[\s*([\d.]+)\]',line)
  if not m:continue
  for kind,pattern in [('mcu_timeout',r'Message ([0-9a-fA-F]{8}).*timeout'),('first_aer_report',r'AER: Multiple Uncorrectable'),('pcie_completion_timeout',r'\[14\] CmpltTO'),('no_aer_callback',r'no error_detected callback'),('firmware_not_ready',r'Firmware is not ready'),('firmware_init_timeout',r'Timeout for initializing firmware')]:
   if re.search(pattern,line) and not any(x['kind']==kind for x in events):events.append(dict(kind=kind,uptime_s=float(m[1]),line=line))
 base=next(x['uptime_s'] for x in events if x['kind']=='mcu_timeout')
 for x in events:x['seconds_after_first_logged_mcu_timeout']=round(x['uptime_s']-base,6)
 rows.append(dict(path=str(p),sha256=hashlib.sha256(b).hexdigest(),events=events))
files=['mt76_connac_mcu.h','mt7996/mcu.c','mt7996/mac.c','mt7996/pci.c','mt7996/dma.c']
report=dict(command='00130022',decode={'wm_bit20':True,'uni_bit17':True,'query_bit16':True,'id':0x22,'name':'MCU_UNI_CMD_GET_MIB_INFO'},fault_logs=rows,current_sources=[dict(path=f,sha256=hashlib.sha256((D/f).read_bytes()).hexdigest()) for f in files],limitations=['Current B27 source mapping; logs came from older builds. No binary-symbol proof of historical function bodies.','Kernel log print order does not establish whether first MCU timeout preceded underlying PCIe or firmware failure.','No pre-reset firmware PC/stack or synchronized over-the-air capture available.'])
(T/'other-path-fault-correlation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(rows,indent=2,ensure_ascii=False)[:8500])
