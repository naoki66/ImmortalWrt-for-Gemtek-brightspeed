
/mnt/f/openwrt/research/wifi6-public-references-20261108/stock-5.1.1.12-extracted/stock-kernel.uncompressed.bin:     file format binary


Disassembly of section .data:

0000000000369fd0 <.data+0x369fd0>:
  369fd0:	a9b97bfd 	stp	x29, x30, [sp, #-112]!
  369fd4:	910003fd 	mov	x29, sp
  369fd8:	a90153f3 	stp	x19, x20, [sp, #16]
  369fdc:	a9025bf5 	stp	x21, x22, [sp, #32]
  369fe0:	a90363f7 	stp	x23, x24, [sp, #48]
  369fe4:	a9046bf9 	stp	x25, x26, [sp, #64]
  369fe8:	12001c1a 	and	w26, w0, #0xff
  369fec:	52800040 	mov	w0, #0x2                   	// #2
  369ff0:	a90573fb 	stp	x27, x28, [sp, #80]
  369ff4:	940101df 	bl	0x3aa770
  369ff8:	b9006bff 	str	wzr, [sp, #104]
  369ffc:	72001c1f 	tst	w0, #0xff
  36a000:	54012140 	b.eq	0x36c428  // b.none
  36a004:	52960000 	mov	w0, #0xb000                	// #45056
  36a008:	52971802 	mov	w2, #0xb8c0                	// #47296
  36a00c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a010:	52960001 	mov	w1, #0xb000                	// #45056
  36a014:	3501199a 	cbnz	w26, 0x36c344
  36a018:	97fffd8a 	bl	0x369640
  36a01c:	d50332bf 	dmb	oshst
  36a020:	b00044b3 	adrp	x19, 0xbff000
  36a024:	91256275 	add	x21, x19, #0x958
  36a028:	120f7800 	and	w0, w0, #0xfffeffff
  36a02c:	f94006a1 	ldr	x1, [x21, #8]
  36a030:	91230021 	add	x1, x1, #0x8c0
  36a034:	b9000020 	str	w0, [x1]
  36a038:	52980000 	mov	w0, #0xc000                	// #49152
  36a03c:	52971802 	mov	w2, #0xb8c0                	// #47296
  36a040:	52960001 	mov	w1, #0xb000                	// #45056
  36a044:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a048:	97fffd7e 	bl	0x369640
  36a04c:	d50332bf 	dmb	oshst
  36a050:	f9400aa1 	ldr	x1, [x21, #16]
  36a054:	120f7800 	and	w0, w0, #0xfffeffff
  36a058:	91230021 	add	x1, x1, #0x8c0
  36a05c:	b9000020 	str	w0, [x1]
  36a060:	52800219 	mov	w25, #0x10                  	// #16
  36a064:	52940000 	mov	w0, #0xa000                	// #40960
  36a068:	52800002 	mov	w2, #0x0                   	// #0
  36a06c:	52800001 	mov	w1, #0x0                   	// #0
  36a070:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a074:	97fffd73 	bl	0x369640
  36a078:	33081320 	bfi	w0, w25, #24, #5
  36a07c:	d50332bf 	dmb	oshst
  36a080:	f944ae61 	ldr	x1, [x19, #2392]
  36a084:	aa1503f4 	mov	x20, x21
  36a088:	b9000020 	str	w0, [x1]
  36a08c:	52960000 	mov	w0, #0xb000                	// #45056
  36a090:	52971e02 	mov	w2, #0xb8f0                	// #47344
  36a094:	52960001 	mov	w1, #0xb000                	// #45056
  36a098:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a09c:	97fffd69 	bl	0x369640
  36a0a0:	d50332bf 	dmb	oshst
  36a0a4:	f94006a0 	ldr	x0, [x21, #8]
  36a0a8:	52999976 	mov	w22, #0xcccb                	// #52427
  36a0ac:	72b99976 	movk	w22, #0xcccb, lsl #16
  36a0b0:	9123c000 	add	x0, x0, #0x8f0
  36a0b4:	b9000016 	str	w22, [x0]
  36a0b8:	52960000 	mov	w0, #0xb000                	// #45056
  36a0bc:	52971e82 	mov	w2, #0xb8f4                	// #47348
  36a0c0:	52960001 	mov	w1, #0xb000                	// #45056
  36a0c4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a0c8:	97fffd5e 	bl	0x369640
  36a0cc:	d50332bf 	dmb	oshst
  36a0d0:	f9400680 	ldr	x0, [x20, #8]
  36a0d4:	52999975 	mov	w21, #0xcccb                	// #52427
  36a0d8:	9123d000 	add	x0, x0, #0x8f4
  36a0dc:	b9000015 	str	w21, [x0]
  36a0e0:	52980000 	mov	w0, #0xc000                	// #49152
  36a0e4:	52971e02 	mov	w2, #0xb8f0                	// #47344
  36a0e8:	52960001 	mov	w1, #0xb000                	// #45056
  36a0ec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a0f0:	97fffd54 	bl	0x369640
  36a0f4:	d50332bf 	dmb	oshst
  36a0f8:	f9400a80 	ldr	x0, [x20, #16]
  36a0fc:	9123c000 	add	x0, x0, #0x8f0
  36a100:	b9000016 	str	w22, [x0]
  36a104:	52980000 	mov	w0, #0xc000                	// #49152
  36a108:	52971e82 	mov	w2, #0xb8f4                	// #47348
  36a10c:	52960001 	mov	w1, #0xb000                	// #45056
  36a110:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a114:	97fffd4b 	bl	0x369640
  36a118:	d50332bf 	dmb	oshst
  36a11c:	f9400a80 	ldr	x0, [x20, #16]
  36a120:	9123d000 	add	x0, x0, #0x8f4
  36a124:	b9000015 	str	w21, [x0]
  36a128:	52940000 	mov	w0, #0xa000                	// #40960
  36a12c:	52800002 	mov	w2, #0x0                   	// #0
  36a130:	52800001 	mov	w1, #0x0                   	// #0
  36a134:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a138:	97fffd42 	bl	0x369640
  36a13c:	32000000 	orr	w0, w0, #0x1
  36a140:	d50332bf 	dmb	oshst
  36a144:	f944ae61 	ldr	x1, [x19, #2392]
  36a148:	b9000020 	str	w0, [x1]
  36a14c:	52940000 	mov	w0, #0xa000                	// #40960
  36a150:	52801402 	mov	w2, #0xa0                  	// #160
  36a154:	52800001 	mov	w1, #0x0                   	// #0
  36a158:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a15c:	97fffd39 	bl	0x369640
  36a160:	528000a5 	mov	w5, #0x5                   	// #5
  36a164:	331808a0 	bfi	w0, w5, #8, #3
  36a168:	d50332bf 	dmb	oshst
  36a16c:	f944ae61 	ldr	x1, [x19, #2392]
  36a170:	91028021 	add	x1, x1, #0xa0
  36a174:	b9000020 	str	w0, [x1]
  36a178:	52940000 	mov	w0, #0xa000                	// #40960
  36a17c:	52801482 	mov	w2, #0xa4                  	// #164
  36a180:	52800001 	mov	w1, #0x0                   	// #0
  36a184:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a188:	97fffd2e 	bl	0x369640
  36a18c:	528000a5 	mov	w5, #0x5                   	// #5
  36a190:	330808a0 	bfi	w0, w5, #24, #3
  36a194:	d50332bf 	dmb	oshst
  36a198:	f944ae61 	ldr	x1, [x19, #2392]
  36a19c:	91029021 	add	x1, x1, #0xa4
  36a1a0:	b9000020 	str	w0, [x1]
  36a1a4:	52800058 	mov	w24, #0x2                   	// #2
  36a1a8:	52940000 	mov	w0, #0xa000                	// #40960
  36a1ac:	52801402 	mov	w2, #0xa0                  	// #160
  36a1b0:	52800001 	mov	w1, #0x0                   	// #0
  36a1b4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a1b8:	97fffd22 	bl	0x369640
  36a1bc:	33100700 	bfi	w0, w24, #16, #2
  36a1c0:	d50332bf 	dmb	oshst
  36a1c4:	f944ae61 	ldr	x1, [x19, #2392]
  36a1c8:	91028021 	add	x1, x1, #0xa0
  36a1cc:	b9000020 	str	w0, [x1]
  36a1d0:	52940000 	mov	w0, #0xa000                	// #40960
  36a1d4:	52801502 	mov	w2, #0xa8                  	// #168
  36a1d8:	52800001 	mov	w1, #0x0                   	// #0
  36a1dc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a1e0:	97fffd18 	bl	0x369640
  36a1e4:	33000700 	bfxil	w0, w24, #0, #2
  36a1e8:	d50332bf 	dmb	oshst
  36a1ec:	f944ae61 	ldr	x1, [x19, #2392]
  36a1f0:	9102a021 	add	x1, x1, #0xa8
  36a1f4:	b9000020 	str	w0, [x1]
  36a1f8:	52940000 	mov	w0, #0xa000                	// #40960
  36a1fc:	52801482 	mov	w2, #0xa4                  	// #164
  36a200:	52800001 	mov	w1, #0x0                   	// #0
  36a204:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a208:	97fffd0e 	bl	0x369640
  36a20c:	12177800 	and	w0, w0, #0xfffffeff
  36a210:	d50332bf 	dmb	oshst
  36a214:	f944ae61 	ldr	x1, [x19, #2392]
  36a218:	91029021 	add	x1, x1, #0xa4
  36a21c:	b9000020 	str	w0, [x1]
  36a220:	52940000 	mov	w0, #0xa000                	// #40960
  36a224:	52801502 	mov	w2, #0xa8                  	// #168
  36a228:	52800001 	mov	w1, #0x0                   	// #0
  36a22c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a230:	97fffd04 	bl	0x369640
  36a234:	12077800 	and	w0, w0, #0xfeffffff
  36a238:	d50332bf 	dmb	oshst
  36a23c:	f944ae61 	ldr	x1, [x19, #2392]
  36a240:	9102a021 	add	x1, x1, #0xa8
  36a244:	b9000020 	str	w0, [x1]
  36a248:	52800255 	mov	w21, #0x12                  	// #18
  36a24c:	52940000 	mov	w0, #0xa000                	// #40960
  36a250:	52801482 	mov	w2, #0xa4                  	// #164
  36a254:	52800001 	mov	w1, #0x0                   	// #0
  36a258:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a25c:	97fffcf9 	bl	0x369640
  36a260:	331012a0 	bfi	w0, w21, #16, #5
  36a264:	d50332bf 	dmb	oshst
  36a268:	f944ae61 	ldr	x1, [x19, #2392]
  36a26c:	91029021 	add	x1, x1, #0xa4
  36a270:	b9000020 	str	w0, [x1]
  36a274:	52940000 	mov	w0, #0xa000                	// #40960
  36a278:	52801582 	mov	w2, #0xac                  	// #172
  36a27c:	52800001 	mov	w1, #0x0                   	// #0
  36a280:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a284:	97fffcef 	bl	0x369640
  36a288:	330012a0 	bfxil	w0, w21, #0, #5
  36a28c:	d50332bf 	dmb	oshst
  36a290:	f944ae61 	ldr	x1, [x19, #2392]
  36a294:	9102b021 	add	x1, x1, #0xac
  36a298:	b9000020 	str	w0, [x1]
  36a29c:	52940000 	mov	w0, #0xa000                	// #40960
  36a2a0:	52801402 	mov	w2, #0xa0                  	// #160
  36a2a4:	52800001 	mov	w1, #0x0                   	// #0
  36a2a8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a2ac:	97fffce5 	bl	0x369640
  36a2b0:	12067400 	and	w0, w0, #0xfcffffff
  36a2b4:	d50332bf 	dmb	oshst
  36a2b8:	f944ae61 	ldr	x1, [x19, #2392]
  36a2bc:	91028021 	add	x1, x1, #0xa0
  36a2c0:	b9000020 	str	w0, [x1]
  36a2c4:	52940000 	mov	w0, #0xa000                	// #40960
  36a2c8:	52801502 	mov	w2, #0xa8                  	// #168
  36a2cc:	52800001 	mov	w1, #0x0                   	// #0
  36a2d0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a2d4:	97fffcdb 	bl	0x369640
  36a2d8:	12167400 	and	w0, w0, #0xfffffcff
  36a2dc:	d50332bf 	dmb	oshst
  36a2e0:	f944ae61 	ldr	x1, [x19, #2392]
  36a2e4:	9102a021 	add	x1, x1, #0xa8
  36a2e8:	b9000020 	str	w0, [x1]
  36a2ec:	52940000 	mov	w0, #0xa000                	// #40960
  36a2f0:	52801602 	mov	w2, #0xb0                  	// #176
  36a2f4:	52800001 	mov	w1, #0x0                   	// #0
  36a2f8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a2fc:	97fffcd1 	bl	0x369640
  36a300:	7281a1a0 	movk	w0, #0xd0d
  36a304:	d50332bf 	dmb	oshst
  36a308:	f944ae61 	ldr	x1, [x19, #2392]
  36a30c:	9102c021 	add	x1, x1, #0xb0
  36a310:	b9000020 	str	w0, [x1]
  36a314:	52960001 	mov	w1, #0xb000                	// #45056
  36a318:	52960000 	mov	w0, #0xb000                	// #45056
  36a31c:	52968c02 	mov	w2, #0xb460                	// #46176
  36a320:	12802455 	mov	w21, #0xfffffedd            	// #-291
  36a324:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a328:	97fffcc6 	bl	0x369640
  36a32c:	0a150001 	and	w1, w0, w21
  36a330:	52802456 	mov	w22, #0x122                 	// #290
  36a334:	2a160021 	orr	w1, w1, w22
  36a338:	33003c20 	bfxil	w0, w1, #0, #16
  36a33c:	d50332bf 	dmb	oshst
  36a340:	f9400681 	ldr	x1, [x20, #8]
  36a344:	91118021 	add	x1, x1, #0x460
  36a348:	b9000020 	str	w0, [x1]
  36a34c:	52980000 	mov	w0, #0xc000                	// #49152
  36a350:	52968c02 	mov	w2, #0xb460                	// #46176
  36a354:	52960001 	mov	w1, #0xb000                	// #45056
  36a358:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a35c:	97fffcb9 	bl	0x369640
  36a360:	0a150015 	and	w21, w0, w21
  36a364:	2a1602b5 	orr	w21, w21, w22
  36a368:	33003ea0 	bfxil	w0, w21, #0, #16
  36a36c:	d50332bf 	dmb	oshst
  36a370:	f9400a81 	ldr	x1, [x20, #16]
  36a374:	91118021 	add	x1, x1, #0x460
  36a378:	b9000020 	str	w0, [x1]
  36a37c:	52960001 	mov	w1, #0xb000                	// #45056
  36a380:	52960000 	mov	w0, #0xb000                	// #45056
  36a384:	52964c02 	mov	w2, #0xb260                	// #45664
  36a388:	12802035 	mov	w21, #0xfffffefe            	// #-258
  36a38c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a390:	97fffcac 	bl	0x369640
  36a394:	0a150001 	and	w1, w0, w21
  36a398:	52802036 	mov	w22, #0x101                 	// #257
  36a39c:	2a160021 	orr	w1, w1, w22
  36a3a0:	33003c20 	bfxil	w0, w1, #0, #16
  36a3a4:	d50332bf 	dmb	oshst
  36a3a8:	f9400681 	ldr	x1, [x20, #8]
  36a3ac:	91098021 	add	x1, x1, #0x260
  36a3b0:	b9000020 	str	w0, [x1]
  36a3b4:	52960001 	mov	w1, #0xb000                	// #45056
  36a3b8:	52980000 	mov	w0, #0xc000                	// #49152
  36a3bc:	52964c02 	mov	w2, #0xb260                	// #45664
  36a3c0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a3c4:	97fffc9f 	bl	0x369640
  36a3c8:	0a150001 	and	w1, w0, w21
  36a3cc:	2a160021 	orr	w1, w1, w22
  36a3d0:	33003c20 	bfxil	w0, w1, #0, #16
  36a3d4:	d50332bf 	dmb	oshst
  36a3d8:	f9400a81 	ldr	x1, [x20, #16]
  36a3dc:	91098021 	add	x1, x1, #0x260
  36a3e0:	b9000020 	str	w0, [x1]
  36a3e4:	d28218e0 	mov	x0, #0x10c7                	// #4295
  36a3e8:	940dd8f6 	bl	0x6e07c0
  36a3ec:	52960000 	mov	w0, #0xb000                	// #45056
  36a3f0:	52971c02 	mov	w2, #0xb8e0                	// #47328
  36a3f4:	52960001 	mov	w1, #0xb000                	// #45056
  36a3f8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a3fc:	97fffc91 	bl	0x369640
  36a400:	d50332bf 	dmb	oshst
  36a404:	f9400680 	ldr	x0, [x20, #8]
  36a408:	52812177 	mov	w23, #0x90b                 	// #2315
  36a40c:	72a54017 	movk	w23, #0x2a00, lsl #16
  36a410:	91238000 	add	x0, x0, #0x8e0
  36a414:	b9000017 	str	w23, [x0]
  36a418:	52980000 	mov	w0, #0xc000                	// #49152
  36a41c:	52971c02 	mov	w2, #0xb8e0                	// #47328
  36a420:	52960001 	mov	w1, #0xb000                	// #45056
  36a424:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a428:	97fffc86 	bl	0x369640
  36a42c:	d50332bf 	dmb	oshst
  36a430:	f9400a80 	ldr	x0, [x20, #16]
  36a434:	91238000 	add	x0, x0, #0x8e0
  36a438:	b9000017 	str	w23, [x0]
  36a43c:	52940000 	mov	w0, #0xa000                	// #40960
  36a440:	52802682 	mov	w2, #0x134                 	// #308
  36a444:	52800001 	mov	w1, #0x0                   	// #0
  36a448:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a44c:	97fffc7d 	bl	0x369640
  36a450:	32180000 	orr	w0, w0, #0x100
  36a454:	d50332bf 	dmb	oshst
  36a458:	f944ae61 	ldr	x1, [x19, #2392]
  36a45c:	9104d021 	add	x1, x1, #0x134
  36a460:	b9000020 	str	w0, [x1]
  36a464:	52940000 	mov	w0, #0xa000                	// #40960
  36a468:	52803d82 	mov	w2, #0x1ec                 	// #492
  36a46c:	52800001 	mov	w1, #0x0                   	// #0
  36a470:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a474:	97fffc73 	bl	0x369640
  36a478:	32180000 	orr	w0, w0, #0x100
  36a47c:	d50332bf 	dmb	oshst
  36a480:	f944ae61 	ldr	x1, [x19, #2392]
  36a484:	9107b021 	add	x1, x1, #0x1ec
  36a488:	b9000020 	str	w0, [x1]
  36a48c:	52940000 	mov	w0, #0xa000                	// #40960
  36a490:	52802082 	mov	w2, #0x104                 	// #260
  36a494:	52800001 	mov	w1, #0x0                   	// #0
  36a498:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a49c:	97fffc69 	bl	0x369640
  36a4a0:	12177800 	and	w0, w0, #0xfffffeff
  36a4a4:	d50332bf 	dmb	oshst
  36a4a8:	f944ae61 	ldr	x1, [x19, #2392]
  36a4ac:	91041021 	add	x1, x1, #0x104
  36a4b0:	b9000020 	str	w0, [x1]
  36a4b4:	52940000 	mov	w0, #0xa000                	// #40960
  36a4b8:	52803782 	mov	w2, #0x1bc                 	// #444
  36a4bc:	52800001 	mov	w1, #0x0                   	// #0
  36a4c0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a4c4:	97fffc5f 	bl	0x369640
  36a4c8:	12177800 	and	w0, w0, #0xfffffeff
  36a4cc:	d50332bf 	dmb	oshst
  36a4d0:	f944ae61 	ldr	x1, [x19, #2392]
  36a4d4:	9106f021 	add	x1, x1, #0x1bc
  36a4d8:	b9000020 	str	w0, [x1]
  36a4dc:	52800037 	mov	w23, #0x1                   	// #1
  36a4e0:	52940000 	mov	w0, #0xa000                	// #40960
  36a4e4:	52802002 	mov	w2, #0x100                 	// #256
  36a4e8:	52800001 	mov	w1, #0x0                   	// #0
  36a4ec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a4f0:	97fffc54 	bl	0x369640
  36a4f4:	331806e0 	bfi	w0, w23, #8, #2
  36a4f8:	d50332bf 	dmb	oshst
  36a4fc:	f944ae61 	ldr	x1, [x19, #2392]
  36a500:	91040021 	add	x1, x1, #0x100
  36a504:	b9000020 	str	w0, [x1]
  36a508:	52940000 	mov	w0, #0xa000                	// #40960
  36a50c:	52803702 	mov	w2, #0x1b8                 	// #440
  36a510:	52800001 	mov	w1, #0x0                   	// #0
  36a514:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a518:	97fffc4a 	bl	0x369640
  36a51c:	331806e0 	bfi	w0, w23, #8, #2
  36a520:	d50332bf 	dmb	oshst
  36a524:	f944ae61 	ldr	x1, [x19, #2392]
  36a528:	9106e021 	add	x1, x1, #0x1b8
  36a52c:	b9000020 	str	w0, [x1]
  36a530:	52960001 	mov	w1, #0xb000                	// #45056
  36a534:	52960000 	mov	w0, #0xb000                	// #45056
  36a538:	52970502 	mov	w2, #0xb828                	// #47144
  36a53c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a540:	97fffc40 	bl	0x369640
  36a544:	0a4042a1 	and	w1, w21, w0, lsr #16
  36a548:	32180021 	orr	w1, w1, #0x100
  36a54c:	33103c20 	bfi	w0, w1, #16, #16
  36a550:	d50332bf 	dmb	oshst
  36a554:	f9400681 	ldr	x1, [x20, #8]
  36a558:	9120a021 	add	x1, x1, #0x828
  36a55c:	b9000020 	str	w0, [x1]
  36a560:	52960001 	mov	w1, #0xb000                	// #45056
  36a564:	52980000 	mov	w0, #0xc000                	// #49152
  36a568:	52970502 	mov	w2, #0xb828                	// #47144
  36a56c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a570:	97fffc34 	bl	0x369640
  36a574:	0a4042a1 	and	w1, w21, w0, lsr #16
  36a578:	32180021 	orr	w1, w1, #0x100
  36a57c:	33103c20 	bfi	w0, w1, #16, #16
  36a580:	d50332bf 	dmb	oshst
  36a584:	f9400a81 	ldr	x1, [x20, #16]
  36a588:	9120a021 	add	x1, x1, #0x828
  36a58c:	b9000020 	str	w0, [x1]
  36a590:	52940000 	mov	w0, #0xa000                	// #40960
  36a594:	52800982 	mov	w2, #0x4c                  	// #76
  36a598:	52800001 	mov	w1, #0x0                   	// #0
  36a59c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a5a0:	97fffc28 	bl	0x369640
  36a5a4:	52800401 	mov	w1, #0x20                  	// #32
  36a5a8:	33081c20 	bfi	w0, w1, #24, #8
  36a5ac:	d50332bf 	dmb	oshst
  36a5b0:	f944ae61 	ldr	x1, [x19, #2392]
  36a5b4:	91013021 	add	x1, x1, #0x4c
  36a5b8:	b9000020 	str	w0, [x1]
  36a5bc:	52940000 	mov	w0, #0xa000                	// #40960
  36a5c0:	52800382 	mov	w2, #0x1c                  	// #28
  36a5c4:	52800001 	mov	w1, #0x0                   	// #0
  36a5c8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a5cc:	97fffc1d 	bl	0x369640
  36a5d0:	32180000 	orr	w0, w0, #0x100
  36a5d4:	d50332bf 	dmb	oshst
  36a5d8:	f944ae61 	ldr	x1, [x19, #2392]
  36a5dc:	91007021 	add	x1, x1, #0x1c
  36a5e0:	b9000020 	str	w0, [x1]
  36a5e4:	52940000 	mov	w0, #0xa000                	// #40960
  36a5e8:	52800782 	mov	w2, #0x3c                  	// #60
  36a5ec:	52800001 	mov	w1, #0x0                   	// #0
  36a5f0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a5f4:	97fffc13 	bl	0x369640
  36a5f8:	d50332bf 	dmb	oshst
  36a5fc:	f944ae60 	ldr	x0, [x19, #2392]
  36a600:	9100f000 	add	x0, x0, #0x3c
  36a604:	b900001f 	str	wzr, [x0]
  36a608:	52940000 	mov	w0, #0xa000                	// #40960
  36a60c:	52800802 	mov	w2, #0x40                  	// #64
  36a610:	52800001 	mov	w1, #0x0                   	// #0
  36a614:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a618:	97fffc0a 	bl	0x369640
  36a61c:	12103c00 	and	w0, w0, #0xffff0000
  36a620:	d50332bf 	dmb	oshst
  36a624:	f944ae61 	ldr	x1, [x19, #2392]
  36a628:	91010021 	add	x1, x1, #0x40
  36a62c:	b9000020 	str	w0, [x1]
  36a630:	52940000 	mov	w0, #0xa000                	// #40960
  36a634:	52800702 	mov	w2, #0x38                  	// #56
  36a638:	52800001 	mov	w1, #0x0                   	// #0
  36a63c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a640:	97fffc00 	bl	0x369640
  36a644:	529fdfe1 	mov	w1, #0xfeff                	// #65279
  36a648:	72bfffc1 	movk	w1, #0xfffe, lsl #16
  36a64c:	0a010000 	and	w0, w0, w1
  36a650:	d50332bf 	dmb	oshst
  36a654:	f944ae61 	ldr	x1, [x19, #2392]
  36a658:	9100e021 	add	x1, x1, #0x38
  36a65c:	b9000020 	str	w0, [x1]
  36a660:	52940000 	mov	w0, #0xa000                	// #40960
  36a664:	52800102 	mov	w2, #0x8                   	// #8
  36a668:	52800001 	mov	w1, #0x0                   	// #0
  36a66c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a670:	529c1c1c 	mov	w28, #0xe0e0                	// #57568
  36a674:	97fffbf3 	bl	0x369640
  36a678:	72bffc1c 	movk	w28, #0xffe0, lsl #16
  36a67c:	5283e141 	mov	w1, #0x1f0a                	// #7946
  36a680:	0a1c0000 	and	w0, w0, w28
  36a684:	72a00181 	movk	w1, #0xc, lsl #16
  36a688:	2a010000 	orr	w0, w0, w1
  36a68c:	d50332bf 	dmb	oshst
  36a690:	f944ae61 	ldr	x1, [x19, #2392]
  36a694:	91002021 	add	x1, x1, #0x8
  36a698:	b9000020 	str	w0, [x1]
  36a69c:	52940000 	mov	w0, #0xa000                	// #40960
  36a6a0:	52800182 	mov	w2, #0xc                   	// #12
  36a6a4:	52800001 	mov	w1, #0x0                   	// #0
  36a6a8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a6ac:	97fffbe5 	bl	0x369640
  36a6b0:	528003c1 	mov	w1, #0x1e                  	// #30
  36a6b4:	33001020 	bfxil	w0, w1, #0, #5
  36a6b8:	d50332bf 	dmb	oshst
  36a6bc:	f944ae61 	ldr	x1, [x19, #2392]
  36a6c0:	91003021 	add	x1, x1, #0xc
  36a6c4:	b9000020 	str	w0, [x1]
  36a6c8:	52940000 	mov	w0, #0xa000                	// #40960
  36a6cc:	52800102 	mov	w2, #0x8                   	// #8
  36a6d0:	52800001 	mov	w1, #0x0                   	// #0
  36a6d4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a6d8:	97fffbda 	bl	0x369640
  36a6dc:	52800141 	mov	w1, #0xa                   	// #10
  36a6e0:	33081020 	bfi	w0, w1, #24, #5
  36a6e4:	d50332bf 	dmb	oshst
  36a6e8:	f944ae61 	ldr	x1, [x19, #2392]
  36a6ec:	91002021 	add	x1, x1, #0x8
  36a6f0:	b9000020 	str	w0, [x1]
  36a6f4:	52940000 	mov	w0, #0xa000                	// #40960
  36a6f8:	52800282 	mov	w2, #0x14                  	// #20
  36a6fc:	52800001 	mov	w1, #0x0                   	// #0
  36a700:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a704:	97fffbcf 	bl	0x369640
  36a708:	330006e0 	bfxil	w0, w23, #0, #2
  36a70c:	d50332bf 	dmb	oshst
  36a710:	f944ae61 	ldr	x1, [x19, #2392]
  36a714:	91005021 	add	x1, x1, #0x14
  36a718:	b9000020 	str	w0, [x1]
  36a71c:	52940000 	mov	w0, #0xa000                	// #40960
  36a720:	52800302 	mov	w2, #0x18                  	// #24
  36a724:	52800001 	mov	w1, #0x0                   	// #0
  36a728:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a72c:	97fffbc5 	bl	0x369640
  36a730:	12067400 	and	w0, w0, #0xfcffffff
  36a734:	d50332bf 	dmb	oshst
  36a738:	f944ae61 	ldr	x1, [x19, #2392]
  36a73c:	91006021 	add	x1, x1, #0x18
  36a740:	b9000020 	str	w0, [x1]
  36a744:	52960000 	mov	w0, #0xb000                	// #45056
  36a748:	5296f382 	mov	w2, #0xb79c                	// #47004
  36a74c:	52960001 	mov	w1, #0xb000                	// #45056
  36a750:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a754:	97fffbbb 	bl	0x369640
  36a758:	32100000 	orr	w0, w0, #0x10000
  36a75c:	d50332bf 	dmb	oshst
  36a760:	f9400681 	ldr	x1, [x20, #8]
  36a764:	911e7021 	add	x1, x1, #0x79c
  36a768:	b9000020 	str	w0, [x1]
  36a76c:	52980000 	mov	w0, #0xc000                	// #49152
  36a770:	5296f382 	mov	w2, #0xb79c                	// #47004
  36a774:	52960001 	mov	w1, #0xb000                	// #45056
  36a778:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a77c:	97fffbb1 	bl	0x369640
  36a780:	32100000 	orr	w0, w0, #0x10000
  36a784:	d50332bf 	dmb	oshst
  36a788:	f9400a81 	ldr	x1, [x20, #16]
  36a78c:	911e7021 	add	x1, x1, #0x79c
  36a790:	b9000020 	str	w0, [x1]
  36a794:	52aa001b 	mov	w27, #0x50000000            	// #1342177280
  36a798:	52960000 	mov	w0, #0xb000                	// #45056
  36a79c:	52970002 	mov	w2, #0xb800                	// #47104
  36a7a0:	52960001 	mov	w1, #0xb000                	// #45056
  36a7a4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a7a8:	97fffba6 	bl	0x369640
  36a7ac:	33007b60 	bfxil	w0, w27, #0, #31
  36a7b0:	d50332bf 	dmb	oshst
  36a7b4:	f9400681 	ldr	x1, [x20, #8]
  36a7b8:	91200021 	add	x1, x1, #0x800
  36a7bc:	b9000020 	str	w0, [x1]
  36a7c0:	52980000 	mov	w0, #0xc000                	// #49152
  36a7c4:	52970002 	mov	w2, #0xb800                	// #47104
  36a7c8:	52960001 	mov	w1, #0xb000                	// #45056
  36a7cc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a7d0:	97fffb9c 	bl	0x369640
  36a7d4:	33007b60 	bfxil	w0, w27, #0, #31
  36a7d8:	d50332bf 	dmb	oshst
  36a7dc:	f9400a81 	ldr	x1, [x20, #16]
  36a7e0:	91200021 	add	x1, x1, #0x800
  36a7e4:	b9000020 	str	w0, [x1]
  36a7e8:	52800001 	mov	w1, #0x0                   	// #0
  36a7ec:	52940000 	mov	w0, #0xa000                	// #40960
  36a7f0:	52800282 	mov	w2, #0x14                  	// #20
  36a7f4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a7f8:	97fffb92 	bl	0x369640
  36a7fc:	0a4042a1 	and	w1, w21, w0, lsr #16
  36a800:	2a160021 	orr	w1, w1, w22
  36a804:	33103c20 	bfi	w0, w1, #16, #16
  36a808:	d50332bf 	dmb	oshst
  36a80c:	f944ae61 	ldr	x1, [x19, #2392]
  36a810:	91005021 	add	x1, x1, #0x14
  36a814:	b9000020 	str	w0, [x1]
  36a818:	52940000 	mov	w0, #0xa000                	// #40960
  36a81c:	52800382 	mov	w2, #0x1c                  	// #28
  36a820:	52800001 	mov	w1, #0x0                   	// #0
  36a824:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a828:	97fffb86 	bl	0x369640
  36a82c:	121d7000 	and	w0, w0, #0xfffffff8
  36a830:	12067400 	and	w0, w0, #0xfcffffff
  36a834:	321e0000 	orr	w0, w0, #0x4
  36a838:	d50332bf 	dmb	oshst
  36a83c:	f944ae61 	ldr	x1, [x19, #2392]
  36a840:	91007021 	add	x1, x1, #0x1c
  36a844:	b9000020 	str	w0, [x1]
  36a848:	52940000 	mov	w0, #0xa000                	// #40960
  36a84c:	52800a02 	mov	w2, #0x50                  	// #80
  36a850:	52800001 	mov	w1, #0x0                   	// #0
  36a854:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a858:	97fffb7a 	bl	0x369640
  36a85c:	12077800 	and	w0, w0, #0xfeffffff
  36a860:	d50332bf 	dmb	oshst
  36a864:	f944ae61 	ldr	x1, [x19, #2392]
  36a868:	91014021 	add	x1, x1, #0x50
  36a86c:	b9000020 	str	w0, [x1]
  36a870:	52940000 	mov	w0, #0xa000                	// #40960
  36a874:	52800082 	mov	w2, #0x4                   	// #4
  36a878:	52800001 	mov	w1, #0x0                   	// #0
  36a87c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a880:	97fffb70 	bl	0x369640
  36a884:	1287e7e3 	mov	w3, #0xffffc0c0            	// #-16192
  36a888:	0a404061 	and	w1, w3, w0, lsr #16
  36a88c:	321e0421 	orr	w1, w1, #0xc
  36a890:	33103c20 	bfi	w0, w1, #16, #16
  36a894:	d50332bf 	dmb	oshst
  36a898:	f944ae61 	ldr	x1, [x19, #2392]
  36a89c:	91001021 	add	x1, x1, #0x4
  36a8a0:	b9000020 	str	w0, [x1]
  36a8a4:	52940000 	mov	w0, #0xa000                	// #40960
  36a8a8:	52800282 	mov	w2, #0x14                  	// #20
  36a8ac:	52800001 	mov	w1, #0x0                   	// #0
  36a8b0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a8b4:	97fffb63 	bl	0x369640
  36a8b8:	330006e0 	bfxil	w0, w23, #0, #2
  36a8bc:	d50332bf 	dmb	oshst
  36a8c0:	f944ae61 	ldr	x1, [x19, #2392]
  36a8c4:	91005021 	add	x1, x1, #0x14
  36a8c8:	b9000020 	str	w0, [x1]
  36a8cc:	52940000 	mov	w0, #0xa000                	// #40960
  36a8d0:	52800582 	mov	w2, #0x2c                  	// #44
  36a8d4:	52800001 	mov	w1, #0x0                   	// #0
  36a8d8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a8dc:	97fffb59 	bl	0x369640
  36a8e0:	529f9fe1 	mov	w1, #0xfcff                	// #64767
  36a8e4:	72bf1fc1 	movk	w1, #0xf8fe, lsl #16
  36a8e8:	0a010000 	and	w0, w0, w1
  36a8ec:	52802001 	mov	w1, #0x100                 	// #256
  36a8f0:	72a08021 	movk	w1, #0x401, lsl #16
  36a8f4:	2a010000 	orr	w0, w0, w1
  36a8f8:	d50332bf 	dmb	oshst
  36a8fc:	f944ae61 	ldr	x1, [x19, #2392]
  36a900:	9100b021 	add	x1, x1, #0x2c
  36a904:	b9000020 	str	w0, [x1]
  36a908:	52940000 	mov	w0, #0xa000                	// #40960
  36a90c:	52800082 	mov	w2, #0x4                   	// #4
  36a910:	52800001 	mov	w1, #0x0                   	// #0
  36a914:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a918:	97fffb4a 	bl	0x369640
  36a91c:	12177800 	and	w0, w0, #0xfffffeff
  36a920:	d50332bf 	dmb	oshst
  36a924:	f944ae61 	ldr	x1, [x19, #2392]
  36a928:	91001021 	add	x1, x1, #0x4
  36a92c:	b9000020 	str	w0, [x1]
  36a930:	52940000 	mov	w0, #0xa000                	// #40960
  36a934:	2a1903e2 	mov	w2, w25
  36a938:	52800001 	mov	w1, #0x0                   	// #0
  36a93c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a940:	97fffb40 	bl	0x369640
  36a944:	529f9f81 	mov	w1, #0xfcfc                	// #64764
  36a948:	72bfdf81 	movk	w1, #0xfefc, lsl #16
  36a94c:	0a010000 	and	w0, w0, w1
  36a950:	52806001 	mov	w1, #0x300                 	// #768
  36a954:	72a02001 	movk	w1, #0x100, lsl #16
  36a958:	2a010000 	orr	w0, w0, w1
  36a95c:	d50332bf 	dmb	oshst
  36a960:	f944ae61 	ldr	x1, [x19, #2392]
  36a964:	91004021 	add	x1, x1, #0x10
  36a968:	b9000020 	str	w0, [x1]
  36a96c:	52940000 	mov	w0, #0xa000                	// #40960
  36a970:	52800182 	mov	w2, #0xc                   	// #12
  36a974:	52800001 	mov	w1, #0x0                   	// #0
  36a978:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a97c:	97fffb31 	bl	0x369640
  36a980:	33080ae0 	bfi	w0, w23, #24, #3
  36a984:	d50332bf 	dmb	oshst
  36a988:	f944ae61 	ldr	x1, [x19, #2392]
  36a98c:	91003021 	add	x1, x1, #0xc
  36a990:	b9000020 	str	w0, [x1]
  36a994:	52960001 	mov	w1, #0xb000                	// #45056
  36a998:	52960000 	mov	w0, #0xb000                	// #45056
  36a99c:	52971082 	mov	w2, #0xb884                	// #47236
  36a9a0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a9a4:	97fffb27 	bl	0x369640
  36a9a8:	0a150001 	and	w1, w0, w21
  36a9ac:	32180021 	orr	w1, w1, #0x100
  36a9b0:	33003c20 	bfxil	w0, w1, #0, #16
  36a9b4:	d50332bf 	dmb	oshst
  36a9b8:	f9400681 	ldr	x1, [x20, #8]
  36a9bc:	91221021 	add	x1, x1, #0x884
  36a9c0:	b9000020 	str	w0, [x1]
  36a9c4:	52940000 	mov	w0, #0xa000                	// #40960
  36a9c8:	52800182 	mov	w2, #0xc                   	// #12
  36a9cc:	52800001 	mov	w1, #0x0                   	// #0
  36a9d0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36a9d4:	97fffb1b 	bl	0x369640
  36a9d8:	12800366 	mov	w6, #0xffffffe4            	// #-28
  36a9dc:	33101cc0 	bfi	w0, w6, #16, #8
  36a9e0:	d50332bf 	dmb	oshst
  36a9e4:	f944ae61 	ldr	x1, [x19, #2392]
  36a9e8:	91003021 	add	x1, x1, #0xc
  36a9ec:	b9000020 	str	w0, [x1]
  36a9f0:	52940000 	mov	w0, #0xa000                	// #40960
  36a9f4:	52800482 	mov	w2, #0x24                  	// #36
  36a9f8:	52800001 	mov	w1, #0x0                   	// #0
  36a9fc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aa00:	97fffb10 	bl	0x369640
  36aa04:	32180000 	orr	w0, w0, #0x100
  36aa08:	d50332bf 	dmb	oshst
  36aa0c:	f944ae61 	ldr	x1, [x19, #2392]
  36aa10:	91009021 	add	x1, x1, #0x24
  36aa14:	b9000020 	str	w0, [x1]
  36aa18:	52940000 	mov	w0, #0xa000                	// #40960
  36aa1c:	52800502 	mov	w2, #0x28                  	// #40
  36aa20:	52800001 	mov	w1, #0x0                   	// #0
  36aa24:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aa28:	97fffb06 	bl	0x369640
  36aa2c:	32100000 	orr	w0, w0, #0x10000
  36aa30:	d50332bf 	dmb	oshst
  36aa34:	f944ae61 	ldr	x1, [x19, #2392]
  36aa38:	9100a021 	add	x1, x1, #0x28
  36aa3c:	b9000020 	str	w0, [x1]
  36aa40:	52940000 	mov	w0, #0xa000                	// #40960
  36aa44:	52800a02 	mov	w2, #0x50                  	// #80
  36aa48:	52800001 	mov	w1, #0x0                   	// #0
  36aa4c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aa50:	97fffafc 	bl	0x369640
  36aa54:	528001e7 	mov	w7, #0xf                   	// #15
  36aa58:	330010e0 	bfxil	w0, w7, #0, #5
  36aa5c:	d50332bf 	dmb	oshst
  36aa60:	f944ae61 	ldr	x1, [x19, #2392]
  36aa64:	91014021 	add	x1, x1, #0x50
  36aa68:	b9000020 	str	w0, [x1]
  36aa6c:	52940000 	mov	w0, #0xa000                	// #40960
  36aa70:	52800482 	mov	w2, #0x24                  	// #36
  36aa74:	52800001 	mov	w1, #0x0                   	// #0
  36aa78:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aa7c:	97fffaf1 	bl	0x369640
  36aa80:	1283e0e1 	mov	w1, #0xffffe0f8            	// #-7944
  36aa84:	5280a022 	mov	w2, #0x501                 	// #1281
  36aa88:	0a404021 	and	w1, w1, w0, lsr #16
  36aa8c:	2a020021 	orr	w1, w1, w2
  36aa90:	33103c20 	bfi	w0, w1, #16, #16
  36aa94:	d50332bf 	dmb	oshst
  36aa98:	f944ae61 	ldr	x1, [x19, #2392]
  36aa9c:	91009021 	add	x1, x1, #0x24
  36aaa0:	b9000020 	str	w0, [x1]
  36aaa4:	52940000 	mov	w0, #0xa000                	// #40960
  36aaa8:	52800502 	mov	w2, #0x28                  	// #40
  36aaac:	52800001 	mov	w1, #0x0                   	// #0
  36aab0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aab4:	97fffae3 	bl	0x369640
  36aab8:	33080ae0 	bfi	w0, w23, #24, #3
  36aabc:	d50332bf 	dmb	oshst
  36aac0:	f944ae61 	ldr	x1, [x19, #2392]
  36aac4:	9100a021 	add	x1, x1, #0x28
  36aac8:	b9000020 	str	w0, [x1]
  36aacc:	52800079 	mov	w25, #0x3                   	// #3
  36aad0:	52940000 	mov	w0, #0xa000                	// #40960
  36aad4:	52800602 	mov	w2, #0x30                  	// #48
  36aad8:	52800001 	mov	w1, #0x0                   	// #0
  36aadc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aae0:	97fffad8 	bl	0x369640
  36aae4:	33000b20 	bfxil	w0, w25, #0, #3
  36aae8:	d50332bf 	dmb	oshst
  36aaec:	f944ae61 	ldr	x1, [x19, #2392]
  36aaf0:	9100c021 	add	x1, x1, #0x30
  36aaf4:	b9000020 	str	w0, [x1]
  36aaf8:	52960001 	mov	w1, #0xb000                	// #45056
  36aafc:	52960000 	mov	w0, #0xb000                	// #45056
  36ab00:	52970502 	mov	w2, #0xb828                	// #47144
  36ab04:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ab08:	97ffface 	bl	0x369640
  36ab0c:	0a150001 	and	w1, w0, w21
  36ab10:	2a160021 	orr	w1, w1, w22
  36ab14:	33003c20 	bfxil	w0, w1, #0, #16
  36ab18:	d50332bf 	dmb	oshst
  36ab1c:	f9400681 	ldr	x1, [x20, #8]
  36ab20:	9120a021 	add	x1, x1, #0x828
  36ab24:	b9000020 	str	w0, [x1]
  36ab28:	52960001 	mov	w1, #0xb000                	// #45056
  36ab2c:	52980000 	mov	w0, #0xc000                	// #49152
  36ab30:	52970502 	mov	w2, #0xb828                	// #47144
  36ab34:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ab38:	97fffac2 	bl	0x369640
  36ab3c:	0a150001 	and	w1, w0, w21
  36ab40:	2a160021 	orr	w1, w1, w22
  36ab44:	33003c20 	bfxil	w0, w1, #0, #16
  36ab48:	d50332bf 	dmb	oshst
  36ab4c:	f9400a81 	ldr	x1, [x20, #16]
  36ab50:	9120a021 	add	x1, x1, #0x828
  36ab54:	b9000020 	str	w0, [x1]
  36ab58:	52960001 	mov	w1, #0xb000                	// #45056
  36ab5c:	52960000 	mov	w0, #0xb000                	// #45056
  36ab60:	52970502 	mov	w2, #0xb828                	// #47144
  36ab64:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ab68:	97fffab6 	bl	0x369640
  36ab6c:	0a4042a1 	and	w1, w21, w0, lsr #16
  36ab70:	2a160021 	orr	w1, w1, w22
  36ab74:	33103c20 	bfi	w0, w1, #16, #16
  36ab78:	d50332bf 	dmb	oshst
  36ab7c:	f9400681 	ldr	x1, [x20, #8]
  36ab80:	9120a021 	add	x1, x1, #0x828
  36ab84:	b9000020 	str	w0, [x1]
  36ab88:	52960001 	mov	w1, #0xb000                	// #45056
  36ab8c:	52980000 	mov	w0, #0xc000                	// #49152
  36ab90:	52970502 	mov	w2, #0xb828                	// #47144
  36ab94:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ab98:	97fffaaa 	bl	0x369640
  36ab9c:	0a4042a1 	and	w1, w21, w0, lsr #16
  36aba0:	2a160021 	orr	w1, w1, w22
  36aba4:	33103c20 	bfi	w0, w1, #16, #16
  36aba8:	d50332bf 	dmb	oshst
  36abac:	f9400a81 	ldr	x1, [x20, #16]
  36abb0:	9120a021 	add	x1, x1, #0x828
  36abb4:	b9000020 	str	w0, [x1]
  36abb8:	d2836f00 	mov	x0, #0x1b78                	// #7032
  36abbc:	f2a001a0 	movk	x0, #0xd, lsl #16
  36abc0:	940dd700 	bl	0x6e07c0
  36abc4:	52960001 	mov	w1, #0xb000                	// #45056
  36abc8:	52960000 	mov	w0, #0xb000                	// #45056
  36abcc:	52970a82 	mov	w2, #0xb854                	// #47188
  36abd0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36abd4:	97fffa9b 	bl	0x369640
  36abd8:	0a4042a1 	and	w1, w21, w0, lsr #16
  36abdc:	32180021 	orr	w1, w1, #0x100
  36abe0:	33103c20 	bfi	w0, w1, #16, #16
  36abe4:	d50332bf 	dmb	oshst
  36abe8:	f9400681 	ldr	x1, [x20, #8]
  36abec:	91215021 	add	x1, x1, #0x854
  36abf0:	b9000020 	str	w0, [x1]
  36abf4:	52960001 	mov	w1, #0xb000                	// #45056
  36abf8:	52980000 	mov	w0, #0xc000                	// #49152
  36abfc:	52970a82 	mov	w2, #0xb854                	// #47188
  36ac00:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ac04:	97fffa8f 	bl	0x369640
  36ac08:	0a4042a1 	and	w1, w21, w0, lsr #16
  36ac0c:	32180021 	orr	w1, w1, #0x100
  36ac10:	33103c20 	bfi	w0, w1, #16, #16
  36ac14:	d50332bf 	dmb	oshst
  36ac18:	f9400a81 	ldr	x1, [x20, #16]
  36ac1c:	91215021 	add	x1, x1, #0x854
  36ac20:	b9000020 	str	w0, [x1]
  36ac24:	52940000 	mov	w0, #0xa000                	// #40960
  36ac28:	52800d82 	mov	w2, #0x6c                  	// #108
  36ac2c:	52800001 	mov	w1, #0x0                   	// #0
  36ac30:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ac34:	97fffa83 	bl	0x369640
  36ac38:	32100000 	orr	w0, w0, #0x10000
  36ac3c:	d50332bf 	dmb	oshst
  36ac40:	f944ae61 	ldr	x1, [x19, #2392]
  36ac44:	9101b021 	add	x1, x1, #0x6c
  36ac48:	b9000020 	str	w0, [x1]
  36ac4c:	52940000 	mov	w0, #0xa000                	// #40960
  36ac50:	52801102 	mov	w2, #0x88                  	// #136
  36ac54:	52800001 	mov	w1, #0x0                   	// #0
  36ac58:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ac5c:	97fffa79 	bl	0x369640
  36ac60:	d50332bf 	dmb	oshst
  36ac64:	f944ae60 	ldr	x0, [x19, #2392]
  36ac68:	91022000 	add	x0, x0, #0x88
  36ac6c:	b900001f 	str	wzr, [x0]
  36ac70:	52940000 	mov	w0, #0xa000                	// #40960
  36ac74:	52801182 	mov	w2, #0x8c                  	// #140
  36ac78:	52800001 	mov	w1, #0x0                   	// #0
  36ac7c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ac80:	97fffa70 	bl	0x369640
  36ac84:	12103c00 	and	w0, w0, #0xffff0000
  36ac88:	d50332bf 	dmb	oshst
  36ac8c:	f944ae61 	ldr	x1, [x19, #2392]
  36ac90:	91023021 	add	x1, x1, #0x8c
  36ac94:	b9000020 	str	w0, [x1]
  36ac98:	52940000 	mov	w0, #0xa000                	// #40960
  36ac9c:	52800b02 	mov	w2, #0x58                  	// #88
  36aca0:	52800001 	mov	w1, #0x0                   	// #0
  36aca4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aca8:	97fffa66 	bl	0x369640
  36acac:	330016e0 	bfxil	w0, w23, #0, #6
  36acb0:	d50332bf 	dmb	oshst
  36acb4:	f944ae61 	ldr	x1, [x19, #2392]
  36acb8:	91016021 	add	x1, x1, #0x58
  36acbc:	b9000020 	str	w0, [x1]
  36acc0:	52940000 	mov	w0, #0xa000                	// #40960
  36acc4:	52800a82 	mov	w2, #0x54                  	// #84
  36acc8:	52800001 	mov	w1, #0x0                   	// #0
  36accc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36acd0:	97fffa5c 	bl	0x369640
  36acd4:	528005a8 	mov	w8, #0x2d                  	// #45
  36acd8:	33081500 	bfi	w0, w8, #24, #6
  36acdc:	d50332bf 	dmb	oshst
  36ace0:	f944ae61 	ldr	x1, [x19, #2392]
  36ace4:	91015021 	add	x1, x1, #0x54
  36ace8:	b9000020 	str	w0, [x1]
  36acec:	52940000 	mov	w0, #0xa000                	// #40960
  36acf0:	52800d82 	mov	w2, #0x6c                  	// #108
  36acf4:	52800001 	mov	w1, #0x0                   	// #0
  36acf8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36acfc:	97fffa51 	bl	0x369640
  36ad00:	121e7400 	and	w0, w0, #0xfffffffc
  36ad04:	d50332bf 	dmb	oshst
  36ad08:	f944ae61 	ldr	x1, [x19, #2392]
  36ad0c:	9101b021 	add	x1, x1, #0x6c
  36ad10:	b9000020 	str	w0, [x1]
  36ad14:	52940000 	mov	w0, #0xa000                	// #40960
  36ad18:	52800f82 	mov	w2, #0x7c                  	// #124
  36ad1c:	52800001 	mov	w1, #0x0                   	// #0
  36ad20:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ad24:	97fffa47 	bl	0x369640
  36ad28:	32100400 	orr	w0, w0, #0x30000
  36ad2c:	d50332bf 	dmb	oshst
  36ad30:	f944ae61 	ldr	x1, [x19, #2392]
  36ad34:	9101f021 	add	x1, x1, #0x7c
  36ad38:	b9000020 	str	w0, [x1]
  36ad3c:	52960000 	mov	w0, #0xb000                	// #45056
  36ad40:	5296f282 	mov	w2, #0xb794                	// #46996
  36ad44:	52960001 	mov	w1, #0xb000                	// #45056
  36ad48:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ad4c:	97fffa3d 	bl	0x369640
  36ad50:	32080000 	orr	w0, w0, #0x1000000
  36ad54:	d50332bf 	dmb	oshst
  36ad58:	f9400681 	ldr	x1, [x20, #8]
  36ad5c:	911e5021 	add	x1, x1, #0x794
  36ad60:	b9000020 	str	w0, [x1]
  36ad64:	52980000 	mov	w0, #0xc000                	// #49152
  36ad68:	5296f282 	mov	w2, #0xb794                	// #46996
  36ad6c:	52960001 	mov	w1, #0xb000                	// #45056
  36ad70:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ad74:	97fffa33 	bl	0x369640
  36ad78:	32080000 	orr	w0, w0, #0x1000000
  36ad7c:	d50332bf 	dmb	oshst
  36ad80:	f9400a81 	ldr	x1, [x20, #16]
  36ad84:	911e5021 	add	x1, x1, #0x794
  36ad88:	b9000020 	str	w0, [x1]
  36ad8c:	52a1901b 	mov	w27, #0xc800000             	// #209715200
  36ad90:	52960000 	mov	w0, #0xb000                	// #45056
  36ad94:	5296f302 	mov	w2, #0xb798                	// #47000
  36ad98:	52960001 	mov	w1, #0xb000                	// #45056
  36ad9c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ada0:	97fffa28 	bl	0x369640
  36ada4:	33007b60 	bfxil	w0, w27, #0, #31
  36ada8:	d50332bf 	dmb	oshst
  36adac:	f9400681 	ldr	x1, [x20, #8]
  36adb0:	911e6021 	add	x1, x1, #0x798
  36adb4:	b9000020 	str	w0, [x1]
  36adb8:	52980000 	mov	w0, #0xc000                	// #49152
  36adbc:	5296f302 	mov	w2, #0xb798                	// #47000
  36adc0:	52960001 	mov	w1, #0xb000                	// #45056
  36adc4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36adc8:	97fffa1e 	bl	0x369640
  36adcc:	33007b60 	bfxil	w0, w27, #0, #31
  36add0:	d50332bf 	dmb	oshst
  36add4:	f9400a81 	ldr	x1, [x20, #16]
  36add8:	911e6021 	add	x1, x1, #0x798
  36addc:	b9000020 	str	w0, [x1]
  36ade0:	52940000 	mov	w0, #0xa000                	// #40960
  36ade4:	52800e02 	mov	w2, #0x70                  	// #112
  36ade8:	52800001 	mov	w1, #0x0                   	// #0
  36adec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36adf0:	97fffa14 	bl	0x369640
  36adf4:	12177800 	and	w0, w0, #0xfffffeff
  36adf8:	d50332bf 	dmb	oshst
  36adfc:	f944ae61 	ldr	x1, [x19, #2392]
  36ae00:	9101c021 	add	x1, x1, #0x70
  36ae04:	b9000020 	str	w0, [x1]
  36ae08:	52940000 	mov	w0, #0xa000                	// #40960
  36ae0c:	52801082 	mov	w2, #0x84                  	// #132
  36ae10:	52800001 	mov	w1, #0x0                   	// #0
  36ae14:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ae18:	97fffa0a 	bl	0x369640
  36ae1c:	12177800 	and	w0, w0, #0xfffffeff
  36ae20:	d50332bf 	dmb	oshst
  36ae24:	f944ae61 	ldr	x1, [x19, #2392]
  36ae28:	91021021 	add	x1, x1, #0x84
  36ae2c:	b9000020 	str	w0, [x1]
  36ae30:	5280009b 	mov	w27, #0x4                   	// #4
  36ae34:	52940000 	mov	w0, #0xa000                	// #40960
  36ae38:	52800d82 	mov	w2, #0x6c                  	// #108
  36ae3c:	52800001 	mov	w1, #0x0                   	// #0
  36ae40:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ae44:	97fff9ff 	bl	0x369640
  36ae48:	33180b60 	bfi	w0, w27, #8, #3
  36ae4c:	d50332bf 	dmb	oshst
  36ae50:	f944ae61 	ldr	x1, [x19, #2392]
  36ae54:	9101b021 	add	x1, x1, #0x6c
  36ae58:	b9000020 	str	w0, [x1]
  36ae5c:	52940000 	mov	w0, #0xa000                	// #40960
  36ae60:	52800e02 	mov	w2, #0x70                  	// #112
  36ae64:	52800001 	mov	w1, #0x0                   	// #0
  36ae68:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ae6c:	97fff9f5 	bl	0x369640
  36ae70:	121e7400 	and	w0, w0, #0xfffffffc
  36ae74:	12067400 	and	w0, w0, #0xfcffffff
  36ae78:	32080400 	orr	w0, w0, #0x3000000
  36ae7c:	d50332bf 	dmb	oshst
  36ae80:	f944ae61 	ldr	x1, [x19, #2392]
  36ae84:	9101c021 	add	x1, x1, #0x70
  36ae88:	b9000020 	str	w0, [x1]
  36ae8c:	52940000 	mov	w0, #0xa000                	// #40960
  36ae90:	52801382 	mov	w2, #0x9c                  	// #156
  36ae94:	52800001 	mov	w1, #0x0                   	// #0
  36ae98:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ae9c:	97fff9e9 	bl	0x369640
  36aea0:	12077800 	and	w0, w0, #0xfeffffff
  36aea4:	d50332bf 	dmb	oshst
  36aea8:	f944ae61 	ldr	x1, [x19, #2392]
  36aeac:	91027021 	add	x1, x1, #0x9c
  36aeb0:	b9000020 	str	w0, [x1]
  36aeb4:	52940000 	mov	w0, #0xa000                	// #40960
  36aeb8:	52801102 	mov	w2, #0x88                  	// #136
  36aebc:	52800001 	mov	w1, #0x0                   	// #0
  36aec0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aec4:	97fff9df 	bl	0x369640
  36aec8:	d50332bf 	dmb	oshst
  36aecc:	f944ae60 	ldr	x0, [x19, #2392]
  36aed0:	91022000 	add	x0, x0, #0x88
  36aed4:	b900001f 	str	wzr, [x0]
  36aed8:	52940000 	mov	w0, #0xa000                	// #40960
  36aedc:	52800b02 	mov	w2, #0x58                  	// #88
  36aee0:	52800001 	mov	w1, #0x0                   	// #0
  36aee4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aee8:	97fff9d6 	bl	0x369640
  36aeec:	529c1801 	mov	w1, #0xe0c0                	// #57536
  36aef0:	72bc1c01 	movk	w1, #0xe0e0, lsl #16
  36aef4:	0a010000 	and	w0, w0, w1
  36aef8:	5280a021 	mov	w1, #0x501                 	// #1281
  36aefc:	72a02301 	movk	w1, #0x118, lsl #16
  36af00:	2a010000 	orr	w0, w0, w1
  36af04:	d50332bf 	dmb	oshst
  36af08:	f944ae61 	ldr	x1, [x19, #2392]
  36af0c:	91016021 	add	x1, x1, #0x58
  36af10:	b9000020 	str	w0, [x1]
  36af14:	52940000 	mov	w0, #0xa000                	// #40960
  36af18:	52800a82 	mov	w2, #0x54                  	// #84
  36af1c:	52800001 	mov	w1, #0x0                   	// #0
  36af20:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36af24:	97fff9c7 	bl	0x369640
  36af28:	528005a8 	mov	w8, #0x2d                  	// #45
  36af2c:	33081500 	bfi	w0, w8, #24, #6
  36af30:	d50332bf 	dmb	oshst
  36af34:	f944ae61 	ldr	x1, [x19, #2392]
  36af38:	91015021 	add	x1, x1, #0x54
  36af3c:	b9000020 	str	w0, [x1]
  36af40:	52940000 	mov	w0, #0xa000                	// #40960
  36af44:	52801302 	mov	w2, #0x98                  	// #152
  36af48:	52800001 	mov	w1, #0x0                   	// #0
  36af4c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36af50:	97fff9bc 	bl	0x369640
  36af54:	33081ee0 	bfi	w0, w23, #24, #8
  36af58:	d50332bf 	dmb	oshst
  36af5c:	f944ae61 	ldr	x1, [x19, #2392]
  36af60:	91026021 	add	x1, x1, #0x98
  36af64:	b9000020 	str	w0, [x1]
  36af68:	52940000 	mov	w0, #0xa000                	// #40960
  36af6c:	52800b82 	mov	w2, #0x5c                  	// #92
  36af70:	52800001 	mov	w1, #0x0                   	// #0
  36af74:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36af78:	97fff9b2 	bl	0x369640
  36af7c:	12136800 	and	w0, w0, #0xffffe0ff
  36af80:	d50332bf 	dmb	oshst
  36af84:	f944ae61 	ldr	x1, [x19, #2392]
  36af88:	91017021 	add	x1, x1, #0x5c
  36af8c:	b9000020 	str	w0, [x1]
  36af90:	52940000 	mov	w0, #0xa000                	// #40960
  36af94:	52800c82 	mov	w2, #0x64                  	// #100
  36af98:	52800001 	mov	w1, #0x0                   	// #0
  36af9c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36afa0:	97fff9a8 	bl	0x369640
  36afa4:	12167400 	and	w0, w0, #0xfffffcff
  36afa8:	d50332bf 	dmb	oshst
  36afac:	f944ae61 	ldr	x1, [x19, #2392]
  36afb0:	91019021 	add	x1, x1, #0x64
  36afb4:	b9000020 	str	w0, [x1]
  36afb8:	52940000 	mov	w0, #0xa000                	// #40960
  36afbc:	52800d82 	mov	w2, #0x6c                  	// #108
  36afc0:	52800001 	mov	w1, #0x0                   	// #0
  36afc4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36afc8:	97fff99e 	bl	0x369640
  36afcc:	121e7400 	and	w0, w0, #0xfffffffc
  36afd0:	d50332bf 	dmb	oshst
  36afd4:	f944ae61 	ldr	x1, [x19, #2392]
  36afd8:	9101b021 	add	x1, x1, #0x6c
  36afdc:	b9000020 	str	w0, [x1]
  36afe0:	52940000 	mov	w0, #0xa000                	// #40960
  36afe4:	52800f82 	mov	w2, #0x7c                  	// #124
  36afe8:	52800001 	mov	w1, #0x0                   	// #0
  36afec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36aff0:	97fff994 	bl	0x369640
  36aff4:	32080000 	orr	w0, w0, #0x1000000
  36aff8:	d50332bf 	dmb	oshst
  36affc:	f944ae61 	ldr	x1, [x19, #2392]
  36b000:	9101f021 	add	x1, x1, #0x7c
  36b004:	b9000020 	str	w0, [x1]
  36b008:	52940000 	mov	w0, #0xa000                	// #40960
  36b00c:	52801002 	mov	w2, #0x80                  	// #128
  36b010:	52800001 	mov	w1, #0x0                   	// #0
  36b014:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b018:	97fff98a 	bl	0x369640
  36b01c:	32000800 	orr	w0, w0, #0x7
  36b020:	d50332bf 	dmb	oshst
  36b024:	f944ae61 	ldr	x1, [x19, #2392]
  36b028:	91020021 	add	x1, x1, #0x80
  36b02c:	b9000020 	str	w0, [x1]
  36b030:	52940000 	mov	w0, #0xa000                	// #40960
  36b034:	52800f82 	mov	w2, #0x7c                  	// #124
  36b038:	52800001 	mov	w1, #0x0                   	// #0
  36b03c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b040:	97fff980 	bl	0x369640
  36b044:	32100400 	orr	w0, w0, #0x30000
  36b048:	d50332bf 	dmb	oshst
  36b04c:	f944ae61 	ldr	x1, [x19, #2392]
  36b050:	9101f021 	add	x1, x1, #0x7c
  36b054:	b9000020 	str	w0, [x1]
  36b058:	52960000 	mov	w0, #0xb000                	// #45056
  36b05c:	5296f282 	mov	w2, #0xb794                	// #46996
  36b060:	52960001 	mov	w1, #0xb000                	// #45056
  36b064:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b068:	97fff976 	bl	0x369640
  36b06c:	32080000 	orr	w0, w0, #0x1000000
  36b070:	d50332bf 	dmb	oshst
  36b074:	f9400681 	ldr	x1, [x20, #8]
  36b078:	911e5021 	add	x1, x1, #0x794
  36b07c:	b9000020 	str	w0, [x1]
  36b080:	52980000 	mov	w0, #0xc000                	// #49152
  36b084:	5296f282 	mov	w2, #0xb794                	// #46996
  36b088:	52960001 	mov	w1, #0xb000                	// #45056
  36b08c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b090:	97fff96c 	bl	0x369640
  36b094:	32080000 	orr	w0, w0, #0x1000000
  36b098:	d50332bf 	dmb	oshst
  36b09c:	f9400a81 	ldr	x1, [x20, #16]
  36b0a0:	911e5021 	add	x1, x1, #0x794
  36b0a4:	b9000020 	str	w0, [x1]
  36b0a8:	52940000 	mov	w0, #0xa000                	// #40960
  36b0ac:	52801082 	mov	w2, #0x84                  	// #132
  36b0b0:	52800001 	mov	w1, #0x0                   	// #0
  36b0b4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b0b8:	97fff962 	bl	0x369640
  36b0bc:	12177800 	and	w0, w0, #0xfffffeff
  36b0c0:	d50332bf 	dmb	oshst
  36b0c4:	f944ae61 	ldr	x1, [x19, #2392]
  36b0c8:	91021021 	add	x1, x1, #0x84
  36b0cc:	b9000020 	str	w0, [x1]
  36b0d0:	52940000 	mov	w0, #0xa000                	// #40960
  36b0d4:	52800b82 	mov	w2, #0x5c                  	// #92
  36b0d8:	52800001 	mov	w1, #0x0                   	// #0
  36b0dc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b0e0:	97fff958 	bl	0x369640
  36b0e4:	121b6800 	and	w0, w0, #0xffffffe0
  36b0e8:	d50332bf 	dmb	oshst
  36b0ec:	f944ae61 	ldr	x1, [x19, #2392]
  36b0f0:	91017021 	add	x1, x1, #0x5c
  36b0f4:	b9000020 	str	w0, [x1]
  36b0f8:	52940000 	mov	w0, #0xa000                	// #40960
  36b0fc:	52800d02 	mov	w2, #0x68                  	// #104
  36b100:	52800001 	mov	w1, #0x0                   	// #0
  36b104:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b108:	97fff94e 	bl	0x369640
  36b10c:	32080000 	orr	w0, w0, #0x1000000
  36b110:	d50332bf 	dmb	oshst
  36b114:	f944ae61 	ldr	x1, [x19, #2392]
  36b118:	9101a021 	add	x1, x1, #0x68
  36b11c:	b9000020 	str	w0, [x1]
  36b120:	52940000 	mov	w0, #0xa000                	// #40960
  36b124:	52801382 	mov	w2, #0x9c                  	// #156
  36b128:	52800001 	mov	w1, #0x0                   	// #0
  36b12c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b130:	97fff944 	bl	0x369640
  36b134:	12077800 	and	w0, w0, #0xfeffffff
  36b138:	d50332bf 	dmb	oshst
  36b13c:	f944ae61 	ldr	x1, [x19, #2392]
  36b140:	91027021 	add	x1, x1, #0x9c
  36b144:	b9000020 	str	w0, [x1]
  36b148:	52940000 	mov	w0, #0xa000                	// #40960
  36b14c:	52801202 	mov	w2, #0x90                  	// #144
  36b150:	52800001 	mov	w1, #0x0                   	// #0
  36b154:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b158:	97fff93a 	bl	0x369640
  36b15c:	121f7800 	and	w0, w0, #0xfffffffe
  36b160:	d50332bf 	dmb	oshst
  36b164:	f944ae61 	ldr	x1, [x19, #2392]
  36b168:	91024021 	add	x1, x1, #0x90
  36b16c:	b9000020 	str	w0, [x1]
  36b170:	52940000 	mov	w0, #0xa000                	// #40960
  36b174:	52800c82 	mov	w2, #0x64                  	// #100
  36b178:	52800001 	mov	w1, #0x0                   	// #0
  36b17c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b180:	97fff930 	bl	0x369640
  36b184:	12077800 	and	w0, w0, #0xfeffffff
  36b188:	d50332bf 	dmb	oshst
  36b18c:	f944ae61 	ldr	x1, [x19, #2392]
  36b190:	91019021 	add	x1, x1, #0x64
  36b194:	b9000020 	str	w0, [x1]
  36b198:	52940000 	mov	w0, #0xa000                	// #40960
  36b19c:	52800d02 	mov	w2, #0x68                  	// #104
  36b1a0:	52800001 	mov	w1, #0x0                   	// #0
  36b1a4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b1a8:	97fff926 	bl	0x369640
  36b1ac:	32080000 	orr	w0, w0, #0x1000000
  36b1b0:	d50332bf 	dmb	oshst
  36b1b4:	f944ae61 	ldr	x1, [x19, #2392]
  36b1b8:	9101a021 	add	x1, x1, #0x68
  36b1bc:	b9000020 	str	w0, [x1]
  36b1c0:	52940000 	mov	w0, #0xa000                	// #40960
  36b1c4:	52801082 	mov	w2, #0x84                  	// #132
  36b1c8:	52800001 	mov	w1, #0x0                   	// #0
  36b1cc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b1d0:	97fff91c 	bl	0x369640
  36b1d4:	121f7800 	and	w0, w0, #0xfffffffe
  36b1d8:	d50332bf 	dmb	oshst
  36b1dc:	f944ae61 	ldr	x1, [x19, #2392]
  36b1e0:	91021021 	add	x1, x1, #0x84
  36b1e4:	b9000020 	str	w0, [x1]
  36b1e8:	52940000 	mov	w0, #0xa000                	// #40960
  36b1ec:	52800a82 	mov	w2, #0x54                  	// #84
  36b1f0:	52800001 	mov	w1, #0x0                   	// #0
  36b1f4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b1f8:	97fff912 	bl	0x369640
  36b1fc:	120f7800 	and	w0, w0, #0xfffeffff
  36b200:	d50332bf 	dmb	oshst
  36b204:	f944ae61 	ldr	x1, [x19, #2392]
  36b208:	91015021 	add	x1, x1, #0x54
  36b20c:	b9000020 	str	w0, [x1]
  36b210:	52940000 	mov	w0, #0xa000                	// #40960
  36b214:	52800c82 	mov	w2, #0x64                  	// #100
  36b218:	52800001 	mov	w1, #0x0                   	// #0
  36b21c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b220:	97fff908 	bl	0x369640
  36b224:	121f7800 	and	w0, w0, #0xfffffffe
  36b228:	d50332bf 	dmb	oshst
  36b22c:	f944ae61 	ldr	x1, [x19, #2392]
  36b230:	91019021 	add	x1, x1, #0x64
  36b234:	b9000020 	str	w0, [x1]
  36b238:	52940000 	mov	w0, #0xa000                	// #40960
  36b23c:	52800c02 	mov	w2, #0x60                  	// #96
  36b240:	52800001 	mov	w1, #0x0                   	// #0
  36b244:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b248:	97fff8fe 	bl	0x369640
  36b24c:	529f9f01 	mov	w1, #0xfcf8                	// #64760
  36b250:	72bf9f81 	movk	w1, #0xfcfc, lsl #16
  36b254:	0a010000 	and	w0, w0, w1
  36b258:	52800081 	mov	w1, #0x4                   	// #4
  36b25c:	72a02061 	movk	w1, #0x103, lsl #16
  36b260:	2a010000 	orr	w0, w0, w1
  36b264:	d50332bf 	dmb	oshst
  36b268:	f944ae61 	ldr	x1, [x19, #2392]
  36b26c:	91018021 	add	x1, x1, #0x60
  36b270:	b9000020 	str	w0, [x1]
  36b274:	52940000 	mov	w0, #0xa000                	// #40960
  36b278:	52800b82 	mov	w2, #0x5c                  	// #92
  36b27c:	52800001 	mov	w1, #0x0                   	// #0
  36b280:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b284:	97fff8ef 	bl	0x369640
  36b288:	12800366 	mov	w6, #0xffffffe4            	// #-28
  36b28c:	33081cc0 	bfi	w0, w6, #24, #8
  36b290:	d50332bf 	dmb	oshst
  36b294:	f944ae61 	ldr	x1, [x19, #2392]
  36b298:	91017021 	add	x1, x1, #0x5c
  36b29c:	b9000020 	str	w0, [x1]
  36b2a0:	52940000 	mov	w0, #0xa000                	// #40960
  36b2a4:	52800e82 	mov	w2, #0x74                  	// #116
  36b2a8:	52800001 	mov	w1, #0x0                   	// #0
  36b2ac:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b2b0:	97fff8e4 	bl	0x369640
  36b2b4:	32100000 	orr	w0, w0, #0x10000
  36b2b8:	d50332bf 	dmb	oshst
  36b2bc:	f944ae61 	ldr	x1, [x19, #2392]
  36b2c0:	9101d021 	add	x1, x1, #0x74
  36b2c4:	b9000020 	str	w0, [x1]
  36b2c8:	52940000 	mov	w0, #0xa000                	// #40960
  36b2cc:	52800f02 	mov	w2, #0x78                  	// #120
  36b2d0:	52800001 	mov	w1, #0x0                   	// #0
  36b2d4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b2d8:	97fff8da 	bl	0x369640
  36b2dc:	32080000 	orr	w0, w0, #0x1000000
  36b2e0:	d50332bf 	dmb	oshst
  36b2e4:	f944ae61 	ldr	x1, [x19, #2392]
  36b2e8:	9101e021 	add	x1, x1, #0x78
  36b2ec:	b9000020 	str	w0, [x1]
  36b2f0:	52940000 	mov	w0, #0xa000                	// #40960
  36b2f4:	52801382 	mov	w2, #0x9c                  	// #156
  36b2f8:	52800001 	mov	w1, #0x0                   	// #0
  36b2fc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b300:	97fff8d0 	bl	0x369640
  36b304:	528001e7 	mov	w7, #0xf                   	// #15
  36b308:	330010e0 	bfxil	w0, w7, #0, #5
  36b30c:	d50332bf 	dmb	oshst
  36b310:	f944ae61 	ldr	x1, [x19, #2392]
  36b314:	91027021 	add	x1, x1, #0x9c
  36b318:	b9000020 	str	w0, [x1]
  36b31c:	52940000 	mov	w0, #0xa000                	// #40960
  36b320:	52800e82 	mov	w2, #0x74                  	// #116
  36b324:	52800001 	mov	w1, #0x0                   	// #0
  36b328:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b32c:	97fff8c5 	bl	0x369640
  36b330:	33080b20 	bfi	w0, w25, #24, #3
  36b334:	d50332bf 	dmb	oshst
  36b338:	f944ae61 	ldr	x1, [x19, #2392]
  36b33c:	9101d021 	add	x1, x1, #0x74
  36b340:	b9000020 	str	w0, [x1]
  36b344:	52940000 	mov	w0, #0xa000                	// #40960
  36b348:	52800f02 	mov	w2, #0x78                  	// #120
  36b34c:	52800001 	mov	w1, #0x0                   	// #0
  36b350:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b354:	97fff8bb 	bl	0x369640
  36b358:	52800161 	mov	w1, #0xb                   	// #11
  36b35c:	33001020 	bfxil	w0, w1, #0, #5
  36b360:	d50332bf 	dmb	oshst
  36b364:	f944ae61 	ldr	x1, [x19, #2392]
  36b368:	9101e021 	add	x1, x1, #0x78
  36b36c:	b9000020 	str	w0, [x1]
  36b370:	52940000 	mov	w0, #0xa000                	// #40960
  36b374:	52800f82 	mov	w2, #0x7c                  	// #124
  36b378:	52800001 	mov	w1, #0x0                   	// #0
  36b37c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b380:	97fff8b0 	bl	0x369640
  36b384:	33000b20 	bfxil	w0, w25, #0, #3
  36b388:	d50332bf 	dmb	oshst
  36b38c:	f944ae61 	ldr	x1, [x19, #2392]
  36b390:	9101f021 	add	x1, x1, #0x7c
  36b394:	b9000020 	str	w0, [x1]
  36b398:	52960001 	mov	w1, #0xb000                	// #45056
  36b39c:	52960000 	mov	w0, #0xb000                	// #45056
  36b3a0:	52970a82 	mov	w2, #0xb854                	// #47188
  36b3a4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b3a8:	97fff8a6 	bl	0x369640
  36b3ac:	0a150001 	and	w1, w0, w21
  36b3b0:	2a160021 	orr	w1, w1, w22
  36b3b4:	33003c20 	bfxil	w0, w1, #0, #16
  36b3b8:	d50332bf 	dmb	oshst
  36b3bc:	f9400681 	ldr	x1, [x20, #8]
  36b3c0:	91215021 	add	x1, x1, #0x854
  36b3c4:	b9000020 	str	w0, [x1]
  36b3c8:	52960001 	mov	w1, #0xb000                	// #45056
  36b3cc:	52980000 	mov	w0, #0xc000                	// #49152
  36b3d0:	52970a82 	mov	w2, #0xb854                	// #47188
  36b3d4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b3d8:	97fff89a 	bl	0x369640
  36b3dc:	0a150001 	and	w1, w0, w21
  36b3e0:	2a160021 	orr	w1, w1, w22
  36b3e4:	33003c20 	bfxil	w0, w1, #0, #16
  36b3e8:	d50332bf 	dmb	oshst
  36b3ec:	f9400a81 	ldr	x1, [x20, #16]
  36b3f0:	91215021 	add	x1, x1, #0x854
  36b3f4:	b9000020 	str	w0, [x1]
  36b3f8:	52960001 	mov	w1, #0xb000                	// #45056
  36b3fc:	52960000 	mov	w0, #0xb000                	// #45056
  36b400:	52970a82 	mov	w2, #0xb854                	// #47188
  36b404:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b408:	97fff88e 	bl	0x369640
  36b40c:	0a4042a1 	and	w1, w21, w0, lsr #16
  36b410:	2a160021 	orr	w1, w1, w22
  36b414:	33103c20 	bfi	w0, w1, #16, #16
  36b418:	d50332bf 	dmb	oshst
  36b41c:	f9400681 	ldr	x1, [x20, #8]
  36b420:	91215021 	add	x1, x1, #0x854
  36b424:	b9000020 	str	w0, [x1]
  36b428:	52960001 	mov	w1, #0xb000                	// #45056
  36b42c:	52980000 	mov	w0, #0xc000                	// #49152
  36b430:	52970a82 	mov	w2, #0xb854                	// #47188
  36b434:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b438:	97fff882 	bl	0x369640
  36b43c:	0a4042a1 	and	w1, w21, w0, lsr #16
  36b440:	2a160021 	orr	w1, w1, w22
  36b444:	33103c20 	bfi	w0, w1, #16, #16
  36b448:	d50332bf 	dmb	oshst
  36b44c:	f9400a81 	ldr	x1, [x20, #16]
  36b450:	91215021 	add	x1, x1, #0x854
  36b454:	b9000020 	str	w0, [x1]
  36b458:	d2836f00 	mov	x0, #0x1b78                	// #7032
  36b45c:	f2a001a0 	movk	x0, #0xd, lsl #16
  36b460:	940dd4d8 	bl	0x6e07c0
  36b464:	52940000 	mov	w0, #0xa000                	// #40960
  36b468:	52800782 	mov	w2, #0x3c                  	// #60
  36b46c:	52800001 	mov	w1, #0x0                   	// #0
  36b470:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b474:	97fff873 	bl	0x369640
  36b478:	d50332bf 	dmb	oshst
  36b47c:	f944ae60 	ldr	x0, [x19, #2392]
  36b480:	528020c1 	mov	w1, #0x106                 	// #262
  36b484:	72a020c1 	movk	w1, #0x106, lsl #16
  36b488:	9100f000 	add	x0, x0, #0x3c
  36b48c:	b9000001 	str	w1, [x0]
  36b490:	52940000 	mov	w0, #0xa000                	// #40960
  36b494:	52800802 	mov	w2, #0x40                  	// #64
  36b498:	52800001 	mov	w1, #0x0                   	// #0
  36b49c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b4a0:	97fff868 	bl	0x369640
  36b4a4:	72806360 	movk	w0, #0x31b
  36b4a8:	d50332bf 	dmb	oshst
  36b4ac:	f944ae61 	ldr	x1, [x19, #2392]
  36b4b0:	91010021 	add	x1, x1, #0x40
  36b4b4:	b9000020 	str	w0, [x1]
  36b4b8:	52800001 	mov	w1, #0x0                   	// #0
  36b4bc:	52940000 	mov	w0, #0xa000                	// #40960
  36b4c0:	52800702 	mov	w2, #0x38                  	// #56
  36b4c4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b4c8:	97fff85e 	bl	0x369640
  36b4cc:	0a150001 	and	w1, w0, w21
  36b4d0:	2a160021 	orr	w1, w1, w22
  36b4d4:	33003c20 	bfxil	w0, w1, #0, #16
  36b4d8:	d50332bf 	dmb	oshst
  36b4dc:	f944ae61 	ldr	x1, [x19, #2392]
  36b4e0:	9100e021 	add	x1, x1, #0x38
  36b4e4:	b9000020 	str	w0, [x1]
  36b4e8:	52940000 	mov	w0, #0xa000                	// #40960
  36b4ec:	52800402 	mov	w2, #0x20                  	// #32
  36b4f0:	52800001 	mov	w1, #0x0                   	// #0
  36b4f4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b4f8:	97fff852 	bl	0x369640
  36b4fc:	2a170000 	orr	w0, w0, w23
  36b500:	d50332bf 	dmb	oshst
  36b504:	f944ae61 	ldr	x1, [x19, #2392]
  36b508:	91008021 	add	x1, x1, #0x20
  36b50c:	b9000020 	str	w0, [x1]
  36b510:	52940000 	mov	w0, #0xa000                	// #40960
  36b514:	52800482 	mov	w2, #0x24                  	// #36
  36b518:	52800001 	mov	w1, #0x0                   	// #0
  36b51c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b520:	97fff848 	bl	0x369640
  36b524:	2a170000 	orr	w0, w0, w23
  36b528:	d50332bf 	dmb	oshst
  36b52c:	f944ae61 	ldr	x1, [x19, #2392]
  36b530:	91009021 	add	x1, x1, #0x24
  36b534:	b9000020 	str	w0, [x1]
  36b538:	52940000 	mov	w0, #0xa000                	// #40960
  36b53c:	52800382 	mov	w2, #0x1c                  	// #28
  36b540:	52800001 	mov	w1, #0x0                   	// #0
  36b544:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b548:	97fff83e 	bl	0x369640
  36b54c:	120f7800 	and	w0, w0, #0xfffeffff
  36b550:	d50332bf 	dmb	oshst
  36b554:	f944ae61 	ldr	x1, [x19, #2392]
  36b558:	91007021 	add	x1, x1, #0x1c
  36b55c:	b9000020 	str	w0, [x1]
  36b560:	52940000 	mov	w0, #0xa000                	// #40960
  36b564:	52800702 	mov	w2, #0x38                  	// #56
  36b568:	52800001 	mov	w1, #0x0                   	// #0
  36b56c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b570:	97fff834 	bl	0x369640
  36b574:	32100000 	orr	w0, w0, #0x10000
  36b578:	d50332bf 	dmb	oshst
  36b57c:	f944ae61 	ldr	x1, [x19, #2392]
  36b580:	9100e021 	add	x1, x1, #0x38
  36b584:	b9000020 	str	w0, [x1]
  36b588:	d29eea40 	mov	x0, #0xf752                	// #63314
  36b58c:	f2a00020 	movk	x0, #0x1, lsl #16
  36b590:	940dd48c 	bl	0x6e07c0
  36b594:	52940000 	mov	w0, #0xa000                	// #40960
  36b598:	52802602 	mov	w2, #0x130                 	// #304
  36b59c:	52800001 	mov	w1, #0x0                   	// #0
  36b5a0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b5a4:	97fff827 	bl	0x369640
  36b5a8:	32180000 	orr	w0, w0, #0x100
  36b5ac:	d50332bf 	dmb	oshst
  36b5b0:	f944ae61 	ldr	x1, [x19, #2392]
  36b5b4:	9104c021 	add	x1, x1, #0x130
  36b5b8:	b9000020 	str	w0, [x1]
  36b5bc:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36b5c0:	940dd480 	bl	0x6e07c0
  36b5c4:	52960000 	mov	w0, #0xb000                	// #45056
  36b5c8:	52971d02 	mov	w2, #0xb8e8                	// #47336
  36b5cc:	52960001 	mov	w1, #0xb000                	// #45056
  36b5d0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b5d4:	97fff81b 	bl	0x369640
  36b5d8:	d50332bf 	dmb	oshst
  36b5dc:	f9400681 	ldr	x1, [x20, #8]
  36b5e0:	12003c00 	and	w0, w0, #0xffff
  36b5e4:	52a31607 	mov	w7, #0x18b00000            	// #414187520
  36b5e8:	2a070000 	orr	w0, w0, w7
  36b5ec:	9123a021 	add	x1, x1, #0x8e8
  36b5f0:	b9000020 	str	w0, [x1]
  36b5f4:	52960000 	mov	w0, #0xb000                	// #45056
  36b5f8:	52971d82 	mov	w2, #0xb8ec                	// #47340
  36b5fc:	52960001 	mov	w1, #0xb000                	// #45056
  36b600:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b604:	97fff80f 	bl	0x369640
  36b608:	d50332bf 	dmb	oshst
  36b60c:	f9400680 	ldr	x0, [x20, #8]
  36b610:	52831606 	mov	w6, #0x18b0                	// #6320
  36b614:	72a20606 	movk	w6, #0x1030, lsl #16
  36b618:	9123b000 	add	x0, x0, #0x8ec
  36b61c:	b9000006 	str	w6, [x0]
  36b620:	52940000 	mov	w0, #0xa000                	// #40960
  36b624:	52802802 	mov	w2, #0x140                 	// #320
  36b628:	52800001 	mov	w1, #0x0                   	// #0
  36b62c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b630:	97fff804 	bl	0x369640
  36b634:	33080700 	bfi	w0, w24, #24, #2
  36b638:	d50332bf 	dmb	oshst
  36b63c:	f944ae61 	ldr	x1, [x19, #2392]
  36b640:	91050021 	add	x1, x1, #0x140
  36b644:	b9000020 	str	w0, [x1]
  36b648:	52940000 	mov	w0, #0xa000                	// #40960
  36b64c:	52802882 	mov	w2, #0x144                 	// #324
  36b650:	52800001 	mov	w1, #0x0                   	// #0
  36b654:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b658:	97fff7fa 	bl	0x369640
  36b65c:	528000a5 	mov	w5, #0x5                   	// #5
  36b660:	330010a0 	bfxil	w0, w5, #0, #5
  36b664:	d50332bf 	dmb	oshst
  36b668:	f944ae61 	ldr	x1, [x19, #2392]
  36b66c:	91051021 	add	x1, x1, #0x144
  36b670:	b9000020 	str	w0, [x1]
  36b674:	52800001 	mov	w1, #0x0                   	// #0
  36b678:	52940000 	mov	w0, #0xa000                	// #40960
  36b67c:	52801f82 	mov	w2, #0xfc                  	// #252
  36b680:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b684:	97fff7ef 	bl	0x369640
  36b688:	53107c01 	lsr	w1, w0, #16
  36b68c:	121c7421 	and	w1, w1, #0xfffffff3
  36b690:	321d0021 	orr	w1, w1, #0x8
  36b694:	33103c20 	bfi	w0, w1, #16, #16
  36b698:	d50332bf 	dmb	oshst
  36b69c:	f944ae61 	ldr	x1, [x19, #2392]
  36b6a0:	9103f021 	add	x1, x1, #0xfc
  36b6a4:	b9000020 	str	w0, [x1]
  36b6a8:	52940000 	mov	w0, #0xa000                	// #40960
  36b6ac:	52802802 	mov	w2, #0x140                 	// #320
  36b6b0:	52800001 	mov	w1, #0x0                   	// #0
  36b6b4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b6b8:	97fff7e2 	bl	0x369640
  36b6bc:	331806e0 	bfi	w0, w23, #8, #2
  36b6c0:	d50332bf 	dmb	oshst
  36b6c4:	f944ae61 	ldr	x1, [x19, #2392]
  36b6c8:	91050021 	add	x1, x1, #0x140
  36b6cc:	b9000020 	str	w0, [x1]
  36b6d0:	52960000 	mov	w0, #0xb000                	// #45056
  36b6d4:	52962c82 	mov	w2, #0xb164                	// #45412
  36b6d8:	52960001 	mov	w1, #0xb000                	// #45056
  36b6dc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b6e0:	97fff7d8 	bl	0x369640
  36b6e4:	12146c00 	and	w0, w0, #0xfffff0ff
  36b6e8:	d50332bf 	dmb	oshst
  36b6ec:	f9400681 	ldr	x1, [x20, #8]
  36b6f0:	91059021 	add	x1, x1, #0x164
  36b6f4:	b9000020 	str	w0, [x1]
  36b6f8:	52940000 	mov	w0, #0xa000                	// #40960
  36b6fc:	52802902 	mov	w2, #0x148                 	// #328
  36b700:	52800001 	mov	w1, #0x0                   	// #0
  36b704:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b708:	97fff7ce 	bl	0x369640
  36b70c:	32100000 	orr	w0, w0, #0x10000
  36b710:	d50332bf 	dmb	oshst
  36b714:	f944ae61 	ldr	x1, [x19, #2392]
  36b718:	91052021 	add	x1, x1, #0x148
  36b71c:	b9000020 	str	w0, [x1]
  36b720:	52960000 	mov	w0, #0xb000                	// #45056
  36b724:	52971182 	mov	w2, #0xb88c                	// #47244
  36b728:	52960001 	mov	w1, #0xb000                	// #45056
  36b72c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b730:	97fff7c4 	bl	0x369640
  36b734:	12802065 	mov	w5, #0xfffffefc            	// #-260
  36b738:	0a050001 	and	w1, w0, w5
  36b73c:	52802068 	mov	w8, #0x103                 	// #259
  36b740:	2a080021 	orr	w1, w1, w8
  36b744:	33003c20 	bfxil	w0, w1, #0, #16
  36b748:	d50332bf 	dmb	oshst
  36b74c:	f9400681 	ldr	x1, [x20, #8]
  36b750:	91223021 	add	x1, x1, #0x88c
  36b754:	b9000020 	str	w0, [x1]
  36b758:	52960000 	mov	w0, #0xb000                	// #45056
  36b75c:	52965282 	mov	w2, #0xb294                	// #45716
  36b760:	52960001 	mov	w1, #0xb000                	// #45056
  36b764:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b768:	97fff7b6 	bl	0x369640
  36b76c:	330006e0 	bfxil	w0, w23, #0, #2
  36b770:	d50332bf 	dmb	oshst
  36b774:	f9400681 	ldr	x1, [x20, #8]
  36b778:	910a5021 	add	x1, x1, #0x294
  36b77c:	b9000020 	str	w0, [x1]
  36b780:	52960000 	mov	w0, #0xb000                	// #45056
  36b784:	52962d02 	mov	w2, #0xb168                	// #45416
  36b788:	52960001 	mov	w1, #0xb000                	// #45056
  36b78c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b790:	97fff7ac 	bl	0x369640
  36b794:	33081320 	bfi	w0, w25, #24, #5
  36b798:	d50332bf 	dmb	oshst
  36b79c:	f9400681 	ldr	x1, [x20, #8]
  36b7a0:	9105a021 	add	x1, x1, #0x168
  36b7a4:	b9000020 	str	w0, [x1]
  36b7a8:	52960000 	mov	w0, #0xb000                	// #45056
  36b7ac:	52962182 	mov	w2, #0xb10c                	// #45324
  36b7b0:	52960001 	mov	w1, #0xb000                	// #45056
  36b7b4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b7b8:	97fff7a2 	bl	0x369640
  36b7bc:	121f7800 	and	w0, w0, #0xfffffffe
  36b7c0:	d50332bf 	dmb	oshst
  36b7c4:	f9400681 	ldr	x1, [x20, #8]
  36b7c8:	91043021 	add	x1, x1, #0x10c
  36b7cc:	b9000020 	str	w0, [x1]
  36b7d0:	52960001 	mov	w1, #0xb000                	// #45056
  36b7d4:	52960000 	mov	w0, #0xb000                	// #45056
  36b7d8:	52962282 	mov	w2, #0xb114                	// #45332
  36b7dc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b7e0:	97fff798 	bl	0x369640
  36b7e4:	2a170001 	orr	w1, w0, w23
  36b7e8:	d50332bf 	dmb	oshst
  36b7ec:	f9400680 	ldr	x0, [x20, #8]
  36b7f0:	91045000 	add	x0, x0, #0x114
  36b7f4:	b9000001 	str	w1, [x0]
  36b7f8:	d291b780 	mov	x0, #0x8dbc                	// #36284
  36b7fc:	b9006fe1 	str	w1, [sp, #108]
  36b800:	f2a000c0 	movk	x0, #0x6, lsl #16
  36b804:	940dd3ef 	bl	0x6e07c0
  36b808:	b9406fe1 	ldr	w1, [sp, #108]
  36b80c:	121f7821 	and	w1, w1, #0xfffffffe
  36b810:	d50332bf 	dmb	oshst
  36b814:	f9400680 	ldr	x0, [x20, #8]
  36b818:	91045000 	add	x0, x0, #0x114
  36b81c:	b9000001 	str	w1, [x0]
  36b820:	52940000 	mov	w0, #0xa000                	// #40960
  36b824:	52803d02 	mov	w2, #0x1e8                 	// #488
  36b828:	52800001 	mov	w1, #0x0                   	// #0
  36b82c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b830:	97fff784 	bl	0x369640
  36b834:	32180000 	orr	w0, w0, #0x100
  36b838:	d50332bf 	dmb	oshst
  36b83c:	f944ae61 	ldr	x1, [x19, #2392]
  36b840:	9107a021 	add	x1, x1, #0x1e8
  36b844:	b9000020 	str	w0, [x1]
  36b848:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36b84c:	940dd3dd 	bl	0x6e07c0
  36b850:	52980000 	mov	w0, #0xc000                	// #49152
  36b854:	52971d02 	mov	w2, #0xb8e8                	// #47336
  36b858:	52960001 	mov	w1, #0xb000                	// #45056
  36b85c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b860:	97fff778 	bl	0x369640
  36b864:	d50332bf 	dmb	oshst
  36b868:	f9400a81 	ldr	x1, [x20, #16]
  36b86c:	12003c00 	and	w0, w0, #0xffff
  36b870:	52a31607 	mov	w7, #0x18b00000            	// #414187520
  36b874:	2a070007 	orr	w7, w0, w7
  36b878:	9123a020 	add	x0, x1, #0x8e8
  36b87c:	b9000007 	str	w7, [x0]
  36b880:	52980000 	mov	w0, #0xc000                	// #49152
  36b884:	52971d82 	mov	w2, #0xb8ec                	// #47340
  36b888:	52960001 	mov	w1, #0xb000                	// #45056
  36b88c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b890:	97fff76c 	bl	0x369640
  36b894:	d50332bf 	dmb	oshst
  36b898:	f9400a80 	ldr	x0, [x20, #16]
  36b89c:	52831606 	mov	w6, #0x18b0                	// #6320
  36b8a0:	72a20606 	movk	w6, #0x1030, lsl #16
  36b8a4:	9123b000 	add	x0, x0, #0x8ec
  36b8a8:	b9000006 	str	w6, [x0]
  36b8ac:	52940000 	mov	w0, #0xa000                	// #40960
  36b8b0:	52803f02 	mov	w2, #0x1f8                 	// #504
  36b8b4:	52800001 	mov	w1, #0x0                   	// #0
  36b8b8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b8bc:	97fff761 	bl	0x369640
  36b8c0:	529f9fe1 	mov	w1, #0xfcff                	// #64767
  36b8c4:	72bffc01 	movk	w1, #0xffe0, lsl #16
  36b8c8:	0a010000 	and	w0, w0, w1
  36b8cc:	52804001 	mov	w1, #0x200                 	// #512
  36b8d0:	72a000a1 	movk	w1, #0x5, lsl #16
  36b8d4:	2a010000 	orr	w0, w0, w1
  36b8d8:	d50332bf 	dmb	oshst
  36b8dc:	f944ae61 	ldr	x1, [x19, #2392]
  36b8e0:	9107e021 	add	x1, x1, #0x1f8
  36b8e4:	b9000020 	str	w0, [x1]
  36b8e8:	52800001 	mov	w1, #0x0                   	// #0
  36b8ec:	52940000 	mov	w0, #0xa000                	// #40960
  36b8f0:	52803682 	mov	w2, #0x1b4                 	// #436
  36b8f4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b8f8:	97fff752 	bl	0x369640
  36b8fc:	53107c01 	lsr	w1, w0, #16
  36b900:	121c7421 	and	w1, w1, #0xfffffff3
  36b904:	321d0021 	orr	w1, w1, #0x8
  36b908:	33103c20 	bfi	w0, w1, #16, #16
  36b90c:	d50332bf 	dmb	oshst
  36b910:	f944ae61 	ldr	x1, [x19, #2392]
  36b914:	9106d021 	add	x1, x1, #0x1b4
  36b918:	b9000020 	str	w0, [x1]
  36b91c:	52940000 	mov	w0, #0xa000                	// #40960
  36b920:	52803e82 	mov	w2, #0x1f4                 	// #500
  36b924:	52800001 	mov	w1, #0x0                   	// #0
  36b928:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b92c:	97fff745 	bl	0x369640
  36b930:	330806e0 	bfi	w0, w23, #24, #2
  36b934:	d50332bf 	dmb	oshst
  36b938:	f944ae61 	ldr	x1, [x19, #2392]
  36b93c:	9107d021 	add	x1, x1, #0x1f4
  36b940:	b9000020 	str	w0, [x1]
  36b944:	52980000 	mov	w0, #0xc000                	// #49152
  36b948:	52962c82 	mov	w2, #0xb164                	// #45412
  36b94c:	52960001 	mov	w1, #0xb000                	// #45056
  36b950:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b954:	97fff73b 	bl	0x369640
  36b958:	12146c00 	and	w0, w0, #0xfffff0ff
  36b95c:	d50332bf 	dmb	oshst
  36b960:	f9400a81 	ldr	x1, [x20, #16]
  36b964:	91059021 	add	x1, x1, #0x164
  36b968:	b9000020 	str	w0, [x1]
  36b96c:	52940000 	mov	w0, #0xa000                	// #40960
  36b970:	52804002 	mov	w2, #0x200                 	// #512
  36b974:	52800001 	mov	w1, #0x0                   	// #0
  36b978:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b97c:	97fff731 	bl	0x369640
  36b980:	32080000 	orr	w0, w0, #0x1000000
  36b984:	d50332bf 	dmb	oshst
  36b988:	f944ae61 	ldr	x1, [x19, #2392]
  36b98c:	91080021 	add	x1, x1, #0x200
  36b990:	b9000020 	str	w0, [x1]
  36b994:	52980000 	mov	w0, #0xc000                	// #49152
  36b998:	52971182 	mov	w2, #0xb88c                	// #47244
  36b99c:	52960001 	mov	w1, #0xb000                	// #45056
  36b9a0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b9a4:	97fff727 	bl	0x369640
  36b9a8:	12802065 	mov	w5, #0xfffffefc            	// #-260
  36b9ac:	0a050005 	and	w5, w0, w5
  36b9b0:	52802068 	mov	w8, #0x103                 	// #259
  36b9b4:	2a0800a8 	orr	w8, w5, w8
  36b9b8:	33003d00 	bfxil	w0, w8, #0, #16
  36b9bc:	d50332bf 	dmb	oshst
  36b9c0:	f9400a81 	ldr	x1, [x20, #16]
  36b9c4:	91223021 	add	x1, x1, #0x88c
  36b9c8:	b9000020 	str	w0, [x1]
  36b9cc:	52980000 	mov	w0, #0xc000                	// #49152
  36b9d0:	52965282 	mov	w2, #0xb294                	// #45716
  36b9d4:	52960001 	mov	w1, #0xb000                	// #45056
  36b9d8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36b9dc:	97fff719 	bl	0x369640
  36b9e0:	330006e0 	bfxil	w0, w23, #0, #2
  36b9e4:	d50332bf 	dmb	oshst
  36b9e8:	f9400a81 	ldr	x1, [x20, #16]
  36b9ec:	910a5021 	add	x1, x1, #0x294
  36b9f0:	b9000020 	str	w0, [x1]
  36b9f4:	52980000 	mov	w0, #0xc000                	// #49152
  36b9f8:	52962d02 	mov	w2, #0xb168                	// #45416
  36b9fc:	52960001 	mov	w1, #0xb000                	// #45056
  36ba00:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ba04:	97fff70f 	bl	0x369640
  36ba08:	33081320 	bfi	w0, w25, #24, #5
  36ba0c:	d50332bf 	dmb	oshst
  36ba10:	f9400a81 	ldr	x1, [x20, #16]
  36ba14:	9105a021 	add	x1, x1, #0x168
  36ba18:	b9000020 	str	w0, [x1]
  36ba1c:	52980000 	mov	w0, #0xc000                	// #49152
  36ba20:	52962182 	mov	w2, #0xb10c                	// #45324
  36ba24:	52960001 	mov	w1, #0xb000                	// #45056
  36ba28:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ba2c:	97fff705 	bl	0x369640
  36ba30:	121f7800 	and	w0, w0, #0xfffffffe
  36ba34:	d50332bf 	dmb	oshst
  36ba38:	f9400a81 	ldr	x1, [x20, #16]
  36ba3c:	91043021 	add	x1, x1, #0x10c
  36ba40:	b9000020 	str	w0, [x1]
  36ba44:	52980000 	mov	w0, #0xc000                	// #49152
  36ba48:	52962282 	mov	w2, #0xb114                	// #45332
  36ba4c:	52960001 	mov	w1, #0xb000                	// #45056
  36ba50:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ba54:	97fff6fb 	bl	0x369640
  36ba58:	2a170017 	orr	w23, w0, w23
  36ba5c:	d50332bf 	dmb	oshst
  36ba60:	f9400a80 	ldr	x0, [x20, #16]
  36ba64:	91045000 	add	x0, x0, #0x114
  36ba68:	b9000017 	str	w23, [x0]
  36ba6c:	d291b780 	mov	x0, #0x8dbc                	// #36284
  36ba70:	121f7af7 	and	w23, w23, #0xfffffffe
  36ba74:	f2a000c0 	movk	x0, #0x6, lsl #16
  36ba78:	940dd352 	bl	0x6e07c0
  36ba7c:	d50332bf 	dmb	oshst
  36ba80:	f9400a80 	ldr	x0, [x20, #16]
  36ba84:	91045000 	add	x0, x0, #0x114
  36ba88:	b9000017 	str	w23, [x0]
  36ba8c:	52960001 	mov	w1, #0xb000                	// #45056
  36ba90:	52960000 	mov	w0, #0xb000                	// #45056
  36ba94:	52970982 	mov	w2, #0xb84c                	// #47180
  36ba98:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36ba9c:	97fff6e9 	bl	0x369640
  36baa0:	0a4042a1 	and	w1, w21, w0, lsr #16
  36baa4:	2a160021 	orr	w1, w1, w22
  36baa8:	33103c20 	bfi	w0, w1, #16, #16
  36baac:	d50332bf 	dmb	oshst
  36bab0:	f9400681 	ldr	x1, [x20, #8]
  36bab4:	91213021 	add	x1, x1, #0x84c
  36bab8:	b9000020 	str	w0, [x1]
  36babc:	52960001 	mov	w1, #0xb000                	// #45056
  36bac0:	52980000 	mov	w0, #0xc000                	// #49152
  36bac4:	52970982 	mov	w2, #0xb84c                	// #47180
  36bac8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bacc:	97fff6dd 	bl	0x369640
  36bad0:	0a4042a1 	and	w1, w21, w0, lsr #16
  36bad4:	2a160021 	orr	w1, w1, w22
  36bad8:	33103c20 	bfi	w0, w1, #16, #16
  36badc:	d50332bf 	dmb	oshst
  36bae0:	f9400a81 	ldr	x1, [x20, #16]
  36bae4:	91213021 	add	x1, x1, #0x84c
  36bae8:	b9000020 	str	w0, [x1]
  36baec:	52960001 	mov	w1, #0xb000                	// #45056
  36baf0:	52960000 	mov	w0, #0xb000                	// #45056
  36baf4:	52970382 	mov	w2, #0xb81c                	// #47132
  36baf8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bafc:	97fff6d1 	bl	0x369640
  36bb00:	0a150001 	and	w1, w0, w21
  36bb04:	2a160021 	orr	w1, w1, w22
  36bb08:	33003c20 	bfxil	w0, w1, #0, #16
  36bb0c:	d50332bf 	dmb	oshst
  36bb10:	f9400681 	ldr	x1, [x20, #8]
  36bb14:	91207021 	add	x1, x1, #0x81c
  36bb18:	b9000020 	str	w0, [x1]
  36bb1c:	52960001 	mov	w1, #0xb000                	// #45056
  36bb20:	52960000 	mov	w0, #0xb000                	// #45056
  36bb24:	52971282 	mov	w2, #0xb894                	// #47252
  36bb28:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bb2c:	97fff6c5 	bl	0x369640
  36bb30:	0a150001 	and	w1, w0, w21
  36bb34:	2a160021 	orr	w1, w1, w22
  36bb38:	33003c20 	bfxil	w0, w1, #0, #16
  36bb3c:	d50332bf 	dmb	oshst
  36bb40:	f9400681 	ldr	x1, [x20, #8]
  36bb44:	91225021 	add	x1, x1, #0x894
  36bb48:	b9000020 	str	w0, [x1]
  36bb4c:	52960001 	mov	w1, #0xb000                	// #45056
  36bb50:	52980000 	mov	w0, #0xc000                	// #49152
  36bb54:	52970382 	mov	w2, #0xb81c                	// #47132
  36bb58:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bb5c:	97fff6b9 	bl	0x369640
  36bb60:	0a150001 	and	w1, w0, w21
  36bb64:	2a160021 	orr	w1, w1, w22
  36bb68:	33003c20 	bfxil	w0, w1, #0, #16
  36bb6c:	d50332bf 	dmb	oshst
  36bb70:	f9400a81 	ldr	x1, [x20, #16]
  36bb74:	91207021 	add	x1, x1, #0x81c
  36bb78:	b9000020 	str	w0, [x1]
  36bb7c:	52960001 	mov	w1, #0xb000                	// #45056
  36bb80:	52980000 	mov	w0, #0xc000                	// #49152
  36bb84:	52971282 	mov	w2, #0xb894                	// #47252
  36bb88:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bb8c:	97fff6ad 	bl	0x369640
  36bb90:	0a150001 	and	w1, w0, w21
  36bb94:	2a160021 	orr	w1, w1, w22
  36bb98:	33003c20 	bfxil	w0, w1, #0, #16
  36bb9c:	d50332bf 	dmb	oshst
  36bba0:	f9400a81 	ldr	x1, [x20, #16]
  36bba4:	91225021 	add	x1, x1, #0x894
  36bba8:	b9000020 	str	w0, [x1]
  36bbac:	52800001 	mov	w1, #0x0                   	// #0
  36bbb0:	52940000 	mov	w0, #0xa000                	// #40960
  36bbb4:	52802002 	mov	w2, #0x100                 	// #256
  36bbb8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bbbc:	97fff6a1 	bl	0x369640
  36bbc0:	0a4042a1 	and	w1, w21, w0, lsr #16
  36bbc4:	2a160021 	orr	w1, w1, w22
  36bbc8:	33103c20 	bfi	w0, w1, #16, #16
  36bbcc:	d50332bf 	dmb	oshst
  36bbd0:	f944ae61 	ldr	x1, [x19, #2392]
  36bbd4:	91040021 	add	x1, x1, #0x100
  36bbd8:	b9000020 	str	w0, [x1]
  36bbdc:	52800001 	mov	w1, #0x0                   	// #0
  36bbe0:	52940000 	mov	w0, #0xa000                	// #40960
  36bbe4:	52803702 	mov	w2, #0x1b8                 	// #440
  36bbe8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bbec:	97fff695 	bl	0x369640
  36bbf0:	0a4042a1 	and	w1, w21, w0, lsr #16
  36bbf4:	2a160021 	orr	w1, w1, w22
  36bbf8:	33103c20 	bfi	w0, w1, #16, #16
  36bbfc:	d50332bf 	dmb	oshst
  36bc00:	f944ae61 	ldr	x1, [x19, #2392]
  36bc04:	9106e021 	add	x1, x1, #0x1b8
  36bc08:	b9000020 	str	w0, [x1]
  36bc0c:	52960001 	mov	w1, #0xb000                	// #45056
  36bc10:	52960000 	mov	w0, #0xb000                	// #45056
  36bc14:	52968c02 	mov	w2, #0xb460                	// #46176
  36bc18:	12800bb7 	mov	w23, #0xffffffa2            	// #-94
  36bc1c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bc20:	97fff688 	bl	0x369640
  36bc24:	0a170001 	and	w1, w0, w23
  36bc28:	52800bb9 	mov	w25, #0x5d                  	// #93
  36bc2c:	2a190021 	orr	w1, w1, w25
  36bc30:	33001c20 	bfxil	w0, w1, #0, #8
  36bc34:	d50332bf 	dmb	oshst
  36bc38:	f9400681 	ldr	x1, [x20, #8]
  36bc3c:	91118021 	add	x1, x1, #0x460
  36bc40:	b9000020 	str	w0, [x1]
  36bc44:	52980000 	mov	w0, #0xc000                	// #49152
  36bc48:	52968c02 	mov	w2, #0xb460                	// #46176
  36bc4c:	52960001 	mov	w1, #0xb000                	// #45056
  36bc50:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bc54:	97fff67b 	bl	0x369640
  36bc58:	0a170017 	and	w23, w0, w23
  36bc5c:	2a1902f7 	orr	w23, w23, w25
  36bc60:	33001ee0 	bfxil	w0, w23, #0, #8
  36bc64:	d50332bf 	dmb	oshst
  36bc68:	f9400a81 	ldr	x1, [x20, #16]
  36bc6c:	91118021 	add	x1, x1, #0x460
  36bc70:	b9000020 	str	w0, [x1]
  36bc74:	52940000 	mov	w0, #0xa000                	// #40960
  36bc78:	52802902 	mov	w2, #0x148                 	// #328
  36bc7c:	52800001 	mov	w1, #0x0                   	// #0
  36bc80:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bc84:	97fff66f 	bl	0x369640
  36bc88:	0a150015 	and	w21, w0, w21
  36bc8c:	2a1602b6 	orr	w22, w21, w22
  36bc90:	33003ec0 	bfxil	w0, w22, #0, #16
  36bc94:	d50332bf 	dmb	oshst
  36bc98:	f944ae61 	ldr	x1, [x19, #2392]
  36bc9c:	91052021 	add	x1, x1, #0x148
  36bca0:	b9000020 	str	w0, [x1]
  36bca4:	52940000 	mov	w0, #0xa000                	// #40960
  36bca8:	52802882 	mov	w2, #0x144                 	// #324
  36bcac:	52800001 	mov	w1, #0x0                   	// #0
  36bcb0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bcb4:	97fff663 	bl	0x369640
  36bcb8:	32080000 	orr	w0, w0, #0x1000000
  36bcbc:	d50332bf 	dmb	oshst
  36bcc0:	f944ae61 	ldr	x1, [x19, #2392]
  36bcc4:	91051021 	add	x1, x1, #0x144
  36bcc8:	b9000020 	str	w0, [x1]
  36bccc:	52940000 	mov	w0, #0xa000                	// #40960
  36bcd0:	52804002 	mov	w2, #0x200                 	// #512
  36bcd4:	52800001 	mov	w1, #0x0                   	// #0
  36bcd8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bcdc:	97fff659 	bl	0x369640
  36bce0:	52802021 	mov	w1, #0x101                 	// #257
  36bce4:	72a00021 	movk	w1, #0x1, lsl #16
  36bce8:	2a010000 	orr	w0, w0, w1
  36bcec:	d50332bf 	dmb	oshst
  36bcf0:	f944ae61 	ldr	x1, [x19, #2392]
  36bcf4:	91080021 	add	x1, x1, #0x200
  36bcf8:	b9000020 	str	w0, [x1]
  36bcfc:	52800001 	mov	w1, #0x0                   	// #0
  36bd00:	1280ee15 	mov	w21, #0xfffff88f            	// #-1905
  36bd04:	52940000 	mov	w0, #0xa000                	// #40960
  36bd08:	52801f82 	mov	w2, #0xfc                  	// #252
  36bd0c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bd10:	97fff64c 	bl	0x369640
  36bd14:	0a4042a1 	and	w1, w21, w0, lsr #16
  36bd18:	52808816 	mov	w22, #0x440                 	// #1088
  36bd1c:	2a160021 	orr	w1, w1, w22
  36bd20:	33103c20 	bfi	w0, w1, #16, #16
  36bd24:	d50332bf 	dmb	oshst
  36bd28:	f944ae61 	ldr	x1, [x19, #2392]
  36bd2c:	9103f021 	add	x1, x1, #0xfc
  36bd30:	b9000020 	str	w0, [x1]
  36bd34:	52940000 	mov	w0, #0xa000                	// #40960
  36bd38:	52803682 	mov	w2, #0x1b4                 	// #436
  36bd3c:	52800001 	mov	w1, #0x0                   	// #0
  36bd40:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bd44:	97fff63f 	bl	0x369640
  36bd48:	0a4042b5 	and	w21, w21, w0, lsr #16
  36bd4c:	2a1602b5 	orr	w21, w21, w22
  36bd50:	33103ea0 	bfi	w0, w21, #16, #16
  36bd54:	d50332bf 	dmb	oshst
  36bd58:	f944ae61 	ldr	x1, [x19, #2392]
  36bd5c:	9106d021 	add	x1, x1, #0x1b4
  36bd60:	b9000020 	str	w0, [x1]
  36bd64:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36bd68:	940dd296 	bl	0x6e07c0
  36bd6c:	52800001 	mov	w1, #0x0                   	// #0
  36bd70:	52940000 	mov	w0, #0xa000                	// #40960
  36bd74:	52802482 	mov	w2, #0x124                 	// #292
  36bd78:	1280e0f5 	mov	w21, #0xfffff8f8            	// #-1800
  36bd7c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bd80:	97fff630 	bl	0x369640
  36bd84:	0a150001 	and	w1, w0, w21
  36bd88:	5280a0b6 	mov	w22, #0x505                 	// #1285
  36bd8c:	2a160021 	orr	w1, w1, w22
  36bd90:	33003c20 	bfxil	w0, w1, #0, #16
  36bd94:	d50332bf 	dmb	oshst
  36bd98:	f944ae61 	ldr	x1, [x19, #2392]
  36bd9c:	91049021 	add	x1, x1, #0x124
  36bda0:	b9000020 	str	w0, [x1]
  36bda4:	52940000 	mov	w0, #0xa000                	// #40960
  36bda8:	52802502 	mov	w2, #0x128                 	// #296
  36bdac:	52800001 	mov	w1, #0x0                   	// #0
  36bdb0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bdb4:	97fff623 	bl	0x369640
  36bdb8:	121e7400 	and	w0, w0, #0xfffffffc
  36bdbc:	d50332bf 	dmb	oshst
  36bdc0:	f944ae61 	ldr	x1, [x19, #2392]
  36bdc4:	9104a021 	add	x1, x1, #0x128
  36bdc8:	b9000020 	str	w0, [x1]
  36bdcc:	52940000 	mov	w0, #0xa000                	// #40960
  36bdd0:	52802602 	mov	w2, #0x130                 	// #304
  36bdd4:	52800001 	mov	w1, #0x0                   	// #0
  36bdd8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bddc:	97fff619 	bl	0x369640
  36bde0:	120e7400 	and	w0, w0, #0xfffcffff
  36bde4:	d50332bf 	dmb	oshst
  36bde8:	f944ae61 	ldr	x1, [x19, #2392]
  36bdec:	9104c021 	add	x1, x1, #0x130
  36bdf0:	b9000020 	str	w0, [x1]
  36bdf4:	52800001 	mov	w1, #0x0                   	// #0
  36bdf8:	52940000 	mov	w0, #0xa000                	// #40960
  36bdfc:	52803b82 	mov	w2, #0x1dc                 	// #476
  36be00:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36be04:	97fff60f 	bl	0x369640
  36be08:	0a150001 	and	w1, w0, w21
  36be0c:	2a160021 	orr	w1, w1, w22
  36be10:	33003c20 	bfxil	w0, w1, #0, #16
  36be14:	d50332bf 	dmb	oshst
  36be18:	f944ae61 	ldr	x1, [x19, #2392]
  36be1c:	91077021 	add	x1, x1, #0x1dc
  36be20:	b9000020 	str	w0, [x1]
  36be24:	52940000 	mov	w0, #0xa000                	// #40960
  36be28:	52803c02 	mov	w2, #0x1e0                 	// #480
  36be2c:	52800001 	mov	w1, #0x0                   	// #0
  36be30:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36be34:	97fff603 	bl	0x369640
  36be38:	121e7400 	and	w0, w0, #0xfffffffc
  36be3c:	d50332bf 	dmb	oshst
  36be40:	f944ae61 	ldr	x1, [x19, #2392]
  36be44:	91078021 	add	x1, x1, #0x1e0
  36be48:	b9000020 	str	w0, [x1]
  36be4c:	52940000 	mov	w0, #0xa000                	// #40960
  36be50:	52803d02 	mov	w2, #0x1e8                 	// #488
  36be54:	52800001 	mov	w1, #0x0                   	// #0
  36be58:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36be5c:	97fff5f9 	bl	0x369640
  36be60:	120e7400 	and	w0, w0, #0xfffcffff
  36be64:	d50332bf 	dmb	oshst
  36be68:	f944ae61 	ldr	x1, [x19, #2392]
  36be6c:	9107a021 	add	x1, x1, #0x1e8
  36be70:	b9000020 	str	w0, [x1]
  36be74:	52a00055 	mov	w21, #0x20000               	// #131072
  36be78:	52940000 	mov	w0, #0xa000                	// #40960
  36be7c:	52802202 	mov	w2, #0x110                 	// #272
  36be80:	52800001 	mov	w1, #0x0                   	// #0
  36be84:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36be88:	97fff5ee 	bl	0x369640
  36be8c:	33184aa0 	bfi	w0, w21, #8, #19
  36be90:	d50332bf 	dmb	oshst
  36be94:	f944ae61 	ldr	x1, [x19, #2392]
  36be98:	91044021 	add	x1, x1, #0x110
  36be9c:	b9000020 	str	w0, [x1]
  36bea0:	52940000 	mov	w0, #0xa000                	// #40960
  36bea4:	52803902 	mov	w2, #0x1c8                 	// #456
  36bea8:	52800001 	mov	w1, #0x0                   	// #0
  36beac:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36beb0:	97fff5e4 	bl	0x369640
  36beb4:	33184aa0 	bfi	w0, w21, #8, #19
  36beb8:	d50332bf 	dmb	oshst
  36bebc:	f944ae61 	ldr	x1, [x19, #2392]
  36bec0:	91072021 	add	x1, x1, #0x1c8
  36bec4:	b9000020 	str	w0, [x1]
  36bec8:	52940000 	mov	w0, #0xa000                	// #40960
  36becc:	52802402 	mov	w2, #0x120                 	// #288
  36bed0:	52800001 	mov	w1, #0x0                   	// #0
  36bed4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bed8:	97fff5da 	bl	0x369640
  36bedc:	33100f00 	bfi	w0, w24, #16, #4
  36bee0:	d50332bf 	dmb	oshst
  36bee4:	f944ae61 	ldr	x1, [x19, #2392]
  36bee8:	91256275 	add	x21, x19, #0x958
  36beec:	91048021 	add	x1, x1, #0x120
  36bef0:	b9000020 	str	w0, [x1]
  36bef4:	52940000 	mov	w0, #0xa000                	// #40960
  36bef8:	52803b02 	mov	w2, #0x1d8                 	// #472
  36befc:	52800001 	mov	w1, #0x0                   	// #0
  36bf00:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bf04:	97fff5cf 	bl	0x369640
  36bf08:	33100f00 	bfi	w0, w24, #16, #4
  36bf0c:	d50332bf 	dmb	oshst
  36bf10:	f944ae61 	ldr	x1, [x19, #2392]
  36bf14:	91076021 	add	x1, x1, #0x1d8
  36bf18:	b9000020 	str	w0, [x1]
  36bf1c:	52940000 	mov	w0, #0xa000                	// #40960
  36bf20:	52802402 	mov	w2, #0x120                 	// #288
  36bf24:	52800001 	mov	w1, #0x0                   	// #0
  36bf28:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bf2c:	97fff5c5 	bl	0x369640
  36bf30:	33080b60 	bfi	w0, w27, #24, #3
  36bf34:	d50332bf 	dmb	oshst
  36bf38:	f944ae61 	ldr	x1, [x19, #2392]
  36bf3c:	91048021 	add	x1, x1, #0x120
  36bf40:	b9000020 	str	w0, [x1]
  36bf44:	52940000 	mov	w0, #0xa000                	// #40960
  36bf48:	52803b02 	mov	w2, #0x1d8                 	// #472
  36bf4c:	52800001 	mov	w1, #0x0                   	// #0
  36bf50:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bf54:	97fff5bb 	bl	0x369640
  36bf58:	33080b60 	bfi	w0, w27, #24, #3
  36bf5c:	d50332bf 	dmb	oshst
  36bf60:	f944ae61 	ldr	x1, [x19, #2392]
  36bf64:	91076021 	add	x1, x1, #0x1d8
  36bf68:	b9000020 	str	w0, [x1]
  36bf6c:	52940000 	mov	w0, #0xa000                	// #40960
  36bf70:	52801982 	mov	w2, #0xcc                  	// #204
  36bf74:	52800001 	mov	w1, #0x0                   	// #0
  36bf78:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bf7c:	97fff5b1 	bl	0x369640
  36bf80:	32000000 	orr	w0, w0, #0x1
  36bf84:	d50332bf 	dmb	oshst
  36bf88:	f944ae61 	ldr	x1, [x19, #2392]
  36bf8c:	91033021 	add	x1, x1, #0xcc
  36bf90:	b9000020 	str	w0, [x1]
  36bf94:	52940000 	mov	w0, #0xa000                	// #40960
  36bf98:	52801d02 	mov	w2, #0xe8                  	// #232
  36bf9c:	52800001 	mov	w1, #0x0                   	// #0
  36bfa0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bfa4:	97fff5a7 	bl	0x369640
  36bfa8:	32000000 	orr	w0, w0, #0x1
  36bfac:	d50332bf 	dmb	oshst
  36bfb0:	f944ae61 	ldr	x1, [x19, #2392]
  36bfb4:	9103a021 	add	x1, x1, #0xe8
  36bfb8:	b9000020 	str	w0, [x1]
  36bfbc:	52940000 	mov	w0, #0xa000                	// #40960
  36bfc0:	52801982 	mov	w2, #0xcc                  	// #204
  36bfc4:	52800001 	mov	w1, #0x0                   	// #0
  36bfc8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bfcc:	97fff59d 	bl	0x369640
  36bfd0:	32080000 	orr	w0, w0, #0x1000000
  36bfd4:	d50332bf 	dmb	oshst
  36bfd8:	f944ae61 	ldr	x1, [x19, #2392]
  36bfdc:	91033021 	add	x1, x1, #0xcc
  36bfe0:	b9000020 	str	w0, [x1]
  36bfe4:	52940000 	mov	w0, #0xa000                	// #40960
  36bfe8:	52801d02 	mov	w2, #0xe8                  	// #232
  36bfec:	52800001 	mov	w1, #0x0                   	// #0
  36bff0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36bff4:	97fff593 	bl	0x369640
  36bff8:	32080000 	orr	w0, w0, #0x1000000
  36bffc:	d50332bf 	dmb	oshst
  36c000:	f944ae61 	ldr	x1, [x19, #2392]
  36c004:	9103a021 	add	x1, x1, #0xe8
  36c008:	b9000020 	str	w0, [x1]
  36c00c:	52800001 	mov	w1, #0x0                   	// #0
  36c010:	52940000 	mov	w0, #0xa000                	// #40960
  36c014:	52801d82 	mov	w2, #0xec                  	// #236
  36c018:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c01c:	97fff589 	bl	0x369640
  36c020:	b9406be1 	ldr	w1, [sp, #104]
  36c024:	33000020 	bfxil	w0, w1, #0, #1
  36c028:	d50332bf 	dmb	oshst
  36c02c:	f944ae61 	ldr	x1, [x19, #2392]
  36c030:	9103b021 	add	x1, x1, #0xec
  36c034:	b9000020 	str	w0, [x1]
  36c038:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36c03c:	940dd1e1 	bl	0x6e07c0
  36c040:	52960000 	mov	w0, #0xb000                	// #45056
  36c044:	52972102 	mov	w2, #0xb908                	// #47368
  36c048:	52960001 	mov	w1, #0xb000                	// #45056
  36c04c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c050:	97fff57c 	bl	0x369640
  36c054:	d50332bf 	dmb	oshst
  36c058:	f9400680 	ldr	x0, [x20, #8]
  36c05c:	52880019 	mov	w25, #0x4000                	// #16384
  36c060:	72a01019 	movk	w25, #0x80, lsl #16
  36c064:	91242000 	add	x0, x0, #0x908
  36c068:	b9000019 	str	w25, [x0]
  36c06c:	52960000 	mov	w0, #0xb000                	// #45056
  36c070:	52971c82 	mov	w2, #0xb8e4                	// #47332
  36c074:	52960001 	mov	w1, #0xb000                	// #45056
  36c078:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c07c:	97fff571 	bl	0x369640
  36c080:	d50332bf 	dmb	oshst
  36c084:	f9400681 	ldr	x1, [x20, #8]
  36c088:	0a1c0000 	and	w0, w0, w28
  36c08c:	5280a0b8 	mov	w24, #0x505                 	// #1285
  36c090:	72a000b8 	movk	w24, #0x5, lsl #16
  36c094:	91239021 	add	x1, x1, #0x8e4
  36c098:	2a180000 	orr	w0, w0, w24
  36c09c:	b9000020 	str	w0, [x1]
  36c0a0:	52960000 	mov	w0, #0xb000                	// #45056
  36c0a4:	52972282 	mov	w2, #0xb914                	// #47380
  36c0a8:	52960001 	mov	w1, #0xb000                	// #45056
  36c0ac:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c0b0:	97fff564 	bl	0x369640
  36c0b4:	d50332bf 	dmb	oshst
  36c0b8:	f9400681 	ldr	x1, [x20, #8]
  36c0bc:	528ee017 	mov	w23, #0x7700                	// #30464
  36c0c0:	72a000f7 	movk	w23, #0x7, lsl #16
  36c0c4:	2a170000 	orr	w0, w0, w23
  36c0c8:	91245021 	add	x1, x1, #0x914
  36c0cc:	b9000020 	str	w0, [x1]
  36c0d0:	52940000 	mov	w0, #0xa000                	// #40960
  36c0d4:	529fffd6 	mov	w22, #0xfffe                	// #65534
  36c0d8:	52802582 	mov	w2, #0x12c                 	// #300
  36c0dc:	52800001 	mov	w1, #0x0                   	// #0
  36c0e0:	72bffe16 	movk	w22, #0xfff0, lsl #16
  36c0e4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c0e8:	97fff556 	bl	0x369640
  36c0ec:	0a160000 	and	w0, w0, w22
  36c0f0:	320f0000 	orr	w0, w0, #0x20000
  36c0f4:	d50332bf 	dmb	oshst
  36c0f8:	f944ae61 	ldr	x1, [x19, #2392]
  36c0fc:	9104b021 	add	x1, x1, #0x12c
  36c100:	b9000020 	str	w0, [x1]
  36c104:	52940000 	mov	w0, #0xa000                	// #40960
  36c108:	52802b02 	mov	w2, #0x158                 	// #344
  36c10c:	52800001 	mov	w1, #0x0                   	// #0
  36c110:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c114:	97fff54b 	bl	0x369640
  36c118:	52800321 	mov	w1, #0x19                  	// #25
  36c11c:	33081420 	bfi	w0, w1, #24, #6
  36c120:	d50332bf 	dmb	oshst
  36c124:	f944ae61 	ldr	x1, [x19, #2392]
  36c128:	91056021 	add	x1, x1, #0x158
  36c12c:	b9000020 	str	w0, [x1]
  36c130:	52940000 	mov	w0, #0xa000                	// #40960
  36c134:	52802b82 	mov	w2, #0x15c                 	// #348
  36c138:	52800001 	mov	w1, #0x0                   	// #0
  36c13c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c140:	97fff540 	bl	0x369640
  36c144:	1287e7e3 	mov	w3, #0xffffc0c0            	// #-16192
  36c148:	0a030003 	and	w3, w0, w3
  36c14c:	52828321 	mov	w1, #0x1419                	// #5145
  36c150:	2a010063 	orr	w3, w3, w1
  36c154:	33003c60 	bfxil	w0, w3, #0, #16
  36c158:	d50332bf 	dmb	oshst
  36c15c:	f944ae61 	ldr	x1, [x19, #2392]
  36c160:	91057021 	add	x1, x1, #0x15c
  36c164:	b9000020 	str	w0, [x1]
  36c168:	52980000 	mov	w0, #0xc000                	// #49152
  36c16c:	52972102 	mov	w2, #0xb908                	// #47368
  36c170:	52960001 	mov	w1, #0xb000                	// #45056
  36c174:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c178:	97fff532 	bl	0x369640
  36c17c:	d50332bf 	dmb	oshst
  36c180:	f9400a80 	ldr	x0, [x20, #16]
  36c184:	91242000 	add	x0, x0, #0x908
  36c188:	b9000019 	str	w25, [x0]
  36c18c:	52980000 	mov	w0, #0xc000                	// #49152
  36c190:	52971c82 	mov	w2, #0xb8e4                	// #47332
  36c194:	52960001 	mov	w1, #0xb000                	// #45056
  36c198:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c19c:	97fff529 	bl	0x369640
  36c1a0:	d50332bf 	dmb	oshst
  36c1a4:	f9400a81 	ldr	x1, [x20, #16]
  36c1a8:	0a1c001c 	and	w28, w0, w28
  36c1ac:	2a18039c 	orr	w28, w28, w24
  36c1b0:	91239020 	add	x0, x1, #0x8e4
  36c1b4:	b900001c 	str	w28, [x0]
  36c1b8:	52980000 	mov	w0, #0xc000                	// #49152
  36c1bc:	52972282 	mov	w2, #0xb914                	// #47380
  36c1c0:	52960001 	mov	w1, #0xb000                	// #45056
  36c1c4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c1c8:	97fff51e 	bl	0x369640
  36c1cc:	d50332bf 	dmb	oshst
  36c1d0:	f9400a81 	ldr	x1, [x20, #16]
  36c1d4:	2a170000 	orr	w0, w0, w23
  36c1d8:	91245021 	add	x1, x1, #0x914
  36c1dc:	b9000020 	str	w0, [x1]
  36c1e0:	52940000 	mov	w0, #0xa000                	// #40960
  36c1e4:	52803c82 	mov	w2, #0x1e4                 	// #484
  36c1e8:	52800001 	mov	w1, #0x0                   	// #0
  36c1ec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c1f0:	97fff514 	bl	0x369640
  36c1f4:	0a160000 	and	w0, w0, w22
  36c1f8:	320f0000 	orr	w0, w0, #0x20000
  36c1fc:	d50332bf 	dmb	oshst
  36c200:	f944ae61 	ldr	x1, [x19, #2392]
  36c204:	91079021 	add	x1, x1, #0x1e4
  36c208:	b9000020 	str	w0, [x1]
  36c20c:	52940000 	mov	w0, #0xa000                	// #40960
  36c210:	52804282 	mov	w2, #0x214                 	// #532
  36c214:	52800001 	mov	w1, #0x0                   	// #0
  36c218:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c21c:	97fff509 	bl	0x369640
  36c220:	52981801 	mov	w1, #0xc0c0                	// #49344
  36c224:	72bff801 	movk	w1, #0xffc0, lsl #16
  36c228:	0a010000 	and	w0, w0, w1
  36c22c:	52832321 	mov	w1, #0x1919                	// #6425
  36c230:	72a00281 	movk	w1, #0x14, lsl #16
  36c234:	2a010000 	orr	w0, w0, w1
  36c238:	d50332bf 	dmb	oshst
  36c23c:	f944ae61 	ldr	x1, [x19, #2392]
  36c240:	91085021 	add	x1, x1, #0x214
  36c244:	b9000020 	str	w0, [x1]
  36c248:	7100075f 	cmp	w26, #0x1
  36c24c:	54000fa0 	b.eq	0x36c440  // b.none
  36c250:	52960000 	mov	w0, #0xb000                	// #45056
  36c254:	52966982 	mov	w2, #0xb34c                	// #45900
  36c258:	52960001 	mov	w1, #0xb000                	// #45056
  36c25c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c260:	97fff4f8 	bl	0x369640
  36c264:	12177800 	and	w0, w0, #0xfffffeff
  36c268:	d50332bf 	dmb	oshst
  36c26c:	f94006a1 	ldr	x1, [x21, #8]
  36c270:	910d3021 	add	x1, x1, #0x34c
  36c274:	b9000020 	str	w0, [x1]
  36c278:	52980000 	mov	w0, #0xc000                	// #49152
  36c27c:	52966982 	mov	w2, #0xb34c                	// #45900
  36c280:	52960001 	mov	w1, #0xb000                	// #45056
  36c284:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c288:	97fff4ee 	bl	0x369640
  36c28c:	12177800 	and	w0, w0, #0xfffffeff
  36c290:	d50332bf 	dmb	oshst
  36c294:	f9400aa1 	ldr	x1, [x21, #16]
  36c298:	910d3021 	add	x1, x1, #0x34c
  36c29c:	b9000020 	str	w0, [x1]
  36c2a0:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36c2a4:	940dd147 	bl	0x6e07c0
  36c2a8:	52960000 	mov	w0, #0xb000                	// #45056
  36c2ac:	52966982 	mov	w2, #0xb34c                	// #45900
  36c2b0:	52960001 	mov	w1, #0xb000                	// #45056
  36c2b4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c2b8:	97fff4e2 	bl	0x369640
  36c2bc:	32180000 	orr	w0, w0, #0x100
  36c2c0:	d50332bf 	dmb	oshst
  36c2c4:	f94006a1 	ldr	x1, [x21, #8]
  36c2c8:	910d3021 	add	x1, x1, #0x34c
  36c2cc:	b9000020 	str	w0, [x1]
  36c2d0:	52980000 	mov	w0, #0xc000                	// #49152
  36c2d4:	52966982 	mov	w2, #0xb34c                	// #45900
  36c2d8:	52960001 	mov	w1, #0xb000                	// #45056
  36c2dc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c2e0:	97fff4d8 	bl	0x369640
  36c2e4:	32180000 	orr	w0, w0, #0x100
  36c2e8:	d50332bf 	dmb	oshst
  36c2ec:	f9400aa1 	ldr	x1, [x21, #16]
  36c2f0:	910d3021 	add	x1, x1, #0x34c
  36c2f4:	b9000020 	str	w0, [x1]
  36c2f8:	d2912b14 	mov	x20, #0x8958                	// #35160
  36c2fc:	d291b780 	mov	x0, #0x8dbc                	// #36284
  36c300:	d2800153 	mov	x19, #0xa                   	// #10
  36c304:	f2a00834 	movk	x20, #0x41, lsl #16
  36c308:	f2a000c0 	movk	x0, #0x6, lsl #16
  36c30c:	940dd12d 	bl	0x6e07c0
  36c310:	aa1403e0 	mov	x0, x20
  36c314:	940dd12b 	bl	0x6e07c0
  36c318:	f1000673 	subs	x19, x19, #0x1
  36c31c:	54ffffa1 	b.ne	0x36c310  // b.any
  36c320:	7100075f 	cmp	w26, #0x1
  36c324:	54000360 	b.eq	0x36c390  // b.none
  36c328:	a94153f3 	ldp	x19, x20, [sp, #16]
  36c32c:	a9425bf5 	ldp	x21, x22, [sp, #32]
  36c330:	a94363f7 	ldp	x23, x24, [sp, #48]
  36c334:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36c338:	a94573fb 	ldp	x27, x28, [sp, #80]
  36c33c:	a8c77bfd 	ldp	x29, x30, [sp], #112
  36c340:	d65f03c0 	ret
  36c344:	97fff4bf 	bl	0x369640
  36c348:	d50332bf 	dmb	oshst
  36c34c:	f0004493 	adrp	x19, 0xbff000
  36c350:	91256275 	add	x21, x19, #0x958
  36c354:	32100000 	orr	w0, w0, #0x10000
  36c358:	f94006a1 	ldr	x1, [x21, #8]
  36c35c:	91230021 	add	x1, x1, #0x8c0
  36c360:	b9000020 	str	w0, [x1]
  36c364:	52980000 	mov	w0, #0xc000                	// #49152
  36c368:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c36c:	52960001 	mov	w1, #0xb000                	// #45056
  36c370:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c374:	97fff4b3 	bl	0x369640
  36c378:	d50332bf 	dmb	oshst
  36c37c:	f9400aa1 	ldr	x1, [x21, #16]
  36c380:	32100000 	orr	w0, w0, #0x10000
  36c384:	91230021 	add	x1, x1, #0x8c0
  36c388:	b9000020 	str	w0, [x1]
  36c38c:	17fff735 	b	0x36a060
  36c390:	f00029b6 	adrp	x22, 0x8a3000
  36c394:	f00029b9 	adrp	x25, 0x8a3000
  36c398:	52960018 	mov	w24, #0xb000                	// #45056
  36c39c:	5298001b 	mov	w27, #0xc000                	// #49152
  36c3a0:	911282d6 	add	x22, x22, #0x4a0
  36c3a4:	91130339 	add	x25, x25, #0x4c0
  36c3a8:	52800013 	mov	w19, #0x0                   	// #0
  36c3ac:	72a3f4b8 	movk	w24, #0x1fa5, lsl #16
  36c3b0:	72a3f4bb 	movk	w27, #0x1fa5, lsl #16
  36c3b4:	530c7e77 	lsr	w23, w19, #12
  36c3b8:	0b18027c 	add	w28, w19, w24
  36c3bc:	528000fa 	mov	w26, #0x7                   	// #7
  36c3c0:	52811882 	mov	w2, #0x8c4                 	// #2244
  36c3c4:	52800001 	mov	w1, #0x0                   	// #0
  36c3c8:	2a1c03e0 	mov	w0, w28
  36c3cc:	97fff49d 	bl	0x369640
  36c3d0:	2a0003f4 	mov	w20, w0
  36c3d4:	2a1703e1 	mov	w1, w23
  36c3d8:	2a1403e2 	mov	w2, w20
  36c3dc:	aa1603e0 	mov	x0, x22
  36c3e0:	97f4ee5c 	bl	0xa7d50
  36c3e4:	2a1c03e0 	mov	w0, w28
  36c3e8:	52802e82 	mov	w2, #0x174                 	// #372
  36c3ec:	52800001 	mov	w1, #0x0                   	// #0
  36c3f0:	97fff494 	bl	0x369640
  36c3f4:	12002800 	and	w0, w0, #0x7ff
  36c3f8:	6b14001f 	cmp	w0, w20
  36c3fc:	540013c1 	b.ne	0x36c674  // b.any
  36c400:	11400673 	add	w19, w19, #0x1, lsl #12
  36c404:	71400a7f 	cmp	w19, #0x2, lsl #12
  36c408:	54fffd61 	b.ne	0x36c3b4  // b.any
  36c40c:	a94153f3 	ldp	x19, x20, [sp, #16]
  36c410:	a9425bf5 	ldp	x21, x22, [sp, #32]
  36c414:	a94363f7 	ldp	x23, x24, [sp, #48]
  36c418:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36c41c:	a94573fb 	ldp	x27, x28, [sp, #80]
  36c420:	a8c77bfd 	ldp	x29, x30, [sp], #112
  36c424:	d65f03c0 	ret
  36c428:	52800060 	mov	w0, #0x3                   	// #3
  36c42c:	9400f8d1 	bl	0x3aa770
  36c430:	72001c1f 	tst	w0, #0xff
  36c434:	1a9f17e0 	cset	w0, eq	// eq = none
  36c438:	b9006be0 	str	w0, [sp, #104]
  36c43c:	17fff6f2 	b	0x36a004
  36c440:	52960000 	mov	w0, #0xb000                	// #45056
  36c444:	52963382 	mov	w2, #0xb19c                	// #45468
  36c448:	52960001 	mov	w1, #0xb000                	// #45056
  36c44c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c450:	97fff47c 	bl	0x369640
  36c454:	32000000 	orr	w0, w0, #0x1
  36c458:	d50332bf 	dmb	oshst
  36c45c:	f94006a1 	ldr	x1, [x21, #8]
  36c460:	91067021 	add	x1, x1, #0x19c
  36c464:	b9000020 	str	w0, [x1]
  36c468:	52980000 	mov	w0, #0xc000                	// #49152
  36c46c:	52963382 	mov	w2, #0xb19c                	// #45468
  36c470:	52960001 	mov	w1, #0xb000                	// #45056
  36c474:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c478:	97fff472 	bl	0x369640
  36c47c:	32000000 	orr	w0, w0, #0x1
  36c480:	d50332bf 	dmb	oshst
  36c484:	f9400aa1 	ldr	x1, [x21, #16]
  36c488:	91067021 	add	x1, x1, #0x19c
  36c48c:	b9000020 	str	w0, [x1]
  36c490:	52960000 	mov	w0, #0xb000                	// #45056
  36c494:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c498:	52960001 	mov	w1, #0xb000                	// #45056
  36c49c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c4a0:	97fff468 	bl	0x369640
  36c4a4:	d50332bf 	dmb	oshst
  36c4a8:	f94006a1 	ldr	x1, [x21, #8]
  36c4ac:	120f7800 	and	w0, w0, #0xfffeffff
  36c4b0:	91230021 	add	x1, x1, #0x8c0
  36c4b4:	b9000020 	str	w0, [x1]
  36c4b8:	52980000 	mov	w0, #0xc000                	// #49152
  36c4bc:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c4c0:	52960001 	mov	w1, #0xb000                	// #45056
  36c4c4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c4c8:	97fff45e 	bl	0x369640
  36c4cc:	d50332bf 	dmb	oshst
  36c4d0:	f9400aa1 	ldr	x1, [x21, #16]
  36c4d4:	120f7800 	and	w0, w0, #0xfffeffff
  36c4d8:	91230021 	add	x1, x1, #0x8c0
  36c4dc:	b9000020 	str	w0, [x1]
  36c4e0:	52960000 	mov	w0, #0xb000                	// #45056
  36c4e4:	52971702 	mov	w2, #0xb8b8                	// #47288
  36c4e8:	52960001 	mov	w1, #0xb000                	// #45056
  36c4ec:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c4f0:	97fff454 	bl	0x369640
  36c4f4:	d50332bf 	dmb	oshst
  36c4f8:	f94006a1 	ldr	x1, [x21, #8]
  36c4fc:	12197000 	and	w0, w0, #0xffffff8f
  36c500:	52801413 	mov	w19, #0xa0                  	// #160
  36c504:	2a130000 	orr	w0, w0, w19
  36c508:	9122e021 	add	x1, x1, #0x8b8
  36c50c:	b9000020 	str	w0, [x1]
  36c510:	52980000 	mov	w0, #0xc000                	// #49152
  36c514:	52971702 	mov	w2, #0xb8b8                	// #47288
  36c518:	52960001 	mov	w1, #0xb000                	// #45056
  36c51c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c520:	97fff448 	bl	0x369640
  36c524:	d50332bf 	dmb	oshst
  36c528:	f9400aa1 	ldr	x1, [x21, #16]
  36c52c:	12197000 	and	w0, w0, #0xffffff8f
  36c530:	2a130000 	orr	w0, w0, w19
  36c534:	9122e021 	add	x1, x1, #0x8b8
  36c538:	b9000020 	str	w0, [x1]
  36c53c:	52800001 	mov	w1, #0x0                   	// #0
  36c540:	52800060 	mov	w0, #0x3                   	// #3
  36c544:	97fff4e3 	bl	0x3698d0
  36c548:	2a1a03e1 	mov	w1, w26
  36c54c:	52800060 	mov	w0, #0x3                   	// #3
  36c550:	97fff4e0 	bl	0x3698d0
  36c554:	52960000 	mov	w0, #0xb000                	// #45056
  36c558:	52971702 	mov	w2, #0xb8b8                	// #47288
  36c55c:	52960001 	mov	w1, #0xb000                	// #45056
  36c560:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c564:	97fff437 	bl	0x369640
  36c568:	d50332bf 	dmb	oshst
  36c56c:	f94006a1 	ldr	x1, [x21, #8]
  36c570:	12186c00 	and	w0, w0, #0xffffff0f
  36c574:	9122e021 	add	x1, x1, #0x8b8
  36c578:	b9000020 	str	w0, [x1]
  36c57c:	52980000 	mov	w0, #0xc000                	// #49152
  36c580:	52971702 	mov	w2, #0xb8b8                	// #47288
  36c584:	52960001 	mov	w1, #0xb000                	// #45056
  36c588:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c58c:	97fff42d 	bl	0x369640
  36c590:	d50332bf 	dmb	oshst
  36c594:	f9400aa1 	ldr	x1, [x21, #16]
  36c598:	12186c00 	and	w0, w0, #0xffffff0f
  36c59c:	9122e021 	add	x1, x1, #0x8b8
  36c5a0:	b9000020 	str	w0, [x1]
  36c5a4:	d291b780 	mov	x0, #0x8dbc                	// #36284
  36c5a8:	f2a000c0 	movk	x0, #0x6, lsl #16
  36c5ac:	940dd085 	bl	0x6e07c0
  36c5b0:	52800001 	mov	w1, #0x0                   	// #0
  36c5b4:	52800040 	mov	w0, #0x2                   	// #2
  36c5b8:	97fff4c6 	bl	0x3698d0
  36c5bc:	2a1a03e1 	mov	w1, w26
  36c5c0:	52800040 	mov	w0, #0x2                   	// #2
  36c5c4:	97fff4c3 	bl	0x3698d0
  36c5c8:	52960000 	mov	w0, #0xb000                	// #45056
  36c5cc:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c5d0:	52960001 	mov	w1, #0xb000                	// #45056
  36c5d4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c5d8:	97fff41a 	bl	0x369640
  36c5dc:	d50332bf 	dmb	oshst
  36c5e0:	f94006a1 	ldr	x1, [x21, #8]
  36c5e4:	120b7800 	and	w0, w0, #0xffefffff
  36c5e8:	91230021 	add	x1, x1, #0x8c0
  36c5ec:	b9000020 	str	w0, [x1]
  36c5f0:	52980000 	mov	w0, #0xc000                	// #49152
  36c5f4:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c5f8:	52960001 	mov	w1, #0xb000                	// #45056
  36c5fc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c600:	97fff410 	bl	0x369640
  36c604:	d50332bf 	dmb	oshst
  36c608:	f9400aa1 	ldr	x1, [x21, #16]
  36c60c:	120b7800 	and	w0, w0, #0xffefffff
  36c610:	91230021 	add	x1, x1, #0x8c0
  36c614:	b9000020 	str	w0, [x1]
  36c618:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36c61c:	940dd069 	bl	0x6e07c0
  36c620:	52960000 	mov	w0, #0xb000                	// #45056
  36c624:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c628:	52960001 	mov	w1, #0xb000                	// #45056
  36c62c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c630:	97fff404 	bl	0x369640
  36c634:	d50332bf 	dmb	oshst
  36c638:	f94006a1 	ldr	x1, [x21, #8]
  36c63c:	320c0000 	orr	w0, w0, #0x100000
  36c640:	91230021 	add	x1, x1, #0x8c0
  36c644:	b9000020 	str	w0, [x1]
  36c648:	52980000 	mov	w0, #0xc000                	// #49152
  36c64c:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c650:	52960001 	mov	w1, #0xb000                	// #45056
  36c654:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  36c658:	97fff3fa 	bl	0x369640
  36c65c:	d50332bf 	dmb	oshst
  36c660:	f9400aa1 	ldr	x1, [x21, #16]
  36c664:	320c0000 	orr	w0, w0, #0x100000
  36c668:	91230021 	add	x1, x1, #0x8c0
  36c66c:	b9000020 	str	w0, [x1]
  36c670:	17fffef8 	b	0x36c250
  36c674:	2a1b03e0 	mov	w0, w27
  36c678:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c67c:	52960001 	mov	w1, #0xb000                	// #45056
  36c680:	34000273 	cbz	w19, 0x36c6cc
  36c684:	97fff3ef 	bl	0x369640
  36c688:	d50332bf 	dmb	oshst
  36c68c:	f9400aa1 	ldr	x1, [x21, #16]
  36c690:	120b7800 	and	w0, w0, #0xffefffff
  36c694:	91230021 	add	x1, x1, #0x8c0
  36c698:	b9000020 	str	w0, [x1]
  36c69c:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36c6a0:	940dd048 	bl	0x6e07c0
  36c6a4:	2a1b03e0 	mov	w0, w27
  36c6a8:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c6ac:	52960001 	mov	w1, #0xb000                	// #45056
  36c6b0:	97fff3e4 	bl	0x369640
  36c6b4:	d50332bf 	dmb	oshst
  36c6b8:	f9400aa1 	ldr	x1, [x21, #16]
  36c6bc:	320c0000 	orr	w0, w0, #0x100000
  36c6c0:	91230021 	add	x1, x1, #0x8c0
  36c6c4:	b9000020 	str	w0, [x1]
  36c6c8:	14000013 	b	0x36c714
  36c6cc:	2a1803e0 	mov	w0, w24
  36c6d0:	97fff3dc 	bl	0x369640
  36c6d4:	d50332bf 	dmb	oshst
  36c6d8:	f94006a1 	ldr	x1, [x21, #8]
  36c6dc:	120b7800 	and	w0, w0, #0xffefffff
  36c6e0:	91230021 	add	x1, x1, #0x8c0
  36c6e4:	b9000020 	str	w0, [x1]
  36c6e8:	d294f8c0 	mov	x0, #0xa7c6                	// #42950
  36c6ec:	940dd035 	bl	0x6e07c0
  36c6f0:	2a1803e0 	mov	w0, w24
  36c6f4:	52971802 	mov	w2, #0xb8c0                	// #47296
  36c6f8:	52960001 	mov	w1, #0xb000                	// #45056
  36c6fc:	97fff3d1 	bl	0x369640
  36c700:	d50332bf 	dmb	oshst
  36c704:	f94006a1 	ldr	x1, [x21, #8]
  36c708:	320c0000 	orr	w0, w0, #0x100000
  36c70c:	91230021 	add	x1, x1, #0x8c0
  36c710:	b9000020 	str	w0, [x1]
  36c714:	2a1703e1 	mov	w1, w23
  36c718:	aa1903e0 	mov	x0, x25
  36c71c:	97f4ed8d 	bl	0xa7d50
  36c720:	7100075a 	subs	w26, w26, #0x1
  36c724:	54ffe6e0 	b.eq	0x36c400  // b.none
  36c728:	17ffff26 	b	0x36c3c0
  36c72c:	d503201f 	nop
