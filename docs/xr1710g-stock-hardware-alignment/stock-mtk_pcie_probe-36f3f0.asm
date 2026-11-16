
/mnt/f/openwrt/research/wifi6-public-references-20261108/stock-5.1.1.12-extracted/stock-kernel.uncompressed.bin:     file format binary


Disassembly of section .data:

000000000036f3f0 <.data+0x36f3f0>:
  36f3f0:	a9b87bfd 	stp	x29, x30, [sp, #-128]!
  36f3f4:	910003fd 	mov	x29, sp
  36f3f8:	a90153f3 	stp	x19, x20, [sp, #16]
  36f3fc:	91004014 	add	x20, x0, #0x10
  36f400:	94000608 	bl	0x370c20
  36f404:	97f3398b 	bl	0x3da30
  36f408:	34001ca0 	cbz	w0, 0x36f79c
  36f40c:	aa1403e0 	mov	x0, x20
  36f410:	d2802801 	mov	x1, #0x140                 	// #320
  36f414:	97ff6af8 	bl	0x349ff4
  36f418:	aa0003f3 	mov	x19, x0
  36f41c:	b40019a0 	cbz	x0, 0x36f750
  36f420:	a9025bf5 	stp	x21, x22, [sp, #32]
  36f424:	910e0015 	add	x21, x0, #0x380
  36f428:	9101e3e2 	add	x2, sp, #0x78
  36f42c:	a90363f7 	stp	x23, x24, [sp, #48]
  36f430:	f901c014 	str	x20, [x0, #896]
  36f434:	f9003e95 	str	x21, [x20, #120]
  36f438:	910bc014 	add	x20, x0, #0x2f0
  36f43c:	aa1403e1 	mov	x1, x20
  36f440:	f941c000 	ldr	x0, [x0, #896]
  36f444:	97ffc9d4 	bl	0x361b94
  36f448:	340004a0 	cbz	w0, 0x36f4dc
  36f44c:	90004497 	adrp	x23, 0xbff000
  36f450:	912742f7 	add	x23, x23, #0x9d0
  36f454:	97f33977 	bl	0x3da30
  36f458:	35001800 	cbnz	w0, 0x36f758
  36f45c:	b9401aa3 	ldr	w3, [x21, #24]
  36f460:	d00041e0 	adrp	x0, 0xbad000
  36f464:	f941c264 	ldr	x4, [x19, #896]
  36f468:	91224000 	add	x0, x0, #0x890
  36f46c:	d0ffff81 	adrp	x1, 0x361000
  36f470:	b0ffff02 	adrp	x2, 0x350000
  36f474:	911b9021 	add	x1, x1, #0x6e4
  36f478:	91184042 	add	x2, x2, #0x610
  36f47c:	91030000 	add	x0, x0, #0xc0
  36f480:	f9002264 	str	x4, [x19, #64]
  36f484:	f9016e60 	str	x0, [x19, #728]
  36f488:	aa1303e0 	mov	x0, x19
  36f48c:	f9017275 	str	x21, [x19, #736]
  36f490:	b902ea63 	str	w3, [x19, #744]
  36f494:	f9018a62 	str	x2, [x19, #784]
  36f498:	f9018e61 	str	x1, [x19, #792]
  36f49c:	97ff7852 	bl	0x34d5e4
  36f4a0:	2a0003f3 	mov	w19, w0
  36f4a4:	b94036e1 	ldr	w1, [x23, #52]
  36f4a8:	340009a1 	cbz	w1, 0x36f5dc
  36f4ac:	7100043f 	cmp	w1, #0x1
  36f4b0:	54001260 	b.eq	0x36f6fc  // b.none
  36f4b4:	7100083f 	cmp	w1, #0x2
  36f4b8:	54000f80 	b.eq	0x36f6a8  // b.none
  36f4bc:	35000c93 	cbnz	w19, 0x36f64c
  36f4c0:	a9425bf5 	ldp	x21, x22, [sp, #32]
  36f4c4:	52800013 	mov	w19, #0x0                   	// #0
  36f4c8:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f4cc:	2a1303e0 	mov	w0, w19
  36f4d0:	a94153f3 	ldp	x19, x20, [sp, #16]
  36f4d4:	a8c87bfd 	ldp	x29, x30, [sp], #128
  36f4d8:	d65f03c0 	ret
  36f4dc:	f9403fe0 	ldr	x0, [sp, #120]
  36f4e0:	900029a2 	adrp	x2, 0x8a3000
  36f4e4:	912c4042 	add	x2, x2, #0xb10
  36f4e8:	52804001 	mov	w1, #0x200                 	// #512
  36f4ec:	f9400000 	ldr	x0, [x0]
  36f4f0:	b9001aa0 	str	w0, [x21, #24]
  36f4f4:	f941c277 	ldr	x23, [x19, #896]
  36f4f8:	d10042e0 	sub	x0, x23, #0x10
  36f4fc:	94013361 	bl	0x3bc280
  36f500:	aa0003f6 	mov	x22, x0
  36f504:	aa1703e0 	mov	x0, x23
  36f508:	aa1603e1 	mov	x1, x22
  36f50c:	97fed49d 	bl	0x324780
  36f510:	f90006a0 	str	x0, [x21, #8]
  36f514:	b140041f 	cmn	x0, #0x1, lsl #12
  36f518:	540016a9 	b.ls	0x36f7ec  // b.plast
  36f51c:	aa1703e0 	mov	x0, x23
  36f520:	900029a1 	adrp	x1, 0x8a3000
  36f524:	912c8021 	add	x1, x1, #0xb20
  36f528:	94012211 	bl	0x3b7d6c
  36f52c:	f94006a0 	ldr	x0, [x21, #8]
  36f530:	90004497 	adrp	x23, 0xbff000
  36f534:	912742f7 	add	x23, x23, #0x9d0
  36f538:	35fff8e0 	cbnz	w0, 0x36f454
  36f53c:	b94036e0 	ldr	w0, [x23, #52]
  36f540:	34002880 	cbz	w0, 0x36fa50
  36f544:	f94006a0 	ldr	x0, [x21, #8]
  36f548:	91020002 	add	x2, x0, #0x80
  36f54c:	b9400041 	ldr	w1, [x2]
  36f550:	32000021 	orr	w1, w1, #0x1
  36f554:	b9000041 	str	w1, [x2]
  36f558:	91027002 	add	x2, x0, #0x9c
  36f55c:	b9400041 	ldr	w1, [x2]
  36f560:	12001c21 	and	w1, w1, #0xff
  36f564:	52a0c083 	mov	w3, #0x6040000             	// #100925440
  36f568:	2a030021 	orr	w1, w1, w3
  36f56c:	b9000041 	str	w1, [x2]
  36f570:	91060002 	add	x2, x0, #0x180
  36f574:	b9400041 	ldr	w1, [x2]
  36f578:	32080c21 	orr	w1, w1, #0xf000000
  36f57c:	b9000041 	str	w1, [x2]
  36f580:	9106b000 	add	x0, x0, #0x1ac
  36f584:	b9400001 	ldr	w1, [x0]
  36f588:	321d0021 	orr	w1, w1, #0x8
  36f58c:	b9000001 	str	w1, [x0]
  36f590:	97f55bd0 	bl	0xc64d0
  36f594:	d29c2001 	mov	x1, #0xe100                	// #57600
  36f598:	f2a0bea1 	movk	x1, #0x5f5, lsl #16
  36f59c:	8b010016 	add	x22, x0, x1
  36f5a0:	f94006a0 	ldr	x0, [x21, #8]
  36f5a4:	91055000 	add	x0, x0, #0x154
  36f5a8:	b9400000 	ldr	w0, [x0]
  36f5ac:	d50331bf 	dmb	oshld
  36f5b0:	2a0003e1 	mov	w1, w0
  36f5b4:	ca010021 	eor	x1, x1, x1
  36f5b8:	b5000001 	cbnz	x1, 0x36f5b8
  36f5bc:	37403260 	tbnz	w0, #8, 0x36fc08
  36f5c0:	97f55bc4 	bl	0xc64d0
  36f5c4:	eb0002df 	cmp	x22, x0
  36f5c8:	5400310b 	b.lt	0x36fbe8  // b.tstop
  36f5cc:	d2800281 	mov	x1, #0x14                  	// #20
  36f5d0:	d28000c0 	mov	x0, #0x6                   	// #6
  36f5d4:	940e3adf 	bl	0x6fe150
  36f5d8:	17fffff2 	b	0x36f5a0
  36f5dc:	f9400ee0 	ldr	x0, [x23, #24]
  36f5e0:	52a003e1 	mov	w1, #0x1f0000              	// #2031616
  36f5e4:	91050002 	add	x2, x0, #0x140
  36f5e8:	b9000041 	str	w1, [x2]
  36f5ec:	d2820783 	mov	x3, #0x103c                	// #4156
  36f5f0:	8b030000 	add	x0, x0, x3
  36f5f4:	b9400000 	ldr	w0, [x0]
  36f5f8:	d50331bf 	dmb	oshld
  36f5fc:	2a0003e2 	mov	w2, w0
  36f600:	ca020042 	eor	x2, x2, x2
  36f604:	b5000002 	cbnz	x2, 0x36f604
  36f608:	f9400ee2 	ldr	x2, [x23, #24]
  36f60c:	b9401ea5 	ldr	w5, [x21, #28]
  36f610:	91050044 	add	x4, x2, #0x140
  36f614:	2a050000 	orr	w0, w0, w5
  36f618:	b9000081 	str	w1, [x4]
  36f61c:	d50332bf 	dmb	oshst
  36f620:	8b030042 	add	x2, x2, x3
  36f624:	b9000040 	str	w0, [x2]
  36f628:	f9400ee1 	ldr	x1, [x23, #24]
  36f62c:	52802002 	mov	w2, #0x100                 	// #256
  36f630:	91050024 	add	x4, x1, #0x140
  36f634:	72a003e2 	movk	w2, #0x1f, lsl #16
  36f638:	b9000082 	str	w2, [x4]
  36f63c:	d50332bf 	dmb	oshst
  36f640:	8b030021 	add	x1, x1, x3
  36f644:	b9000020 	str	w0, [x1]
  36f648:	34fff3d3 	cbz	w19, 0x36f4c0
  36f64c:	b9401ea0 	ldr	w0, [x21, #28]
  36f650:	d2800002 	mov	x2, #0x0                   	// #0
  36f654:	d2800001 	mov	x1, #0x0                   	// #0
  36f658:	97f4fe17 	bl	0xaeeb4
  36f65c:	f94016a0 	ldr	x0, [x21, #40]
  36f660:	b4000040 	cbz	x0, 0x36f668
  36f664:	97f503c0 	bl	0xb0564
  36f668:	f9401aa0 	ldr	x0, [x21, #48]
  36f66c:	b4000040 	cbz	x0, 0x36f674
  36f670:	97f503bd 	bl	0xb0564
  36f674:	f9401ea0 	ldr	x0, [x21, #56]
  36f678:	b4000040 	cbz	x0, 0x36f680
  36f67c:	97f503ba 	bl	0xb0564
  36f680:	b9401ea0 	ldr	w0, [x21, #28]
  36f684:	97f50aeb 	bl	0xb2230
  36f688:	aa1403e0 	mov	x0, x20
  36f68c:	97ff67d2 	bl	0x3495d4
  36f690:	2a1303e0 	mov	w0, w19
  36f694:	a94153f3 	ldp	x19, x20, [sp, #16]
  36f698:	a9425bf5 	ldp	x21, x22, [sp, #32]
  36f69c:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f6a0:	a8c87bfd 	ldp	x29, x30, [sp], #128
  36f6a4:	d65f03c0 	ret
  36f6a8:	f94016e0 	ldr	x0, [x23, #40]
  36f6ac:	52a003e1 	mov	w1, #0x1f0000              	// #2031616
  36f6b0:	91050002 	add	x2, x0, #0x140
  36f6b4:	b9000041 	str	w1, [x2]
  36f6b8:	d2820783 	mov	x3, #0x103c                	// #4156
  36f6bc:	8b030000 	add	x0, x0, x3
  36f6c0:	b9400000 	ldr	w0, [x0]
  36f6c4:	d50331bf 	dmb	oshld
  36f6c8:	2a0003e2 	mov	w2, w0
  36f6cc:	ca020042 	eor	x2, x2, x2
  36f6d0:	b5000002 	cbnz	x2, 0x36f6d0
  36f6d4:	f94016e2 	ldr	x2, [x23, #40]
  36f6d8:	b9401ea5 	ldr	w5, [x21, #28]
  36f6dc:	91050044 	add	x4, x2, #0x140
  36f6e0:	2a050000 	orr	w0, w0, w5
  36f6e4:	b9000081 	str	w1, [x4]
  36f6e8:	d50332bf 	dmb	oshst
  36f6ec:	8b030042 	add	x2, x2, x3
  36f6f0:	b9000040 	str	w0, [x2]
  36f6f4:	f94016e1 	ldr	x1, [x23, #40]
  36f6f8:	17ffffcd 	b	0x36f62c
  36f6fc:	f94012e0 	ldr	x0, [x23, #32]
  36f700:	52a003e1 	mov	w1, #0x1f0000              	// #2031616
  36f704:	91050002 	add	x2, x0, #0x140
  36f708:	b9000041 	str	w1, [x2]
  36f70c:	d2820783 	mov	x3, #0x103c                	// #4156
  36f710:	8b030000 	add	x0, x0, x3
  36f714:	b9400000 	ldr	w0, [x0]
  36f718:	d50331bf 	dmb	oshld
  36f71c:	2a0003e2 	mov	w2, w0
  36f720:	ca020042 	eor	x2, x2, x2
  36f724:	b5000002 	cbnz	x2, 0x36f724
  36f728:	f94012e2 	ldr	x2, [x23, #32]
  36f72c:	b9401ea5 	ldr	w5, [x21, #28]
  36f730:	91050044 	add	x4, x2, #0x140
  36f734:	2a050000 	orr	w0, w0, w5
  36f738:	b9000081 	str	w1, [x4]
  36f73c:	d50332bf 	dmb	oshst
  36f740:	8b030042 	add	x2, x2, x3
  36f744:	b9000040 	str	w0, [x2]
  36f748:	f94012e1 	ldr	x1, [x23, #32]
  36f74c:	17ffffb8 	b	0x36f62c
  36f750:	12800173 	mov	w19, #0xfffffff4            	// #-12
  36f754:	17ffff5e 	b	0x36f4cc
  36f758:	d50332bf 	dmb	oshst
  36f75c:	f9400ee0 	ldr	x0, [x23, #24]
  36f760:	52a003e1 	mov	w1, #0x1f0000              	// #2031616
  36f764:	91050000 	add	x0, x0, #0x140
  36f768:	b9000001 	str	w1, [x0]
  36f76c:	52820000 	mov	w0, #0x1000                	// #4096
  36f770:	97fffc08 	bl	0x36e790
  36f774:	900029a1 	adrp	x1, 0x8a3000
  36f778:	2a0003f6 	mov	w22, w0
  36f77c:	913bc020 	add	x0, x1, #0xef0
  36f780:	2a1603e1 	mov	w1, w22
  36f784:	97f4e173 	bl	0xa7d50
  36f788:	52829860 	mov	w0, #0x14c3                	// #5315
  36f78c:	72ad1320 	movk	w0, #0x6899, lsl #16
  36f790:	6b0002df 	cmp	w22, w0
  36f794:	54ffe640 	b.eq	0x36f45c  // b.none
  36f798:	17ffff4a 	b	0x36f4c0
  36f79c:	a90363f7 	stp	x23, x24, [sp, #48]
  36f7a0:	90004497 	adrp	x23, 0xbff000
  36f7a4:	912742f7 	add	x23, x23, #0x9d0
  36f7a8:	900029a0 	adrp	x0, 0x8a3000
  36f7ac:	912aa000 	add	x0, x0, #0xaa8
  36f7b0:	b94032e1 	ldr	w1, [x23, #48]
  36f7b4:	97f4e167 	bl	0xa7d50
  36f7b8:	97f33832 	bl	0x3d880
  36f7bc:	7100381f 	cmp	w0, #0xe
  36f7c0:	54000721 	b.ne	0x36f8a4  // b.any
  36f7c4:	97f338cb 	bl	0x3daf0
  36f7c8:	71000c1f 	cmp	w0, #0x3
  36f7cc:	540006c1 	b.ne	0x36f8a4  // b.any
  36f7d0:	97f3382c 	bl	0x3d880
  36f7d4:	7100381f 	cmp	w0, #0xe
  36f7d8:	54000721 	b.ne	0x36f8bc  // b.any
  36f7dc:	97f338c5 	bl	0x3daf0
  36f7e0:	52800033 	mov	w19, #0x1                   	// #1
  36f7e4:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f7e8:	17ffff39 	b	0x36f4cc
  36f7ec:	90004497 	adrp	x23, 0xbff000
  36f7f0:	912742f7 	add	x23, x23, #0x9d0
  36f7f4:	f94002c2 	ldr	x2, [x22]
  36f7f8:	f9000aa2 	str	x2, [x21, #16]
  36f7fc:	b94036e1 	ldr	w1, [x23, #52]
  36f800:	900029a0 	adrp	x0, 0x8a3000
  36f804:	912d0000 	add	x0, x0, #0xb40
  36f808:	97f4e152 	bl	0xa7d50
  36f80c:	f9400aa2 	ldr	x2, [x21, #16]
  36f810:	d2a3f801 	mov	x1, #0x1fc00000            	// #532676608
  36f814:	92703c40 	and	x0, x2, #0xffff0000
  36f818:	eb01001f 	cmp	x0, x1
  36f81c:	54000261 	b.ne	0x36f868  // b.any
  36f820:	b90036ff 	str	wzr, [x23, #52]
  36f824:	b94036e1 	ldr	w1, [x23, #52]
  36f828:	900029a0 	adrp	x0, 0x8a3000
  36f82c:	912e2000 	add	x0, x0, #0xb88
  36f830:	97f4e148 	bl	0xa7d50
  36f834:	b94036e0 	ldr	w0, [x23, #52]
  36f838:	7100081f 	cmp	w0, #0x2
  36f83c:	540002e0 	b.eq	0x36f898  // b.none
  36f840:	5400008c 	b.gt	0x36f850
  36f844:	34001cc0 	cbz	w0, 0x36fbdc
  36f848:	7100041f 	cmp	w0, #0x1
  36f84c:	540023a0 	b.eq	0x36fcc0  // b.none
  36f850:	a9418ae1 	ldp	x1, x2, [x23, #24]
  36f854:	900029a0 	adrp	x0, 0x8a3000
  36f858:	f94016e3 	ldr	x3, [x23, #40]
  36f85c:	912f4000 	add	x0, x0, #0xbd0
  36f860:	97f4e13c 	bl	0xa7d50
  36f864:	17ffff36 	b	0x36f53c
  36f868:	d2a3f841 	mov	x1, #0x1fc20000            	// #532807680
  36f86c:	eb01001f 	cmp	x0, x1
  36f870:	54000081 	b.ne	0x36f880  // b.any
  36f874:	52800020 	mov	w0, #0x1                   	// #1
  36f878:	b90036e0 	str	w0, [x23, #52]
  36f87c:	17ffffea 	b	0x36f824
  36f880:	d2a3f881 	mov	x1, #0x1fc40000            	// #532938752
  36f884:	eb01001f 	cmp	x0, x1
  36f888:	54fffce1 	b.ne	0x36f824  // b.any
  36f88c:	52800040 	mov	w0, #0x2                   	// #2
  36f890:	b90036e0 	str	w0, [x23, #52]
  36f894:	17ffffe4 	b	0x36f824
  36f898:	f94006a0 	ldr	x0, [x21, #8]
  36f89c:	f90016e0 	str	x0, [x23, #40]
  36f8a0:	17ffffec 	b	0x36f850
  36f8a4:	97f337f7 	bl	0x3d880
  36f8a8:	7100381f 	cmp	w0, #0xe
  36f8ac:	540000e1 	b.ne	0x36f8c8  // b.any
  36f8b0:	97f33890 	bl	0x3daf0
  36f8b4:	7100341f 	cmp	w0, #0xd
  36f8b8:	54000081 	b.ne	0x36f8c8  // b.any
  36f8bc:	52800033 	mov	w19, #0x1                   	// #1
  36f8c0:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f8c4:	17ffff02 	b	0x36f4cc
  36f8c8:	97f337ee 	bl	0x3d880
  36f8cc:	7100381f 	cmp	w0, #0xe
  36f8d0:	54000081 	b.ne	0x36f8e0  // b.any
  36f8d4:	97f33887 	bl	0x3daf0
  36f8d8:	7100241f 	cmp	w0, #0x9
  36f8dc:	54ffff00 	b.eq	0x36f8bc  // b.none
  36f8e0:	97f337e8 	bl	0x3d880
  36f8e4:	7100381f 	cmp	w0, #0xe
  36f8e8:	54000081 	b.ne	0x36f8f8  // b.any
  36f8ec:	97f33881 	bl	0x3daf0
  36f8f0:	7100181f 	cmp	w0, #0x6
  36f8f4:	54fffe40 	b.eq	0x36f8bc  // b.none
  36f8f8:	b94032e0 	ldr	w0, [x23, #48]
  36f8fc:	7100081f 	cmp	w0, #0x2
  36f900:	540001e0 	b.eq	0x36f93c  // b.none
  36f904:	5400008c 	b.gt	0x36f914
  36f908:	340006a0 	cbz	w0, 0x36f9dc
  36f90c:	7100041f 	cmp	w0, #0x1
  36f910:	54000300 	b.eq	0x36f970  // b.none
  36f914:	900029a0 	adrp	x0, 0x8a3000
  36f918:	913cc000 	add	x0, x0, #0xf30
  36f91c:	52800002 	mov	w2, #0x0                   	// #0
  36f920:	52800001 	mov	w1, #0x0                   	// #0
  36f924:	97f4e10b 	bl	0xa7d50
  36f928:	b94032e0 	ldr	w0, [x23, #48]
  36f92c:	11000400 	add	w0, w0, #0x1
  36f930:	b90032e0 	str	w0, [x23, #48]
  36f934:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f938:	17fffeb5 	b	0x36f40c
  36f93c:	528000a0 	mov	w0, #0x5                   	// #5
  36f940:	9400eb8c 	bl	0x3aa770
  36f944:	12001c13 	and	w19, w0, #0xff
  36f948:	7100067f 	cmp	w19, #0x1
  36f94c:	54000321 	b.ne	0x36f9b0  // b.any
  36f950:	97f33730 	bl	0x3d610
  36f954:	121c7800 	and	w0, w0, #0xfffffff7
  36f958:	97f3358e 	bl	0x3cf90
  36f95c:	900029a0 	adrp	x0, 0x8a3000
  36f960:	2a1303e1 	mov	w1, w19
  36f964:	913cc000 	add	x0, x0, #0xf30
  36f968:	52800002 	mov	w2, #0x0                   	// #0
  36f96c:	17ffffee 	b	0x36f924
  36f970:	52800060 	mov	w0, #0x3                   	// #3
  36f974:	9400eb7f 	bl	0x3aa770
  36f978:	72001c13 	ands	w19, w0, #0xff
  36f97c:	540005a0 	b.eq	0x36fa30  // b.none
  36f980:	7100067f 	cmp	w19, #0x1
  36f984:	54000161 	b.ne	0x36f9b0  // b.any
  36f988:	97f33722 	bl	0x3d610
  36f98c:	12137400 	and	w0, w0, #0xffffe7ff
  36f990:	97f33580 	bl	0x3cf90
  36f994:	97f3375b 	bl	0x3d700
  36f998:	12000400 	and	w0, w0, #0x3
  36f99c:	71000c1f 	cmp	w0, #0x3
  36f9a0:	54fffde0 	b.eq	0x36f95c  // b.none
  36f9a4:	900029a0 	adrp	x0, 0x8a3000
  36f9a8:	912b8000 	add	x0, x0, #0xae0
  36f9ac:	97f4e0e9 	bl	0xa7d50
  36f9b0:	2a1303e1 	mov	w1, w19
  36f9b4:	900029a0 	adrp	x0, 0x8a3000
  36f9b8:	52800022 	mov	w2, #0x1                   	// #1
  36f9bc:	913cc000 	add	x0, x0, #0xf30
  36f9c0:	97f4e0e4 	bl	0xa7d50
  36f9c4:	52800033 	mov	w19, #0x1                   	// #1
  36f9c8:	b94032e0 	ldr	w0, [x23, #48]
  36f9cc:	0b130000 	add	w0, w0, w19
  36f9d0:	b90032e0 	str	w0, [x23, #48]
  36f9d4:	a94363f7 	ldp	x23, x24, [sp, #48]
  36f9d8:	17fffebd 	b	0x36f4cc
  36f9dc:	52800040 	mov	w0, #0x2                   	// #2
  36f9e0:	9400eb64 	bl	0x3aa770
  36f9e4:	72001c13 	ands	w19, w0, #0xff
  36f9e8:	54000121 	b.ne	0x36fa0c  // b.any
  36f9ec:	97f33709 	bl	0x3d610
  36f9f0:	12117400 	and	w0, w0, #0xffff9fff
  36f9f4:	97f33567 	bl	0x3cf90
  36f9f8:	97f33742 	bl	0x3d700
  36f9fc:	121e7400 	and	w0, w0, #0xfffffffc
  36fa00:	321f0000 	orr	w0, w0, #0x2
  36fa04:	97f33553 	bl	0x3cf50
  36fa08:	17ffffd5 	b	0x36f95c
  36fa0c:	7100067f 	cmp	w19, #0x1
  36fa10:	54fffd01 	b.ne	0x36f9b0  // b.any
  36fa14:	97f336ff 	bl	0x3d610
  36fa18:	12117400 	and	w0, w0, #0xffff9fff
  36fa1c:	97f3355d 	bl	0x3cf90
  36fa20:	97f33738 	bl	0x3d700
  36fa24:	32000400 	orr	w0, w0, #0x3
  36fa28:	97f3354a 	bl	0x3cf50
  36fa2c:	17ffffcc 	b	0x36f95c
  36fa30:	97f336f8 	bl	0x3d610
  36fa34:	12137400 	and	w0, w0, #0xffffe7ff
  36fa38:	97f33556 	bl	0x3cf90
  36fa3c:	97f33731 	bl	0x3d700
  36fa40:	12000400 	and	w0, w0, #0x3
  36fa44:	7100081f 	cmp	w0, #0x2
  36fa48:	54fffae1 	b.ne	0x36f9a4  // b.any
  36fa4c:	17ffffc4 	b	0x36f95c
  36fa50:	900029a0 	adrp	x0, 0x8a3000
  36fa54:	91306000 	add	x0, x0, #0xc18
  36fa58:	a9046bf9 	stp	x25, x26, [sp, #64]
  36fa5c:	900029ba 	adrp	x26, 0x8a3000
  36fa60:	9132635a 	add	x26, x26, #0xc98
  36fa64:	a90573fb 	stp	x27, x28, [sp, #80]
  36fa68:	97f4e0ba 	bl	0xa7d50
  36fa6c:	900029bc 	adrp	x28, 0x8a3000
  36fa70:	97f37410 	bl	0x4cab0
  36fa74:	9130e39c 	add	x28, x28, #0xc38
  36fa78:	2a0003e1 	mov	w1, w0
  36fa7c:	aa1c03e0 	mov	x0, x28
  36fa80:	97f4e0b4 	bl	0xa7d50
  36fa84:	900029bb 	adrp	x27, 0x8a3000
  36fa88:	52a40000 	mov	w0, #0x20000000            	// #536870912
  36fa8c:	9131a37b 	add	x27, x27, #0xc68
  36fa90:	97f37218 	bl	0x4c2f0
  36fa94:	900029b9 	adrp	x25, 0x8a3000
  36fa98:	97f3741a 	bl	0x4cb00
  36fa9c:	2a0003e1 	mov	w1, w0
  36faa0:	aa1b03e0 	mov	x0, x27
  36faa4:	97f4e0ab 	bl	0xa7d50
  36faa8:	52a48000 	mov	w0, #0x24000000            	// #603979776
  36faac:	91332339 	add	x25, x25, #0xcc8
  36fab0:	97f37220 	bl	0x4c330
  36fab4:	900029b8 	adrp	x24, 0x8a3000
  36fab8:	97f3742a 	bl	0x4cb60
  36fabc:	2a0003e1 	mov	w1, w0
  36fac0:	aa1a03e0 	mov	x0, x26
  36fac4:	97f4e0a3 	bl	0xa7d50
  36fac8:	52a50000 	mov	w0, #0x28000000            	// #671088640
  36facc:	9133e318 	add	x24, x24, #0xcf8
  36fad0:	97f37228 	bl	0x4c370
  36fad4:	900029b6 	adrp	x22, 0x8a3000
  36fad8:	97f373de 	bl	0x4ca50
  36fadc:	2a0003e1 	mov	w1, w0
  36fae0:	aa1903e0 	mov	x0, x25
  36fae4:	97f4e09b 	bl	0xa7d50
  36fae8:	52bf8000 	mov	w0, #0xfc000000            	// #-67108864
  36faec:	9134a2d6 	add	x22, x22, #0xd28
  36faf0:	97f37208 	bl	0x4c310
  36faf4:	97f3740f 	bl	0x4cb30
  36faf8:	2a0003e1 	mov	w1, w0
  36fafc:	aa1803e0 	mov	x0, x24
  36fb00:	97f4e094 	bl	0xa7d50
  36fb04:	52bf8000 	mov	w0, #0xfc000000            	// #-67108864
  36fb08:	97f37212 	bl	0x4c350
  36fb0c:	97f373f2 	bl	0x4cad4
  36fb10:	2a0003e1 	mov	w1, w0
  36fb14:	aa1603e0 	mov	x0, x22
  36fb18:	97f4e08e 	bl	0xa7d50
  36fb1c:	52bf8000 	mov	w0, #0xfc000000            	// #-67108864
  36fb20:	97f3721c 	bl	0x4c390
  36fb24:	900029a0 	adrp	x0, 0x8a3000
  36fb28:	91356000 	add	x0, x0, #0xd58
  36fb2c:	97f4e089 	bl	0xa7d50
  36fb30:	97f373e0 	bl	0x4cab0
  36fb34:	2a0003e1 	mov	w1, w0
  36fb38:	aa1c03e0 	mov	x0, x28
  36fb3c:	97f4e085 	bl	0xa7d50
  36fb40:	97f373f0 	bl	0x4cb00
  36fb44:	2a0003e1 	mov	w1, w0
  36fb48:	aa1b03e0 	mov	x0, x27
  36fb4c:	97f4e081 	bl	0xa7d50
  36fb50:	97f37404 	bl	0x4cb60
  36fb54:	2a0003e1 	mov	w1, w0
  36fb58:	aa1a03e0 	mov	x0, x26
  36fb5c:	97f4e07d 	bl	0xa7d50
  36fb60:	97f373bc 	bl	0x4ca50
  36fb64:	2a0003e1 	mov	w1, w0
  36fb68:	aa1903e0 	mov	x0, x25
  36fb6c:	97f4e079 	bl	0xa7d50
  36fb70:	97f373f0 	bl	0x4cb30
  36fb74:	2a0003e1 	mov	w1, w0
  36fb78:	aa1803e0 	mov	x0, x24
  36fb7c:	97f4e075 	bl	0xa7d50
  36fb80:	97f373d5 	bl	0x4cad4
  36fb84:	2a0003e1 	mov	w1, w0
  36fb88:	aa1603e0 	mov	x0, x22
  36fb8c:	97f4e071 	bl	0xa7d50
  36fb90:	97f33664 	bl	0x3d520
  36fb94:	2a0003e1 	mov	w1, w0
  36fb98:	900029a0 	adrp	x0, 0x8a3000
  36fb9c:	91364000 	add	x0, x0, #0xd90
  36fba0:	97f4e06c 	bl	0xa7d50
  36fba4:	528000e0 	mov	w0, #0x7                   	// #7
  36fba8:	97f33a0a 	bl	0x3e3d0
  36fbac:	97f3365d 	bl	0x3d520
  36fbb0:	2a0003e1 	mov	w1, w0
  36fbb4:	900029a0 	adrp	x0, 0x8a3000
  36fbb8:	91372000 	add	x0, x0, #0xdc8
  36fbbc:	97f4e065 	bl	0xa7d50
  36fbc0:	900029a0 	adrp	x0, 0x8a3000
  36fbc4:	91380000 	add	x0, x0, #0xe00
  36fbc8:	97f4e062 	bl	0xa7d50
  36fbcc:	97fffb69 	bl	0x36e970
  36fbd0:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fbd4:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fbd8:	17fffe5b 	b	0x36f544
  36fbdc:	f94006a0 	ldr	x0, [x21, #8]
  36fbe0:	f9000ee0 	str	x0, [x23, #24]
  36fbe4:	17ffff1b 	b	0x36f850
  36fbe8:	f94006a0 	ldr	x0, [x21, #8]
  36fbec:	91055000 	add	x0, x0, #0x154
  36fbf0:	b9400000 	ldr	w0, [x0]
  36fbf4:	d50331bf 	dmb	oshld
  36fbf8:	2a0003e1 	mov	w1, w0
  36fbfc:	ca010021 	eor	x1, x1, x1
  36fc00:	b5000001 	cbnz	x1, 0x36fc00
  36fc04:	36400800 	tbz	w0, #8, 0x36fd04
  36fc08:	a9046bf9 	stp	x25, x26, [sp, #64]
  36fc0c:	900029a1 	adrp	x1, 0x8a3000
  36fc10:	91390021 	add	x1, x1, #0xe40
  36fc14:	a90573fb 	stp	x27, x28, [sp, #80]
  36fc18:	52800039 	mov	w25, #0x1                   	// #1
  36fc1c:	900029b8 	adrp	x24, 0x8a3000
  36fc20:	b94036e2 	ldr	w2, [x23, #52]
  36fc24:	900029b6 	adrp	x22, 0x8a3000
  36fc28:	f941c260 	ldr	x0, [x19, #896]
  36fc2c:	913a8318 	add	x24, x24, #0xea0
  36fc30:	912a82d6 	add	x22, x22, #0xaa0
  36fc34:	5280001b 	mov	w27, #0x0                   	// #0
  36fc38:	72a00059 	movk	w25, #0x2, lsl #16
  36fc3c:	940120a6 	bl	0x3b7ed4
  36fc40:	f9417a7a 	ldr	x26, [x19, #752]
  36fc44:	eb1a029f 	cmp	x20, x26
  36fc48:	54000420 	b.eq	0x36fccc  // b.none
  36fc4c:	f9400b5c 	ldr	x28, [x26, #16]
  36fc50:	f9400f87 	ldr	x7, [x28, #24]
  36fc54:	927810e7 	and	x7, x7, #0x1f00
  36fc58:	f10400ff 	cmp	x7, #0x100
  36fc5c:	54000641 	b.ne	0x36fd24  // b.any
  36fc60:	f9400380 	ldr	x0, [x28]
  36fc64:	f90037e7 	str	x7, [sp, #104]
  36fc68:	97ff9362 	bl	0x3549f0
  36fc6c:	aa0003e4 	mov	x4, x0
  36fc70:	f9400380 	ldr	x0, [x28]
  36fc74:	900029a2 	adrp	x2, 0x8a3000
  36fc78:	f94037e7 	ldr	x7, [sp, #104]
  36fc7c:	912a6042 	add	x2, x2, #0xa98
  36fc80:	f9400786 	ldr	x6, [x28, #8]
  36fc84:	f9400f45 	ldr	x5, [x26, #24]
  36fc88:	910004c6 	add	x6, x6, #0x1
  36fc8c:	cb0000c6 	sub	x6, x6, x0
  36fc90:	cb050005 	sub	x5, x0, x5
  36fc94:	71001f7f 	cmp	w27, #0x7
  36fc98:	5400052d 	b.le	0x36fd3c
  36fc9c:	f941c260 	ldr	x0, [x19, #896]
  36fca0:	aa0403e2 	mov	x2, x4
  36fca4:	900029a1 	adrp	x1, 0x8a3000
  36fca8:	52800103 	mov	w3, #0x8                   	// #8
  36fcac:	91398021 	add	x1, x1, #0xe60
  36fcb0:	9401202f 	bl	0x3b7d6c
  36fcb4:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fcb8:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fcbc:	17fffde6 	b	0x36f454
  36fcc0:	f94006a0 	ldr	x0, [x21, #8]
  36fcc4:	f90012e0 	str	x0, [x23, #32]
  36fcc8:	17fffee2 	b	0x36f850
  36fccc:	f941c260 	ldr	x0, [x19, #896]
  36fcd0:	52800001 	mov	w1, #0x0                   	// #0
  36fcd4:	d1004000 	sub	x0, x0, #0x10
  36fcd8:	94013597 	bl	0x3bd334
  36fcdc:	b94036e1 	ldr	w1, [x23, #52]
  36fce0:	b9001ea0 	str	w0, [x21, #28]
  36fce4:	7100043f 	cmp	w1, #0x1
  36fce8:	540006e0 	b.eq	0x36fdc4  // b.none
  36fcec:	7100083f 	cmp	w1, #0x2
  36fcf0:	54000720 	b.eq	0x36fdd4  // b.none
  36fcf4:	34000781 	cbz	w1, 0x36fde4
  36fcf8:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fcfc:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fd00:	17fffdd5 	b	0x36f454
  36fd04:	f94006a2 	ldr	x2, [x21, #8]
  36fd08:	91054042 	add	x2, x2, #0x150
  36fd0c:	b9400042 	ldr	w2, [x2]
  36fd10:	f94002a0 	ldr	x0, [x21]
  36fd14:	900029a1 	adrp	x1, 0x8a3000
  36fd18:	91386021 	add	x1, x1, #0xe18
  36fd1c:	94012014 	bl	0x3b7d6c
  36fd20:	17fffdcd 	b	0x36f454
  36fd24:	f10800ff 	cmp	x7, #0x200
  36fd28:	540004a1 	b.ne	0x36fdbc  // b.any
  36fd2c:	f9400380 	ldr	x0, [x28]
  36fd30:	aa1603e2 	mov	x2, x22
  36fd34:	aa0003e4 	mov	x4, x0
  36fd38:	17ffffd2 	b	0x36fc80
  36fd3c:	5ac010c1 	clz	w1, w6
  36fd40:	710000df 	cmp	w6, #0x0
  36fd44:	52800400 	mov	w0, #0x20                  	// #32
  36fd48:	4b010000 	sub	w0, w0, w1
  36fd4c:	1a9f1000 	csel	w0, w0, wzr, ne	// ne = any
  36fd50:	531b6b63 	lsl	w3, w27, #5
  36fd54:	51000800 	sub	w0, w0, #0x2
  36fd58:	f94006a1 	ldr	x1, [x21, #8]
  36fd5c:	531f1400 	ubfiz	w0, w0, #1, #6
  36fd60:	93407c63 	sxtw	x3, w3
  36fd64:	2a040000 	orr	w0, w0, w4
  36fd68:	91200063 	add	x3, x3, #0x800
  36fd6c:	32000000 	orr	w0, w0, #0x1
  36fd70:	8b030021 	add	x1, x1, x3
  36fd74:	b9000020 	str	w0, [x1]
  36fd78:	d360fc80 	lsr	x0, x4, #32
  36fd7c:	91001023 	add	x3, x1, #0x4
  36fd80:	b9000060 	str	w0, [x3]
  36fd84:	91002020 	add	x0, x1, #0x8
  36fd88:	b9000005 	str	w5, [x0]
  36fd8c:	d360fca0 	lsr	x0, x5, #32
  36fd90:	91003023 	add	x3, x1, #0xc
  36fd94:	b9000060 	str	w0, [x3]
  36fd98:	f10400ff 	cmp	x7, #0x100
  36fd9c:	91004021 	add	x1, x1, #0x10
  36fda0:	1a9f0320 	csel	w0, w25, wzr, eq	// eq = none
  36fda4:	b9000020 	str	w0, [x1]
  36fda8:	f94002a0 	ldr	x0, [x21]
  36fdac:	2a1b03e3 	mov	w3, w27
  36fdb0:	aa1803e1 	mov	x1, x24
  36fdb4:	1100077b 	add	w27, w27, #0x1
  36fdb8:	94012047 	bl	0x3b7ed4
  36fdbc:	f940035a 	ldr	x26, [x26]
  36fdc0:	17ffffa1 	b	0x36fc44
  36fdc4:	b9000ee0 	str	w0, [x23, #12]
  36fdc8:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fdcc:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fdd0:	17fffda1 	b	0x36f454
  36fdd4:	b90012e0 	str	w0, [x23, #16]
  36fdd8:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fddc:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fde0:	17fffd9d 	b	0x36f454
  36fde4:	b9000ae0 	str	w0, [x23, #8]
  36fde8:	a9446bf9 	ldp	x25, x26, [sp, #64]
  36fdec:	a94573fb 	ldp	x27, x28, [sp, #80]
  36fdf0:	17fffd99 	b	0x36f454
  36fdf4:	88dffc00 	ldar	w0, [x0]
  36fdf8:	88dffc60 	ldar	w0, [x3]
  36fdfc:	88dffc00 	ldar	w0, [x0]
  36fe00:	88dffc00 	ldar	w0, [x0]
  36fe04:	88dffc00 	ldar	w0, [x0]
  36fe08:	88dffc00 	ldar	w0, [x0]
  36fe0c:	88dffc00 	ldar	w0, [x0]
  36fe10:	88dffc00 	ldar	w0, [x0]
  36fe14:	88dffc41 	ldar	w1, [x2]
  36fe18:	88dffc41 	ldar	w1, [x2]
  36fe1c:	88dffc41 	ldar	w1, [x2]
  36fe20:	88dffc01 	ldar	w1, [x0]
  36fe24:	88dffc00 	ldar	w0, [x0]
  36fe28:	88dffc00 	ldar	w0, [x0]
  36fe2c:	88dffc00 	ldar	w0, [x0]
  36fe30:	88dffc00 	ldar	w0, [x0]
  36fe34:	88dffc00 	ldar	w0, [x0]
  36fe38:	88dffc42 	ldar	w2, [x2]
  36fe3c:	00000000 	udf	#0
