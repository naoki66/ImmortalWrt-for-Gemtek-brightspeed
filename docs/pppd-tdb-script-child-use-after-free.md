# pppd 脚本子进程 use-after-free：PPPoE 拨号成功但没有默认路由

适用范围：`naoki66/ImmortalWrt-for-Pon`，`airoha/an7581`，XG2010G / XG-040G-MD，
`DISTRIB_REVISION 2026-10-14-37a89d4a3b`（含 `CONFIG_PACKAGE_ppp-multilink=y`）。

## 症状

PPPoE 拨号本身完全正常 —— LCP/IPCP 协商成功，CHAP 通过，`pppoe-wan` 拿到公网地址；
但**系统始终没有默认路由**，表现为"拨号成功却上不了网"：

```
$ ip route show default          # 空
$ ip -4 addr show pppoe-wan      # inet 27.13.114.76 peer 27.13.114.1/32
$ ping -I pppoe-wan 223.5.5.5    # 3/3 通，0% 丢包   <- 数据面是好的
$ ping 223.5.5.5                 # 失败（没有默认路由）
$ ubus call network.interface.wan status
  ... "up": false, "pending": true,
      "errors": [ { "subsystem": "pppoe", "code": "PEER_DEAD" } ]
```

`logread` 里 netifd 从未出现 `Interface 'wan' is now up`；
odhcpd 反复报 `No default route present`。

## 直接原因：`ip-up-script` 子进程 100% 崩溃

pppd 由 netifd 以 `nodefaultroute` 启动，默认路由由 ip-up 脚本回调 netifd 下发：

```
ip-up-script /lib/netifd/ppp-up     ->  ubus call network.interface notify_proto {...}
```

而 pppd fork 出来执行该脚本的子进程**每次都崩**：

```
pppd: pppd: potentially unexpected fatal signal 11.
Child process /lib/netifd/ppp-up (pid 24597) terminated with signal 11
Child process /lib/netifd/ppp6-up (pid 24598) terminated with signal 11
```

（SIGSEGV 与 SIGBUS 混合出现。）脚本没机会运行 → `notify_proto` 从未被调用 →
默认路由从未安装。把 `ip-up-script` 换成 `/bin/true` 后子进程**依旧崩溃**，
证明崩溃发生在 pppd 自身、且在任何 `execve()` 之前。

## 根因：`ppp_safe_fork()` 子进程关闭 TDB 却留下悬垂指针

ppp 2.5.4 `pppd/main.c`：

```c
pid_t
ppp_safe_fork(int infd, int outfd, int errfd)
{
	...
	/* Executing in the child */
	ppp_sys_close();                       /* main.c:1756 */
#ifdef PPP_WITH_TDB
	if (pppdb != NULL)
		tdb_close(pppdb);              /* main.c:1757-1760  <== 释放但不置空 */
#endif
	...
	return 0;
}
```

`tdb_close()` 会 `SAFE_FREE(tdb->locked)`、`tdb_munmap()`、`close(fd)`、`free(tdb)`
（`pppd/tdb.c` `tdb_close()`），但**全局 `pppdb` 仍指向已释放内存**。

子进程随后的执行路径（同一个 `run_program()`）：

```c
ppp_script_setenv("PPP_SCRIPT_INSTANCE", name, 0);   /* main.c:2001 */
                     |
                     v
   ppp_script_setenv() 看到 pppdb != NULL（其实已悬垂）
                     -> update_db_entry()            /* main.c:2360 */
                        -> tdb_store(pppdb, key, dbuf, TDB_REPLACE)
                           -> tdb_lock(tdb, BUCKET(hash), F_WRLCK)   /* tdb.c:240 */
                              -> tdb->locked[list+1]    /* 访问已 free 的内存 */
```

→ SIGSEGV / SIGBUS。

### 现场证据（core dump + 内核寄存器转储）

打开 `/proc/sys/kernel/print-fatal-signals` 后拿到精确崩溃点：

```
pc : 0000005570a965f0        (= pppd 基址 + 0x2A5F0)
lr : 0000005570a966ec        (= pppd 基址 + 0x2A6EC)
x20: 0000000000000053        (list = 83)
x22: 00000000000002a0        ((list + 1) * 8)
```

反汇编该地址，正是 `tdb_lock()`：

```
0x02a5d8  ldr  w1, [x0, #0xd4]        ; tdb->flags
0x02a5dc  tbnz w1, #2, #0x2a6a8
0x02a5e0  add  w5, w20, #1            ; list + 1
0x02a5e4  ldr  x1, [x0, #0x20]        ; x1 = tdb->locked
0x02a5e8  lsl  x22, x5, #3
0x02a5ec  add  x5, x1, x5, lsl #3
0x02a5f0  ldr  w1, [x1, x22]          ; <== FAULT: tdb->locked[list+1]
```

（函数身份由同函数引用的字符串 `"tdb_lock: invalid list %d for ltype=%d."` 确定。）

core dump 中的 `struct tdb_context` 完好，但关键字段留下了 `tdb_close()` 的指纹：

| 字段 | 值 | 说明 |
|---|---|---|
| `fd` | 8 | `/var/run/pppd/pppd2.tdb` |
| `map_size` | `0x2000` | tdb 文件大小 |
| `header.hash_size` | `0x83` = 131 | 与 `list = hash % 131` 吻合 |
| **`map_ptr`** | **NULL** | `tdb_close()` → `tdb_munmap()` 留下的 |
| **`locked`** | **已 munmap 的地址** | 访问即 SIGSEGV |

补充证据：

- core 中残留字符串 `PPPD_PID=10116` → 崩溃进程是 pppd 10116 的 **fork 子进程**。
- 另有几次崩溃的 `pc` 直接是 ASCII：
  `0x0045434e4154534e` = `"NSTANCE\0"`、`0x434e4154534e49` = `"INSTANC\0"`，
  即被释放的堆块被 `ppp_script_setenv()` 的 `malloc` 复用成了
  `"PPP_SCRIPT_INSTANCE=ip-up"`、`"…;IPLOCAL=113.205.127.71;…"` 等字符串
  （core 里能看到完整的 `update_db_entry()` 拼接缓冲区）。
- 上游 ppp master 已修复，改动只有一行：

  ```c
  #ifdef PPP_WITH_TDB
  	if (pppdb != NULL) {
  		tdb_close(pppdb);
  		pppdb = NULL;	/* tdb_close() can't null the caller's pointer */
  	}
  #endif
  ```

## 为什么"最近改配置"才触发

`PPP_WITH_TDB` 只在 `--enable-multilink` 时定义（`configure.ac:175`）：

```
AM_CONDITIONAL(PPP_WITH_TDB, test "x${enable_multilink}" = "xyes")
```

而 `--enable-multilink` **默认关闭**（`configure.ac` 汇总行 `Multilink: no`），
OpenWrt 只在 `BUILD_VARIANT=multilink` 时打开：

```make
ifeq ($(BUILD_VARIANT),multilink)
  CONFIGURE_ARGS += --enable-multilink
endif
```

所以只有装 `ppp-multilink` 变体时 `tdb.c` 才被编进 pppd，`pppdb` 才会被打开，
这条 UAF 才可达。

回归提交：

```
5ac3a85e1a  2026-09-29  naoki66
airoha: fix XG2010G network, voice and UBI upgrade handling

2010.config:
- # CONFIG_PACKAGE_ppp-multilink is not set
+ CONFIG_PACKAGE_ppp-multilink=y
```

该提交本意是修 XG2010G 的 network/voice/UBI，顺带把 `ppp-multilink` 打开了，
于是 pppd 变成 multilink 构建 → 撞上 ppp 2.5.4 的这处 UAF。

对照：`1710.config` 仍是 `# CONFIG_PACKAGE_ppp-multilink is not set`，
因此 1710 机型不受影响；`040.config` / `2010.config` 也为 `=y`，同样受影响。

## 与 PON 驱动改动无关

现象容易被归到 PON 驱动，但近期驱动提交都不在 pppd 用户态路径上：

| 提交 | 内容 | 是否相干 |
|---|---|---|
| `8aa505c865` | PPPoE 会话头计入 PPE/WAN 出口 MTU | 否，实测 `ping -s 1400 -I pppoe-wan` 3/3；`WAN_MTU0_MASK = GENMASK(13,0)` 未溢出 |
| `c1794cceb7` | 打开 bridge family flowtable 内核选项 | 否 |
| `04cc62e892` | AN7583 1G-EPON PCS 速率表 | 否 |
| `748b4b28ed` | PPE bridged-PPPoE offload 文档 | 否 |

数据面（PON → PPE → PPPoE）是好的，坏的只是 pppd 子进程。

## 修正

`package/network/services/ppp/patches/514-pppd-clear-pppdb-after-tdb_close.patch`：

```diff
--- a/pppd/main.c
+++ b/pppd/main.c
@@ -1755,8 +1755,10 @@
 	/* Executing in the child */
 	ppp_sys_close();
 #ifdef PPP_WITH_TDB
-	if (pppdb != NULL)
+	if (pppdb != NULL) {
 		tdb_close(pppdb);
+		pppdb = NULL;	/* tdb_close() can't null the caller's pointer */
+	}
 #endif
```

置空后，`ppp_script_setenv()` / `cleanup_db()` 里的 `pppdb != NULL` 判断在子进程中
会直接跳过 TDB 路径 —— 这正是子进程本来的设计意图（子进程不该动父进程的数据库）。
父进程的 TDB 与 multilink 书签完全不受影响。

该改动与上游 ppp master 完全一致，可在 ppp 版本升级到含该修复的版本后删除。

## 验证

### 现场等价验证（未重新编译固件）

让 `tdb_open()` 失败即可得到 `pppdb == NULL`，等价于补丁在子进程中的效果：

```sh
rm -f /var/run/pppd/pppd2.tdb
mkdir  /var/run/pppd/pppd2.tdb     # open(O_RDWR|O_CREAT) -> EISDIR
ifdown wan; ifup wan
```

结果：

```
logread: Warning: couldn't open ppp database /var/run/pppd/pppd2.tdb

$ ip route show default
default via 27.13.114.1 dev pppoe-wan proto static      <-- 出现
$ ping -c 3 223.5.5.5
3 packets transmitted, 3 packets received, 0% packet loss
dmesg "Fatal signal" 计数增量：0                        <-- 不再崩溃
```

对照：保持 `pppdb` 有效时，每个脚本子进程都崩溃、默认路由始终缺失。

### 补丁本身

已在干净的 ppp-2.5.4 源码上按序号应用全部 14 个补丁（含本补丁），全部干净命中。

### 复现/调试手法（供后续复用）

```sh
echo 1 > /proc/sys/kernel/print-fatal-signals    # 崩溃时打印寄存器
echo 0 > /proc/sys/kernel/randomize_va_space     # 固定基址，便于 objdump 对照
cat /proc/$(pidof pppd)/maps | head              # 取 pppd 加载基址：pc - base = 文件偏移
# core dump 默认写在 /tmp/pppd.<time>.<pid>.<sig>.core
```

### 与上游的关系

本补丁是上游 ppp **master** 上 commit `26093eeea8`
（*"pppd: Clear pppdb after tdb_close() in ppp_safe_fork()"*，2026-09-28，作者 Adam Zegarek，
`pppd/main.c +3 -1`）的**逐字节回移**——补丁代码与上游完全一致，仅 diff 上下文行号不同。
上游提交信息独立印证了本文结论：明确点名触发前提 `e87ddf0085c6`
（`run_program: Export the name of the script via PPP_SCRIPT_INSTANCE`）、
崩溃点 `ppp_script_setenv("PPP_SCRIPT_INSTANCE", ...)`，
以及"仅 `--enable-multilink`（即 `PPP_WITH_TDB`）的构建受影响"。

**为什么是回移而不是升级：** ppp 上游 tag 最新仅到 **v2.5.4**，该修复只存在于 master，
没有任何 release 包含它；而 ImmortalWrt 上游（本树即 ImmortalWrt）的 ppp 包与本地完全相同
（`2.5.4-r2`、同一组 13 个补丁），没有可同步的差异。在 OpenWrt 包模型里"同步上游"
等于 bump `PKG_VERSION`，但 ppp 使用 release tarball + `PKG_MIRROR_HASH`，
要取 master 需改造成 `PKG_SOURCE_PROTO:=git` 的 `-git` 包，代价与风险远超一行修复。

因此本补丁标注为**可删除**：一旦 ppp 被升级到包含该修复的版本，直接删掉此文件即可。
