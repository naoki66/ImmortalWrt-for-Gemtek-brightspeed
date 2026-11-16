'use strict';
'require baseclass';
'require rpc';
'require fs';
'require poll';

var callSystemInfo = rpc.declare({
	object: 'system',
	method: 'info'
});

var callInterfaceDump = rpc.declare({
	object: 'network.interface',
	method: 'dump',
	expect: { 'interface': [] }
});

var callDeviceStatus = rpc.declare({
	object: 'network.device',
	method: 'status',
	params: ['name']
});

return baseclass.extend({
	prevStats: null,
	prevTime: null,
	netDevice: null,
	netLabel: null,
	netResolving: false,
	linkSpeed: null,
	numCores: 1,
	pollFn: null,

	__init__: function() {
		var self = this;

		this.setupIndicators();
		if (!this.container)
			return;

		/* Detect core count once so load average can be converted to %. */
		L.resolveDefault(fs.read('/proc/cpuinfo'), '').then(function(text) {
			var m = text.match(/^processor\s*:/gm);
			self.numCores = (m && m.length) || 1;
		});

		/* LuCI.poll waits for the returned promise before scheduling this
		 * function again, preventing slow RPC calls from piling up. */
		this.pollFn = L.bind(this.fetchAndUpdate, this);
		poll.add(this.pollFn);
	},

	icons: {
		cpu:    '<svg xmlns="http://www.w3.org/2000/svg" class="indicator-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 9 4 4 7 11 10 2 13 9"/></svg>',
		ram:    '<svg xmlns="http://www.w3.org/2000/svg" class="indicator-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3 H13 V10 H8 V9 H6 V10 H1 Z"/><rect x="2.2" y="4.5" width="2" height="3"/><rect x="6" y="4.5" width="2" height="3"/><rect x="9.8" y="4.5" width="2" height="3"/><line x1="2" y1="10" x2="2" y2="11.5"/><line x1="4" y1="10" x2="4" y2="11.5"/><line x1="10" y1="10" x2="10" y2="11.5"/><line x1="12" y1="10" x2="12" y2="11.5"/></svg>',
		net:    '<svg xmlns="http://www.w3.org/2000/svg" class="indicator-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="1" x2="7" y2="13"/><polyline points="3 4 7 1 11 4"/><polyline points="3 10 7 13 11 10"/></svg>',
		uptime: '<svg xmlns="http://www.w3.org/2000/svg" class="indicator-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="6"/><polyline points="7 3 7 7 10 9"/></svg>'
	},

	makeIcon: function(name) {
		var markup = this.icons[name];
		if (!markup) return document.createTextNode('');
		var doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
		return document.importNode(doc.documentElement, true);
	},

	createIndicator: function(name, title) {
		var el = document.createElement('span');
		el.setAttribute('data-indicator', name);
		el.setAttribute('role', 'status');
		el.setAttribute('aria-live', 'off');
		el.setAttribute('aria-label', title);
		el.title = title;
		el.appendChild(this.makeIcon(name));
		var val = document.createElement('span');
		val.className = 'indicator-value';
		/* Restore last known value from session to avoid flash of "--" on page nav */
		var cached = null;
		try { cached = sessionStorage.getItem('glass-status-' + name); } catch(e) {}
		val.textContent = cached || '--';
		el.appendChild(val);
		return el;
	},

	setLevel: function(el, level) {
		if (el.getAttribute('data-level') !== level)
			el.setAttribute('data-level', level);
	},

	setIndicator: function(el, value, title, level) {
		if (!el)
			return;

		var valueEl = el.querySelector('.indicator-value');
		if (valueEl && valueEl.textContent !== value) {
			valueEl.textContent = value;
			try { sessionStorage.setItem('glass-status-' + el.getAttribute('data-indicator'), value); } catch(e) {}
		}

		if (el.title !== title) {
			el.title = title;
			el.setAttribute('aria-label', title);
		}

		this.setLevel(el, level);
	},

	setupIndicators: function() {
		this.container = document.getElementById('status-indicators');
		if (!this.container) return;

		this.cpuEl = this.createIndicator('cpu', _('CPU usage (%)'));
		this.ramEl = this.createIndicator('ram', _('Memory usage (%)'));
		this.uptimeEl = this.createIndicator('uptime', _('Uptime'));

		this.container.appendChild(this.cpuEl);
		this.container.appendChild(this.ramEl);
		this.container.appendChild(this.uptimeEl);
	},

	fetchAndUpdate: function() {
		var self = this;
		var requests = [];

		if (!this.container || document.hidden)
			return Promise.resolve();

		requests.push(L.resolveDefault(callSystemInfo(), null).then(function(info) {
			if (info)
				self.updateSystem(info);
		}));

		if (this.netDevice)
			requests.push(this.pollNetwork());
		else if (!this.netResolving)
			requests.push(this.resolveNetworkDevice());

		return Promise.all(requests);
	},

	resolveNetworkDevice: function() {
		var self = this;
		this.netResolving = true;

		return L.resolveDefault(callInterfaceDump(), null).then(function(ifaces) {
			if (!Array.isArray(ifaces))
				return null;

			/* Find WAN device - prefer 'wan' over 'wan6'. */
			var wanDev = null;
			for (var i = 0; i < ifaces.length; i++) {
				var iface = ifaces[i];
				if (iface.interface === 'wan') {
					wanDev = iface.l3_device || iface.device || null;
					break;
				}
			}

			if (!wanDev) {
				for (var j = 0; j < ifaces.length; j++) {
					if (ifaces[j].interface === 'wan6') {
						wanDev = ifaces[j].l3_device || ifaces[j].device || null;
						break;
					}
				}
			}

			return self.resolvePhysicalDevice(wanDev || 'wan');
		}).finally(function() {
			self.netResolving = false;
		});
	},

	resolvePhysicalDevice: function(devName) {
		var self = this;
		return L.resolveDefault(callDeviceStatus(devName), null).then(function(dev) {
			if (!dev)
				return null;

			var members = dev['bridge-members'];
			if (dev.type === 'bridge' && members && members.length > 0) {
				/* Bridge stats only count management traffic;
				   use first physical port for real forwarded stats */
				self.netDevice = members[0];
			} else if (dev.statistics) {
				self.netDevice = devName;
			}
			if (!self.netDevice)
				return null;

			/* Query physical port for link speed and DSA info */
			return L.resolveDefault(callDeviceStatus(self.netDevice), null).then(function(phys) {
				if (phys && phys.speed) {
					var m = String(phys.speed).match(/^(\d+)/);
					if (m) self.linkSpeed = parseInt(m[1], 10);
				}
				/* DSA port with hardware offload: per-port counters miss
				   offloaded flows; use the conduit (switch master) instead */
				if (phys && phys.devtype === 'dsa' && phys['hw-tc-offload'] && phys.conduit) {
					self.netLabel = self.netDevice;
					self.netDevice = phys.conduit;
				}
				if (!self.netEl) {
					self.netEl = self.createIndicator('net', _('Network'));
					self.container.insertBefore(self.netEl, self.uptimeEl);
				}

				return self.pollNetwork();
			});
		});
	},

	pollNetwork: function() {
		var self = this;
		if (!this.netDevice)
			return Promise.resolve();

		return L.resolveDefault(callDeviceStatus(this.netDevice), null).then(function(dev) {
			if (!dev || !dev.statistics) {
				/* WAN devices can be recreated on reconnect. Resolve the current
				 * device again on the next poll instead of showing stale data. */
				self.netDevice = null;
				self.netLabel = null;
				self.linkSpeed = null;
				self.prevStats = null;
				self.prevTime = null;
				return;
			}

			self.updateNetwork(dev);
		});
	},

	updateSystem: function(info) {
		if (!info) return;

		if (info.load) {
			var load1 = info.load[0] / 65536;
			var load5 = (info.load[1] / 65536).toFixed(2);
			var load15 = (info.load[2] / 65536).toFixed(2);
			var pct = Math.min(load1 / this.numCores, 1) * 100;
			var pctStr = pct.toFixed(0) + '%';

			var title = _('CPU usage (%)') + ': ' + pctStr + ' (' + load1.toFixed(2) +
				' / ' + load5 + ' / ' + load15 + ', ' + this.numCores + ' ' +
				(this.numCores === 1 ? _('core') : _('cores')) + ')';

			var level = pct < 60 ? 'ok' : pct < 85 ? 'warn' : 'crit';
			this.setIndicator(this.cpuEl, pctStr, title, level);
		}

		if (info.memory && info.memory.total) {
			var total = info.memory.total;
			var avail = info.memory.available;
			if (avail == null)
				avail = info.memory.free;
			if (avail != null) {
				var used = total - avail;
				var pct = (used / total * 100).toFixed(0);
				var title = _('Memory usage (%)') + ': ' + this.formatBytes(used) + ' / ' + this.formatBytes(total) + ' (' + pct + '%)';

				var level = pct < 60 ? 'ok' : pct < 85 ? 'warn' : 'crit';
				this.setIndicator(this.ramEl, pct + '%', title, level);
			}
		}

		if (info.uptime != null) {
			var uptime = this.formatUptime(info.uptime);
			this.setIndicator(this.uptimeEl, uptime,
				_('Uptime') + ': ' + this.formatUptimeFull(info.uptime), 'ok');
		}
	},

	updateNetwork: function(dev) {
		if (!dev || !dev.statistics || !this.netEl) return;

		var now = Date.now() / 1000;
		var rx = dev.statistics.rx_bytes || 0;
		var tx = dev.statistics.tx_bytes || 0;

		if (this.prevStats && this.prevTime) {
			var dt = now - this.prevTime;
			if (dt > 0) {
				var rxSpeed = (rx - this.prevStats.rx) / dt;
				var txSpeed = (tx - this.prevStats.tx) / dt;
				if (rxSpeed < 0) rxSpeed = 0;
				if (txSpeed < 0) txSpeed = 0;
				var netText = '\u2193' + this.formatSpeed(rxSpeed) + ' \u2191' + this.formatSpeed(txSpeed);
				var tip = (this.netLabel || this.netDevice) + ': \u2193 ' + this.formatSpeedFull(rxSpeed) + ' / \u2191 ' + this.formatSpeedFull(txSpeed);
				if (this.linkSpeed)
					tip += ' (' + _('Link Speed') + ': ' + (this.linkSpeed >= 1000 ? (this.linkSpeed / 1000) + ' Gbps' : this.linkSpeed + ' Mbps') + ')';

				var peak = Math.max(rxSpeed, txSpeed);
				var level = peak < 1048576 ? 'ok' : peak < 52428800 ? 'active' : 'busy';
				this.setIndicator(this.netEl, netText, tip, level);
			}
		}

		this.prevStats = { rx: rx, tx: tx };
		this.prevTime = now;
	},

	formatUptime: function(s) {
		var d = Math.floor(s / 86400);
		var h = Math.floor((s % 86400) / 3600);
		var m = Math.floor((s % 3600) / 60);
		if (d > 0) return _('%dd %dh').format(d, h);
		return _('%dh %dm').format(h, m);
	},

	formatUptimeFull: function(s) {
		var d = Math.floor(s / 86400);
		var h = Math.floor((s % 86400) / 3600);
		var m = Math.floor((s % 3600) / 60);
		var parts = [];
		if (d > 0) parts.push(d + ' ' + (d === 1 ? _('day') : _('days')));
		if (h > 0) parts.push(h + ' ' + (h === 1 ? _('hour') : _('hours')));
		if (m > 0) parts.push(m + ' ' + (m === 1 ? _('minute') : _('minutes')));
		return parts.join(' ') || _('less than a minute');
	},

	formatBytes: function(bytes) {
		if (bytes >= 1073741824)
			return (bytes / 1073741824).toFixed(1) + ' GB';
		if (bytes >= 1048576)
			return (bytes / 1048576).toFixed(0) + ' MB';
		return (bytes / 1024).toFixed(0) + ' KB';
	},

	formatSpeed: function(bytesPerSec) {
		var bits = bytesPerSec * 8;
		if (bits >= 1000000000)
			return (bits / 1000000000).toFixed(1) + 'G';
		if (bits >= 1000000)
			return (bits / 1000000).toFixed(1) + 'M';
		if (bits >= 1000)
			return (bits / 1000).toFixed(1) + 'K';
		return Math.round(bits) + 'b';
	},

	formatSpeedFull: function(bytesPerSec) {
		var bits = bytesPerSec * 8;
		if (bits >= 1000000000)
			return (bits / 1000000000).toFixed(1) + ' Gbps';
		if (bits >= 1000000)
			return (bits / 1000000).toFixed(1) + ' Mbps';
		if (bits >= 1000)
			return (bits / 1000).toFixed(1) + ' kbps';
		return Math.round(bits) + ' bps';
	}
});
