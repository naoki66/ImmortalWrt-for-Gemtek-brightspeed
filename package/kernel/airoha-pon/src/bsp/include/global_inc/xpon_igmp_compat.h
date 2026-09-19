#ifndef _XPON_IGMP_COMPAT_H_
#define _XPON_IGMP_COMPAT_H_

#include <linux/ioctl.h>
#include <linux/kernel.h>
#include <linux/timer.h>
#include <linux/version.h>

/*
 * The vendor tree gets these names from a private BSP header that is not
 * exported by the OpenWrt package. Keep a dynamic major as the safe fallback
 * until a fixed userspace ABI header is supplied.
 */
#ifndef GLOBAL_IGMP_MAJOR
#define GLOBAL_IGMP_MAJOR 0
#endif

#ifndef GLOBAL_IGMP_IOC_NAME
#define GLOBAL_IGMP_IOC_NAME "xpon_igmp"
#endif

#ifndef XPON_IGMP_IOC_MAGIC
#define XPON_IGMP_IOC_MAGIC 'i'
#endif

#ifndef XPON_IGMP_IOC_ACTION
#define XPON_IGMP_IOC_ACTION _IOW(XPON_IGMP_IOC_MAGIC, 0, unsigned long)
#endif

#ifndef IOCTL_CMD
#define IOCTL_CMD 0xffffffffU
#endif

#ifndef NIPQUAD_FMT
#define NIPQUAD_FMT "%u.%u.%u.%u"
#define NIPQUAD(addr) \
	((unsigned char *)&(addr))[0], ((unsigned char *)&(addr))[1], \
	((unsigned char *)&(addr))[2], ((unsigned char *)&(addr))[3]
#endif

/* Linux 6.18 removed the old timer deletion entry points. */
#if LINUX_VERSION_CODE >= KERNEL_VERSION(6,18,0)
#ifndef del_timer
#define del_timer(timer) timer_delete(timer)
#endif
#ifndef del_timer_sync
#define del_timer_sync(timer) timer_delete_sync(timer)
#endif
#endif

#endif /* _XPON_IGMP_COMPAT_H_ */
