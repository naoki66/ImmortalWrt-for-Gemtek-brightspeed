
/mnt/f/openwrt/research/wifi6-public-references-20261108/stock-5.1.1.12-extracted/stock-kernel.uncompressed.bin:     file format binary


Disassembly of section .data:

00000000003698d0 <.data+0x3698d0>:
  3698d0:	a9b77bfd 	stp	x29, x30, [sp, #-144]!
  3698d4:	12001c00 	and	w0, w0, #0xff
  3698d8:	d0002242 	adrp	x2, 0x7b3000
  3698dc:	910003fd 	mov	x29, sp
  3698e0:	91154042 	add	x2, x2, #0x550
  3698e4:	71000c1f 	cmp	w0, #0x3
  3698e8:	12001c26 	and	w6, w1, #0xff
  3698ec:	290c83e6 	stp	w6, w0, [sp, #100]
  3698f0:	910053e0 	add	x0, sp, #0x14
  3698f4:	a90153f3 	stp	x19, x20, [sp, #16]
  3698f8:	52945c94 	mov	w20, #0xa2e4                	// #41700
  3698fc:	a9025bf5 	stp	x21, x22, [sp, #32]
  369900:	52944395 	mov	w21, #0xa21c                	// #41500
  369904:	528cb213 	mov	w19, #0x6590                	// #26000
  369908:	a90363f7 	stp	x23, x24, [sp, #48]
  36990c:	52945018 	mov	w24, #0xa280                	// #41600
  369910:	a9046bf9 	stp	x25, x26, [sp, #64]
  369914:	a90573fb 	stp	x27, x28, [sp, #80]
  369918:	a9439444 	ldp	x4, x5, [x2, #56]
  36991c:	a9061404 	stp	x4, x5, [x0, #96]
  369920:	b9405040 	ldr	w0, [x2, #80]
  369924:	b9008fe0 	str	w0, [sp, #140]
  369928:	52948720 	mov	w0, #0xa439                	// #42041
  36992c:	1a800294 	csel	w20, w20, w0, eq	// eq = none
  369930:	52946e20 	mov	w0, #0xa371                	// #41841
  369934:	1a8002b5 	csel	w21, w21, w0, eq	// eq = none
  369938:	f9402441 	ldr	x1, [x2, #72]
  36993c:	528fffe0 	mov	w0, #0x7fff                	// #32767
  369940:	f80843e1 	stur	x1, [sp, #132]
  369944:	1a800273 	csel	w19, w19, w0, eq	// eq = none
  369948:	52947aa0 	mov	w0, #0xa3d5                	// #41941
  36994c:	1a800318 	csel	w24, w24, w0, eq	// eq = none
  369950:	710004df 	cmp	w6, #0x1
  369954:	54002900 	b.eq	0x369e74  // b.none
  369958:	52960080 	mov	w0, #0xb004                	// #45060
  36995c:	52800003 	mov	w3, #0x0                   	// #0
  369960:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369964:	52800002 	mov	w2, #0x0                   	// #0
  369968:	52800021 	mov	w1, #0x1                   	// #1
  36996c:	97ffff5d 	bl	0x3696e0
  369970:	52962a00 	mov	w0, #0xb150                	// #45392
  369974:	2a1503e1 	mov	w1, w21
  369978:	52800003 	mov	w3, #0x0                   	// #0
  36997c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369980:	528001e2 	mov	w2, #0xf                   	// #15
  369984:	97ffff57 	bl	0x3696e0
  369988:	52962a00 	mov	w0, #0xb150                	// #45392
  36998c:	2a1403e1 	mov	w1, w20
  369990:	52800203 	mov	w3, #0x10                  	// #16
  369994:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369998:	528003e2 	mov	w2, #0x1f                  	// #31
  36999c:	97ffff51 	bl	0x3696e0
  3699a0:	52962980 	mov	w0, #0xb14c                	// #45388
  3699a4:	2a1303e1 	mov	w1, w19
  3699a8:	52800003 	mov	w3, #0x0                   	// #0
  3699ac:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  3699b0:	528001e2 	mov	w2, #0xf                   	// #15
  3699b4:	97ffff4b 	bl	0x3696e0
  3699b8:	52962b00 	mov	w0, #0xb158                	// #45400
  3699bc:	52800103 	mov	w3, #0x8                   	// #8
  3699c0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  3699c4:	52800162 	mov	w2, #0xb                   	// #11
  3699c8:	52800061 	mov	w1, #0x3                   	// #3
  3699cc:	97ffff45 	bl	0x3696e0
  3699d0:	52962a80 	mov	w0, #0xb154                	// #45396
  3699d4:	2a1503e1 	mov	w1, w21
  3699d8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  3699dc:	52800003 	mov	w3, #0x0                   	// #0
  3699e0:	528001e2 	mov	w2, #0xf                   	// #15
  3699e4:	97ffff3f 	bl	0x3696e0
  3699e8:	52962a80 	mov	w0, #0xb154                	// #45396
  3699ec:	2a1403e1 	mov	w1, w20
  3699f0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  3699f4:	52800203 	mov	w3, #0x10                  	// #16
  3699f8:	528003e2 	mov	w2, #0x1f                  	// #31
  3699fc:	97ffff39 	bl	0x3696e0
  369a00:	52962980 	mov	w0, #0xb14c                	// #45388
  369a04:	2a1303e1 	mov	w1, w19
  369a08:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369a0c:	52800203 	mov	w3, #0x10                  	// #16
  369a10:	528003e2 	mov	w2, #0x1f                  	// #31
  369a14:	97ffff33 	bl	0x3696e0
  369a18:	52962b00 	mov	w0, #0xb158                	// #45400
  369a1c:	52800183 	mov	w3, #0xc                   	// #12
  369a20:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369a24:	528001e2 	mov	w2, #0xf                   	// #15
  369a28:	52800061 	mov	w1, #0x3                   	// #3
  369a2c:	97ffff2d 	bl	0x3696e0
  369a30:	52942380 	mov	w0, #0xa11c                	// #41244
  369a34:	52800303 	mov	w3, #0x18                  	// #24
  369a38:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369a3c:	2a0303e2 	mov	w2, w3
  369a40:	52800021 	mov	w1, #0x1                   	// #1
  369a44:	97ffff27 	bl	0x3696e0
  369a48:	52960014 	mov	w20, #0xb000                	// #45056
  369a4c:	5297049a 	mov	w26, #0xb824                	// #47140
  369a50:	5296f280 	mov	w0, #0xb794                	// #46996
  369a54:	52970419 	mov	w25, #0xb820                	// #47136
  369a58:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369a5c:	72a3f4b4 	movk	w20, #0x1fa5, lsl #16
  369a60:	72a3f4ba 	movk	w26, #0x1fa5, lsl #16
  369a64:	72a3f4b9 	movk	w25, #0x1fa5, lsl #16
  369a68:	b90063e0 	str	w0, [sp, #96]
  369a6c:	b9006fff 	str	wzr, [sp, #108]
  369a70:	52800303 	mov	w3, #0x18                  	// #24
  369a74:	2a1903e0 	mov	w0, w25
  369a78:	2a0303e2 	mov	w2, w3
  369a7c:	52800021 	mov	w1, #0x1                   	// #1
  369a80:	97ffff18 	bl	0x3696e0
  369a84:	9101d3fb 	add	x27, sp, #0x74
  369a88:	52800203 	mov	w3, #0x10                  	// #16
  369a8c:	2a1903e0 	mov	w0, w25
  369a90:	2a0303e2 	mov	w2, w3
  369a94:	52800021 	mov	w1, #0x1                   	// #1
  369a98:	97ffff12 	bl	0x3696e0
  369a9c:	910243fc 	add	x28, sp, #0x90
  369aa0:	52800103 	mov	w3, #0x8                   	// #8
  369aa4:	2a1903e0 	mov	w0, w25
  369aa8:	2a0303e2 	mov	w2, w3
  369aac:	52800021 	mov	w1, #0x1                   	// #1
  369ab0:	97ffff0c 	bl	0x3696e0
  369ab4:	d2912b15 	mov	x21, #0x8958                	// #35160
  369ab8:	2a1903e0 	mov	w0, w25
  369abc:	52800003 	mov	w3, #0x0                   	// #0
  369ac0:	52800002 	mov	w2, #0x0                   	// #0
  369ac4:	52800001 	mov	w1, #0x0                   	// #0
  369ac8:	97ffff06 	bl	0x3696e0
  369acc:	b94063e0 	ldr	w0, [sp, #96]
  369ad0:	52800203 	mov	w3, #0x10                  	// #16
  369ad4:	52800021 	mov	w1, #0x1                   	// #1
  369ad8:	2a0303e2 	mov	w2, w3
  369adc:	52800016 	mov	w22, #0x0                   	// #0
  369ae0:	f2a00835 	movk	x21, #0x41, lsl #16
  369ae4:	97fffeff 	bl	0x3696e0
  369ae8:	52800303 	mov	w3, #0x18                  	// #24
  369aec:	2a1a03e0 	mov	w0, w26
  369af0:	2a0303e2 	mov	w2, w3
  369af4:	52800021 	mov	w1, #0x1                   	// #1
  369af8:	97fffefa 	bl	0x3696e0
  369afc:	52800203 	mov	w3, #0x10                  	// #16
  369b00:	2a1a03e0 	mov	w0, w26
  369b04:	2a0303e2 	mov	w2, w3
  369b08:	52800001 	mov	w1, #0x0                   	// #0
  369b0c:	97fffef5 	bl	0x3696e0
  369b10:	52800203 	mov	w3, #0x10                  	// #16
  369b14:	2a1a03e0 	mov	w0, w26
  369b18:	2a0303e2 	mov	w2, w3
  369b1c:	52800021 	mov	w1, #0x1                   	// #1
  369b20:	97fffef0 	bl	0x3696e0
  369b24:	d503201f 	nop
  369b28:	b9400377 	ldr	w23, [x27]
  369b2c:	5280f282 	mov	w2, #0x794                 	// #1940
  369b30:	52800001 	mov	w1, #0x0                   	// #0
  369b34:	2a1403e0 	mov	w0, w20
  369b38:	97fffec2 	bl	0x369640
  369b3c:	12155003 	and	w3, w0, #0xfffff800
  369b40:	53185ef7 	lsl	w23, w23, #8
  369b44:	2a1403e0 	mov	w0, w20
  369b48:	2a170063 	orr	w3, w3, w23
  369b4c:	5280f282 	mov	w2, #0x794                 	// #1940
  369b50:	52800001 	mov	w1, #0x0                   	// #0
  369b54:	97fffe93 	bl	0x3695a0
  369b58:	52802b02 	mov	w2, #0x158                 	// #344
  369b5c:	52800001 	mov	w1, #0x0                   	// #0
  369b60:	2a1403e0 	mov	w0, w20
  369b64:	97fffeb7 	bl	0x369640
  369b68:	121d7003 	and	w3, w0, #0xfffffff8
  369b6c:	52802b02 	mov	w2, #0x158                 	// #344
  369b70:	2a1403e0 	mov	w0, w20
  369b74:	52800001 	mov	w1, #0x0                   	// #0
  369b78:	97fffe8a 	bl	0x3695a0
  369b7c:	d2800153 	mov	x19, #0xa                   	// #10
  369b80:	52802b02 	mov	w2, #0x158                 	// #344
  369b84:	52800001 	mov	w1, #0x0                   	// #0
  369b88:	2a1403e0 	mov	w0, w20
  369b8c:	97fffead 	bl	0x369640
  369b90:	121d7003 	and	w3, w0, #0xfffffff8
  369b94:	52802b02 	mov	w2, #0x158                 	// #344
  369b98:	32000463 	orr	w3, w3, #0x3
  369b9c:	2a1403e0 	mov	w0, w20
  369ba0:	52800001 	mov	w1, #0x0                   	// #0
  369ba4:	97fffe7f 	bl	0x3695a0
  369ba8:	aa1503e0 	mov	x0, x21
  369bac:	940ddb05 	bl	0x6e07c0
  369bb0:	f1000673 	subs	x19, x19, #0x1
  369bb4:	54ffffa1 	b.ne	0x369ba8  // b.any
  369bb8:	2a1403e0 	mov	w0, w20
  369bbc:	5280a602 	mov	w2, #0x530                 	// #1328
  369bc0:	52800001 	mov	w1, #0x0                   	// #0
  369bc4:	9100137b 	add	x27, x27, #0x4
  369bc8:	97fffe9e 	bl	0x369640
  369bcc:	6b40431f 	cmp	w24, w0, lsr #16
  369bd0:	1a9722d6 	csel	w22, w22, w23, cs	// cs = hs, nlast
  369bd4:	eb1b039f 	cmp	x28, x27
  369bd8:	54fffa81 	b.ne	0x369b28  // b.any
  369bdc:	d2912b15 	mov	x21, #0x8958                	// #35160
  369be0:	528000fb 	mov	w27, #0x7                   	// #7
  369be4:	5280003c 	mov	w28, #0x1                   	// #1
  369be8:	f2a00835 	movk	x21, #0x41, lsl #16
  369bec:	d503201f 	nop
  369bf0:	5280f282 	mov	w2, #0x794                 	// #1940
  369bf4:	52800001 	mov	w1, #0x0                   	// #0
  369bf8:	2a1403e0 	mov	w0, w20
  369bfc:	1adb2397 	lsl	w23, w28, w27
  369c00:	97fffe90 	bl	0x369640
  369c04:	2a1702d6 	orr	w22, w22, w23
  369c08:	12155003 	and	w3, w0, #0xfffff800
  369c0c:	5280f282 	mov	w2, #0x794                 	// #1940
  369c10:	2a160063 	orr	w3, w3, w22
  369c14:	2a1403e0 	mov	w0, w20
  369c18:	52800001 	mov	w1, #0x0                   	// #0
  369c1c:	97fffe61 	bl	0x3695a0
  369c20:	52802b02 	mov	w2, #0x158                 	// #344
  369c24:	52800001 	mov	w1, #0x0                   	// #0
  369c28:	2a1403e0 	mov	w0, w20
  369c2c:	97fffe85 	bl	0x369640
  369c30:	121d7003 	and	w3, w0, #0xfffffff8
  369c34:	52802b02 	mov	w2, #0x158                 	// #344
  369c38:	2a1403e0 	mov	w0, w20
  369c3c:	52800001 	mov	w1, #0x0                   	// #0
  369c40:	97fffe58 	bl	0x3695a0
  369c44:	d2800153 	mov	x19, #0xa                   	// #10
  369c48:	52802b02 	mov	w2, #0x158                 	// #344
  369c4c:	52800001 	mov	w1, #0x0                   	// #0
  369c50:	2a1403e0 	mov	w0, w20
  369c54:	97fffe7b 	bl	0x369640
  369c58:	121d7003 	and	w3, w0, #0xfffffff8
  369c5c:	52802b02 	mov	w2, #0x158                 	// #344
  369c60:	32000463 	orr	w3, w3, #0x3
  369c64:	2a1403e0 	mov	w0, w20
  369c68:	52800001 	mov	w1, #0x0                   	// #0
  369c6c:	97fffe4d 	bl	0x3695a0
  369c70:	aa1503e0 	mov	x0, x21
  369c74:	940ddad3 	bl	0x6e07c0
  369c78:	f1000673 	subs	x19, x19, #0x1
  369c7c:	54ffffa1 	b.ne	0x369c70  // b.any
  369c80:	2a1403e0 	mov	w0, w20
  369c84:	0a3702d7 	bic	w23, w22, w23
  369c88:	5280a602 	mov	w2, #0x530                 	// #1328
  369c8c:	52800001 	mov	w1, #0x0                   	// #0
  369c90:	5100077b 	sub	w27, w27, #0x1
  369c94:	97fffe6b 	bl	0x369640
  369c98:	6b40431f 	cmp	w24, w0, lsr #16
  369c9c:	1a9682f6 	csel	w22, w23, w22, hi	// hi = pmore
  369ca0:	3100077f 	cmn	w27, #0x1
  369ca4:	54fffa61 	b.ne	0x369bf0  // b.any
  369ca8:	b94063e0 	ldr	w0, [sp, #96]
  369cac:	d2912b15 	mov	x21, #0x8958                	// #35160
  369cb0:	d00029d8 	adrp	x24, 0x8a3000
  369cb4:	2a1603e1 	mov	w1, w22
  369cb8:	9111a318 	add	x24, x24, #0x468
  369cbc:	52800003 	mov	w3, #0x0                   	// #0
  369cc0:	52800142 	mov	w2, #0xa                   	// #10
  369cc4:	52800157 	mov	w23, #0xa                   	// #10
  369cc8:	f2a00835 	movk	x21, #0x41, lsl #16
  369ccc:	97fffe85 	bl	0x3696e0
  369cd0:	52802b02 	mov	w2, #0x158                 	// #344
  369cd4:	52800001 	mov	w1, #0x0                   	// #0
  369cd8:	2a1403e0 	mov	w0, w20
  369cdc:	97fffe59 	bl	0x369640
  369ce0:	121d7003 	and	w3, w0, #0xfffffff8
  369ce4:	52802b02 	mov	w2, #0x158                 	// #344
  369ce8:	2a1403e0 	mov	w0, w20
  369cec:	52800001 	mov	w1, #0x0                   	// #0
  369cf0:	97fffe2c 	bl	0x3695a0
  369cf4:	d2800153 	mov	x19, #0xa                   	// #10
  369cf8:	52802b02 	mov	w2, #0x158                 	// #344
  369cfc:	52800001 	mov	w1, #0x0                   	// #0
  369d00:	2a1403e0 	mov	w0, w20
  369d04:	97fffe4f 	bl	0x369640
  369d08:	121d7003 	and	w3, w0, #0xfffffff8
  369d0c:	52802b02 	mov	w2, #0x158                 	// #344
  369d10:	32000463 	orr	w3, w3, #0x3
  369d14:	2a1403e0 	mov	w0, w20
  369d18:	52800001 	mov	w1, #0x0                   	// #0
  369d1c:	97fffe21 	bl	0x3695a0
  369d20:	aa1503e0 	mov	x0, x21
  369d24:	940ddaa7 	bl	0x6e07c0
  369d28:	f1000673 	subs	x19, x19, #0x1
  369d2c:	54ffffa1 	b.ne	0x369d20  // b.any
  369d30:	5280a602 	mov	w2, #0x530                 	// #1328
  369d34:	52800001 	mov	w1, #0x0                   	// #0
  369d38:	2a1403e0 	mov	w0, w20
  369d3c:	97fffe41 	bl	0x369640
  369d40:	2a1403e0 	mov	w0, w20
  369d44:	5280a602 	mov	w2, #0x530                 	// #1328
  369d48:	52800001 	mov	w1, #0x0                   	// #0
  369d4c:	97fffe3d 	bl	0x369640
  369d50:	360013a0 	tbz	w0, #0, 0x369fc4
  369d54:	710006f7 	subs	w23, w23, #0x1
  369d58:	54fffbc1 	b.ne	0x369cd0  // b.any
  369d5c:	b94067e0 	ldr	w0, [sp, #100]
  369d60:	7100041f 	cmp	w0, #0x1
  369d64:	540012c0 	b.eq	0x369fbc  // b.none
  369d68:	52942380 	mov	w0, #0xa11c                	// #41244
  369d6c:	52800303 	mov	w3, #0x18                  	// #24
  369d70:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369d74:	2a0303e2 	mov	w2, w3
  369d78:	52800001 	mov	w1, #0x0                   	// #0
  369d7c:	97fffe59 	bl	0x3696e0
  369d80:	52800203 	mov	w3, #0x10                  	// #16
  369d84:	2a1903e0 	mov	w0, w25
  369d88:	2a0303e2 	mov	w2, w3
  369d8c:	52800021 	mov	w1, #0x1                   	// #1
  369d90:	97fffe54 	bl	0x3696e0
  369d94:	52800303 	mov	w3, #0x18                  	// #24
  369d98:	2a1903e0 	mov	w0, w25
  369d9c:	2a0303e2 	mov	w2, w3
  369da0:	52800021 	mov	w1, #0x1                   	// #1
  369da4:	97fffe4f 	bl	0x3696e0
  369da8:	52800103 	mov	w3, #0x8                   	// #8
  369dac:	2a1903e0 	mov	w0, w25
  369db0:	2a0303e2 	mov	w2, w3
  369db4:	52800001 	mov	w1, #0x0                   	// #0
  369db8:	97fffe4a 	bl	0x3696e0
  369dbc:	2a1a03e0 	mov	w0, w26
  369dc0:	52800303 	mov	w3, #0x18                  	// #24
  369dc4:	52800001 	mov	w1, #0x0                   	// #0
  369dc8:	2a0303e2 	mov	w2, w3
  369dcc:	97fffe45 	bl	0x3696e0
  369dd0:	b94063e0 	ldr	w0, [sp, #96]
  369dd4:	52800203 	mov	w3, #0x10                  	// #16
  369dd8:	52800001 	mov	w1, #0x0                   	// #0
  369ddc:	2a0303e2 	mov	w2, w3
  369de0:	97fffe40 	bl	0x3696e0
  369de4:	b9406be0 	ldr	w0, [sp, #104]
  369de8:	71000c1f 	cmp	w0, #0x3
  369dec:	54000d60 	b.eq	0x369f98  // b.none
  369df0:	b9406ff4 	ldr	w20, [sp, #108]
  369df4:	52962e80 	mov	w0, #0xb174                	// #45428
  369df8:	52971793 	mov	w19, #0xb8bc                	// #47292
  369dfc:	2a1603e1 	mov	w1, w22
  369e00:	52800003 	mov	w3, #0x0                   	// #0
  369e04:	52800142 	mov	w2, #0xa                   	// #10
  369e08:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369e0c:	72a3f4b3 	movk	w19, #0x1fa5, lsl #16
  369e10:	0b000280 	add	w0, w20, w0
  369e14:	0b130293 	add	w19, w20, w19
  369e18:	97fffe32 	bl	0x3696e0
  369e1c:	2a1303e0 	mov	w0, w19
  369e20:	2a1603e1 	mov	w1, w22
  369e24:	52800003 	mov	w3, #0x0                   	// #0
  369e28:	52800142 	mov	w2, #0xa                   	// #10
  369e2c:	97fffe2d 	bl	0x3696e0
  369e30:	2a1303e0 	mov	w0, w19
  369e34:	2a1603e1 	mov	w1, w22
  369e38:	52800203 	mov	w3, #0x10                  	// #16
  369e3c:	52800342 	mov	w2, #0x1a                  	// #26
  369e40:	97fffe28 	bl	0x3696e0
  369e44:	294c8be1 	ldp	w1, w2, [sp, #100]
  369e48:	2a1603e3 	mov	w3, w22
  369e4c:	d00029c0 	adrp	x0, 0x8a3000
  369e50:	9111e000 	add	x0, x0, #0x478
  369e54:	97f4f7bf 	bl	0xa7d50
  369e58:	a94153f3 	ldp	x19, x20, [sp, #16]
  369e5c:	a9425bf5 	ldp	x21, x22, [sp, #32]
  369e60:	a94363f7 	ldp	x23, x24, [sp, #48]
  369e64:	a9446bf9 	ldp	x25, x26, [sp, #64]
  369e68:	a94573fb 	ldp	x27, x28, [sp, #80]
  369e6c:	a8c97bfd 	ldp	x29, x30, [sp], #144
  369e70:	d65f03c0 	ret
  369e74:	b94067f6 	ldr	w22, [sp, #100]
  369e78:	52980080 	mov	w0, #0xc004                	// #49156
  369e7c:	52800003 	mov	w3, #0x0                   	// #0
  369e80:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369e84:	2a1603e1 	mov	w1, w22
  369e88:	52800002 	mov	w2, #0x0                   	// #0
  369e8c:	97fffe15 	bl	0x3696e0
  369e90:	5299049a 	mov	w26, #0xc824                	// #51236
  369e94:	52982a00 	mov	w0, #0xc150                	// #49488
  369e98:	2a1503e1 	mov	w1, w21
  369e9c:	52800003 	mov	w3, #0x0                   	// #0
  369ea0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369ea4:	528001e2 	mov	w2, #0xf                   	// #15
  369ea8:	97fffe0e 	bl	0x3696e0
  369eac:	52982a00 	mov	w0, #0xc150                	// #49488
  369eb0:	2a1403e1 	mov	w1, w20
  369eb4:	52800203 	mov	w3, #0x10                  	// #16
  369eb8:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369ebc:	528003e2 	mov	w2, #0x1f                  	// #31
  369ec0:	97fffe08 	bl	0x3696e0
  369ec4:	52982980 	mov	w0, #0xc14c                	// #49484
  369ec8:	2a1303e1 	mov	w1, w19
  369ecc:	52800003 	mov	w3, #0x0                   	// #0
  369ed0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369ed4:	528001e2 	mov	w2, #0xf                   	// #15
  369ed8:	97fffe02 	bl	0x3696e0
  369edc:	52982b00 	mov	w0, #0xc158                	// #49496
  369ee0:	52800103 	mov	w3, #0x8                   	// #8
  369ee4:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369ee8:	52800162 	mov	w2, #0xb                   	// #11
  369eec:	52800061 	mov	w1, #0x3                   	// #3
  369ef0:	97fffdfc 	bl	0x3696e0
  369ef4:	52982a80 	mov	w0, #0xc154                	// #49492
  369ef8:	2a1503e1 	mov	w1, w21
  369efc:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f00:	52800003 	mov	w3, #0x0                   	// #0
  369f04:	528001e2 	mov	w2, #0xf                   	// #15
  369f08:	97fffdf6 	bl	0x3696e0
  369f0c:	52982a80 	mov	w0, #0xc154                	// #49492
  369f10:	2a1403e1 	mov	w1, w20
  369f14:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f18:	52800203 	mov	w3, #0x10                  	// #16
  369f1c:	528003e2 	mov	w2, #0x1f                  	// #31
  369f20:	97fffdf0 	bl	0x3696e0
  369f24:	52982980 	mov	w0, #0xc14c                	// #49484
  369f28:	2a1303e1 	mov	w1, w19
  369f2c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f30:	52800203 	mov	w3, #0x10                  	// #16
  369f34:	528003e2 	mov	w2, #0x1f                  	// #31
  369f38:	97fffdea 	bl	0x3696e0
  369f3c:	52982b00 	mov	w0, #0xc158                	// #49496
  369f40:	52800183 	mov	w3, #0xc                   	// #12
  369f44:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f48:	528001e2 	mov	w2, #0xf                   	// #15
  369f4c:	52800061 	mov	w1, #0x3                   	// #3
  369f50:	97fffde4 	bl	0x3696e0
  369f54:	52943a80 	mov	w0, #0xa1d4                	// #41428
  369f58:	52800303 	mov	w3, #0x18                  	// #24
  369f5c:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f60:	2a0303e2 	mov	w2, w3
  369f64:	2a1603e1 	mov	w1, w22
  369f68:	97fffdde 	bl	0x3696e0
  369f6c:	5298f280 	mov	w0, #0xc794                	// #51092
  369f70:	52990419 	mov	w25, #0xc820                	// #51232
  369f74:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369f78:	52980014 	mov	w20, #0xc000                	// #49152
  369f7c:	72a3f4ba 	movk	w26, #0x1fa5, lsl #16
  369f80:	72a3f4b9 	movk	w25, #0x1fa5, lsl #16
  369f84:	72a3f4b4 	movk	w20, #0x1fa5, lsl #16
  369f88:	b90063e0 	str	w0, [sp, #96]
  369f8c:	52820000 	mov	w0, #0x1000                	// #4096
  369f90:	b9006fe0 	str	w0, [sp, #108]
  369f94:	17fffeb7 	b	0x369a70
  369f98:	b9406fe1 	ldr	w1, [sp, #108]
  369f9c:	52971800 	mov	w0, #0xb8c0                	// #47296
  369fa0:	72a3f4a0 	movk	w0, #0x1fa5, lsl #16
  369fa4:	52800003 	mov	w3, #0x0                   	// #0
  369fa8:	0b000020 	add	w0, w1, w0
  369fac:	52800142 	mov	w2, #0xa                   	// #10
  369fb0:	2a1603e1 	mov	w1, w22
  369fb4:	97fffdcb 	bl	0x3696e0
  369fb8:	17ffffa3 	b	0x369e44
  369fbc:	52943a80 	mov	w0, #0xa1d4                	// #41428
  369fc0:	17ffff6b 	b	0x369d6c
  369fc4:	aa1803e0 	mov	x0, x24
  369fc8:	97f4f762 	bl	0xa7d50
  369fcc:	17ffff62 	b	0x369d54
