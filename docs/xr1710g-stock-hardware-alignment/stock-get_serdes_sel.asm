
/mnt/f/openwrt/research/wifi6-public-references-20261108/stock-5.1.1.12-extracted/stock-kernel.uncompressed.bin:     file format binary


Disassembly of section .data:

00000000003aa770 <.data+0x3aa770>:
  3aa770:	a9bd7bfd 	stp	x29, x30, [sp, #-48]!
  3aa774:	910003fd 	mov	x29, sp
  3aa778:	a90153f3 	stp	x19, x20, [sp, #16]
  3aa77c:	2a0003f3 	mov	w19, w0
  3aa780:	7100141f 	cmp	w0, #0x5
  3aa784:	54000228 	b.hi	0x3aa7c8  // b.pmore
  3aa788:	f00042a0 	adrp	x0, 0xc01000
  3aa78c:	910de000 	add	x0, x0, #0x378
  3aa790:	38734814 	ldrb	w20, [x0, w19, uxtw]
  3aa794:	97f24c3b 	bl	0x3d880
  3aa798:	52800021 	mov	w1, #0x1                   	// #1
  3aa79c:	7100301f 	cmp	w0, #0xc
  3aa7a0:	12000e94 	and	w20, w20, #0xf
  3aa7a4:	1ad32021 	lsl	w1, w1, w19
  3aa7a8:	0a140021 	and	w1, w1, w20
  3aa7ac:	1ad32821 	asr	w1, w1, w19
  3aa7b0:	12001c21 	and	w1, w1, #0xff
  3aa7b4:	1a811294 	csel	w20, w20, w1, ne	// ne = any
  3aa7b8:	2a1403e0 	mov	w0, w20
  3aa7bc:	a94153f3 	ldp	x19, x20, [sp, #16]
  3aa7c0:	a8c37bfd 	ldp	x29, x30, [sp], #48
  3aa7c4:	d65f03c0 	ret
  3aa7c8:	d0004020 	adrp	x0, 0xbb0000
  3aa7cc:	52801ff4 	mov	w20, #0xff                  	// #255
  3aa7d0:	b9491000 	ldr	w0, [x0, #2320]
  3aa7d4:	360fff20 	tbz	w0, #1, 0x3aa7b8
  3aa7d8:	b0002061 	adrp	x1, 0x7b7000
  3aa7dc:	9135c021 	add	x1, x1, #0xd70
  3aa7e0:	f90013f5 	str	x21, [sp, #32]
  3aa7e4:	91076035 	add	x21, x1, #0x1d8
  3aa7e8:	aa1503e1 	mov	x1, x21
  3aa7ec:	52802d42 	mov	w2, #0x16a                 	// #362
  3aa7f0:	d00027e0 	adrp	x0, 0x8a8000
  3aa7f4:	913a4000 	add	x0, x0, #0xe90
  3aa7f8:	97f3f556 	bl	0xa7d50
  3aa7fc:	aa1503e1 	mov	x1, x21
  3aa800:	2a1303e3 	mov	w3, w19
  3aa804:	d00027e0 	adrp	x0, 0x8a8000
  3aa808:	52802d42 	mov	w2, #0x16a                 	// #362
  3aa80c:	913b0000 	add	x0, x0, #0xec0
  3aa810:	97f3f550 	bl	0xa7d50
  3aa814:	f94013f5 	ldr	x21, [sp, #32]
  3aa818:	17ffffe8 	b	0x3aa7b8
  3aa81c:	d503201f 	nop
  3aa820:	d5384103 	mrs	x3, sp_el0
  3aa824:	b9403466 	ldr	w6, [x3, #52]
  3aa828:	aa0003e5 	mov	x5, x0
  3aa82c:	f9400464 	ldr	x4, [x3, #8]
