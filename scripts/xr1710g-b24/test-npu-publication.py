#!/usr/bin/env python3
"""Run publication-order models against actual prepared old/new mt76 code."""
from pathlib import Path
import argparse,subprocess,tempfile,shutil,json
p=argparse.ArgumentParser();p.add_argument('--mt76-dir',required=True,type=Path);p.add_argument('--output',required=True,type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[2];args.output.mkdir(parents=True,exist_ok=True)
template=Path(__file__).with_name('test-npu-publication.c.in').read_text();results=[]
with tempfile.TemporaryDirectory(prefix='xr1710g-publication-') as d:
 old=Path(d)
 for n in ['dma.c','npu.c']:shutil.copyfile(args.mt76_dir/n,old/n)
 subprocess.run(['patch','--batch','--fuzz=0','-R','-p1','-i',str(root/'package/kernel/mt76/patches/142-mt76-order-npu-rx-buffer-ownership.patch')],cwd=old,check=True)
 for label,source,is_new in [('old',old/'npu.c',0),('new',args.mt76_dir/'npu.c',1)]:
  text=source.read_text();fn=text[text.index('int mt76_npu_fill_rx_queue'):text.index('\nvoid mt76_npu_queue_cleanup')]
  c=args.output/(label+'.c');c.write_text(template.replace('@ACTUAL_FILL_FUNCTION@',fn).replace('@TEST_NEW@',str(is_new)))
  exe=old/label;subprocess.run(['gcc','-O1','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer',str(c),'-o',str(exe)],check=True)
  result=subprocess.run([str(exe)],capture_output=True);(args.output/(label+'.log')).write_bytes(result.stdout+result.stderr);assert result.returncode==0
  print(result.stdout.decode().strip());results.append(dict(label=label,exit=result.returncode,output=result.stdout.decode().strip()))
(args.output/'results.json').write_text(json.dumps(dict(passed=True,results=results,limitations='A modeled DMA observer and actual refill function; not hardware validation'),indent=2))
