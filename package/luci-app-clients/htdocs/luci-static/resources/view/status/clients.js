// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require poll';
'require ui';
'require view';
'require view.status.clients.common as common';
'require view.status.clients.overview as overviewView';
'require view.status.clients.devices as devicesView';
'require view.status.clients.dns as dnsView';

/*
 * Net Clients - one page, three tabs.
 *
 * The page itself owns nothing but the tab frame: the data, the polling and
 * the per-tab state stay inside the three sub-views, which are required as
 * LuCI modules and mounted into their panes on first activation. A tab that
 * is not on screen gets `hidden = true` on its instance, and every sub-view
 * checks that flag at the top of its poll callback - so exactly one tab is
 * sampling at any time, no matter how many of them were opened.
 *
 * Mounting is lazy: switching to a tab that has never been shown loads and
 * renders it on the spot, which keeps the first paint of the page down to the
 * work the default tab actually needs.
 */

var TABS = [
	{ name: 'overview', label: _('Overview'), view: overviewView, title: _('Net Clients') + ' - ' + _('Overview') },
	{ name: 'devices',  label: _('LAN clients'), view: devicesView,  title: _('Net Clients') + ' - ' + _('LAN clients') },
	{ name: 'dns',      label: _('DNS records'), view: dnsView,      title: _('Net Clients') + ' - ' + _('DNS records') }
];

function tabDef(name) {
	for (var i = 0; i < TABS.length; i++)
		if (TABS[i].name == name)
			return TABS[i];

	return TABS[0];
}

return view.extend({
	active: 'overview',
	instances: {},
	nodes: {},
	loaded: {},

	/* One instance per sub-view, created on first touch. Tabs other than the
	 * active one start hidden so their poll callbacks stand down until they
	 * are actually looked at. */
	instance: function(name) {
		if (!this.instances[name]) {
			var inst = Object.create(tabDef(name).view);

			inst.hidden = (name != this.active);
			this.instances[name] = inst;
			console.log('[clients] instance created:', name, 'hidden=' + inst.hidden);
		}

		return this.instances[name];
	},

	/* Load (first time) and render a tab into its pane. A stale mount - the
	 * user having switched away while the load was in flight - is discarded
	 * rather than written into the wrong pane. */
	mount: function(name) {
		var self = this;
		var inst = this.instance(name);
		var pane = this.nodes[name];

		console.log('[clients] mount started:', name);

		return Promise.resolve(inst.load ? inst.load() : null).then(function() {
			console.log('[clients] mount settled:', name,
				'| active=' + self.active,
				'| pane children=' + pane.childNodes.length);

			if (self.active != name)
				return;

			dom.content(pane, inst.render());
			self.loaded[name] = true;
			console.log('[clients] mounted into pane:', name);
		}).catch(function(error) {
			console.error('[clients] mount FAILED:', name, error);
			self.errorBar('mount ' + name + ': ' + (error && (error.message || error)));
			L.error(error);
		});
	},

	handleTab: function(name, ev) {
		if (ev && ev.preventDefault)
			ev.preventDefault();

		console.log('[clients] handleTab:', name, '| current:', this.active);

		if (this.active == name)
			return;

		/* Stand the previous tab's poll down, wake the new one up. The new
		 * tab's instance may not exist yet - lazy mounting means it is created
		 * on demand right here, which is what the mount below then finds. */
		this.instances[this.active].hidden = true;
		this.active = name;
		this.instance(name).hidden = false;

		this.refreshTabs();
		this.setTitle(name);

		for (var key in this.nodes)
			this.nodes[key].style.display = (key == name) ? '' : 'none';

		if (!this.loaded[name])
			this.mount(name);
	},

	setTitle: function(name) {
		this.title.textContent = tabDef(name).title;
	},

	refreshTabs: function() {
		var items = this.tabbar.querySelectorAll('li');

		for (var i = 0; i < items.length; i++) {
			var name = items[i].getAttribute('data-tab');

			items[i].className = (name == this.active) ? 'cbi-tab' : 'cbi-tab-disabled';
		}
	},

	/* Any uncaught error during the async mount or a poll tick makes LuCI
	 * replace the whole #maincontent with an error page, which reads as "the
	 * header flashed and went away". Pinning the error to a fixed banner keeps
	 * it visible and diagnosable instead. */
	errorBar: function(msg) {
		try {
			var bar = document.getElementById('clients-error-banner');

			if (!bar) {
				bar = E('div', {
					'id': 'clients-error-banner',
					'style': 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#a02020;color:#fff;padding:0.5rem 1rem;font:12px/1.6 monospace;white-space:pre-wrap;max-height:40%;overflow:auto'
				});
				document.body.appendChild(bar);
			}

			bar.textContent += (bar.textContent ? '\n' : '') + msg;
		}
		catch (e) { /* the banner must never be the reason something fails */ }
	},

	render: function() {
		var self = this;

		common.ensureStylesheet();

		window.addEventListener('error', function(ev) {
			self.errorBar(ev.message + ' @ ' + (ev.filename || '') + ':' + ev.lineno);
		});

		window.addEventListener('unhandledrejection', function(ev) {
			var r = ev.reason;

			self.errorBar((r && (r.message || r)) || 'unhandled rejection');
		});

		this.title = E('h2', {}, tabDef(this.active).title);

		this.tabbar = E('ul', { 'class': 'cbi-tabmenu' }, TABS.map(function(tab) {
			return E('li', {
				'class': (tab.name == self.active) ? 'cbi-tab' : 'cbi-tab-disabled',
				'data-tab': tab.name,
				'role': 'tab'
			}, [
				E('a', {
					'href': '#',
					'click': ui.createHandlerFn(self, 'handleTab', tab.name)
				}, tab.label)
			]);
		}));

		/* Panes in TABS order; only the active one is mounted right away. */
		this.nodes = {};
		var panes = TABS.map(function(tab) {
			var pane = E('div', {
				'class': 'clients-tabpane',
				'data-tab': tab.name,
				'style': (tab.name == self.active) ? '' : 'display:none'
			});

			self.nodes[tab.name] = pane;

			return pane;
		});

		this.mount(this.active);

		return E('div', { 'class': 'cbi-map' }, [
			this.title,
			this.tabbar,
			E('div', { 'class': 'clients-tabwrap' }, panes)
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
