'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	sliderCleanups: null,

	__init__: function() {
		var self = this;
		this.sliderCleanups = [];
		L.resolveDefault(ui.menu.load(), null).then(function(tree) {
			if (tree)
				self.render(tree);
		});
	},

	/* Icon SVG paths for top-level sidebar categories (stroke-based, 24x24 viewBox) */
	icons: {
		'status':      '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
		'system':      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
		'network':     '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
		'services':    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
		'nas':         '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
		'vpn':         '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
		'docker':      '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
		'logout':      '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
		'_default':    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
	},

	getIcon: function(name) {
		var pathData = this.icons[name] || this.icons['_default'];
		var markup = '<svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + pathData + '</svg>';
		var doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
		return document.importNode(doc.documentElement, true);
	},

	render: function(tree) {
		var container = document.getElementById('sidebar-nav');
		if (!container) return;

		for (var cleanup of this.sliderCleanups)
			cleanup();
		this.sliderCleanups = [];

		/* Clear existing menu elements to prevent duplicates on re-render (e.g. Save & Apply) */
		container.innerHTML = '';

		var headerNav = document.getElementById('header-nav');
		if (headerNav) {
			/* Remove only tabs and sliders, preserve header-title */
			var old = headerNav.querySelectorAll('.header-tab, .tab-slider');
			for (var k = 0; k < old.length; k++) old[k].remove();
		}

		var headerTabs = document.getElementById('header-tabs');
		if (headerTabs) headerTabs.innerHTML = '';

		var topChildren = ui.menu.getChildren(tree);

		for (var i = 0; i < topChildren.length; i++) {
			var topNode = topChildren[i];
			var isTopActive = L.env.requestpath.length
				? topNode.name == L.env.requestpath[0]
				: i == 0;

			if (isTopActive) {
				this.renderSidebarMenu(container, topNode, topNode.name);
			}
		}

		/* Render mode menu (top-level tabs) if more than one category */
		if (topChildren.length > 1) {
			this.renderModeMenu(topChildren);
		}

		/* Set header title from the deepest active menu node */
		var titleEl = document.getElementById('header-title');
		if (titleEl) {
			var node = tree;
			var title = '';
			for (var i = 0; i < L.env.dispatchpath.length && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				if (node && node.title)
					title = node.title;
			}
			titleEl.textContent = title ? _(title) : '';
		}

		/* Render tab menu for sub-sub pages */
		if (L.env.dispatchpath.length >= 3) {
			var node = tree;
			var url = '';
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}
			if (node)
				this.renderTabMenu(node, url);
		}
	},

	/* Shared: position a slider behind the active tab element */
	positionTabSlider: function(container, slider, activeEl, animate) {
		if (!activeEl) return;
		if (!animate) slider.style.transition = 'none';
		slider.style.left = activeEl.offsetLeft + 'px';
		slider.style.width = activeEl.offsetWidth + 'px';
		slider.style.opacity = '1';
		if (!animate) {
			requestAnimationFrame(function() {
				slider.style.transition = '';
			});
		}
	},

	/* Shared: add slider to a horizontal tab container */
	addTabSlider: function(container, navigateOnClick) {
		var slider = E('div', { 'class': 'tab-slider' });
		container.insertBefore(slider, container.firstChild);
		var self = this;
		var frame = null;

		function position(animate) {
			if (frame != null)
				cancelAnimationFrame(frame);

			frame = requestAnimationFrame(function() {
				frame = null;
				var active = container.querySelector('.header-tab.active, .sub-tab.active');
				self.positionTabSlider(container, slider, active, animate);
			});
		}

		/* Page links use native navigation; in-page tabs only move the slider. */
		var tabs = container.querySelectorAll('.header-tab, .sub-tab');
		if (!navigateOnClick) {
			for (var i = 0; i < tabs.length; i++) {
				(function(tab, sl) {
					tab.addEventListener('click', function() {
						self.positionTabSlider(container, sl, tab, true);
					});
				})(tabs[i], slider);
			}
		}

		/* Position on active tab */
		position(false);

		/* Keep the selector aligned after font loading, viewport changes and
		 * translated labels alter tab widths. */
		if (window.ResizeObserver) {
			var observer = new ResizeObserver(function() { position(false); });
			observer.observe(container);
			this.sliderCleanups.push(function() { observer.disconnect(); });
		} else {
			var resize = function() { position(false); };
			window.addEventListener('resize', resize);
			this.sliderCleanups.push(function() { window.removeEventListener('resize', resize); });
		}

		return slider;
	},

	renderModeMenu: function(topChildren) {
		var container = document.getElementById('header-nav');
		if (!container) return;

		for (var i = 0; i < topChildren.length; i++) {
			var child = topChildren[i];
			var isActive = L.env.requestpath.length
				? child.name == L.env.requestpath[0]
				: i == 0;

			var item = E('a', {
				'class': 'header-tab' + (isActive ? ' active' : ''),
				'href': L.url(child.name),
				'data-name': child.name,
				'aria-current': isActive ? 'page' : null
			}, [ _(child.title) ]);

			container.appendChild(item);
		}

		/* Add sliding selector */
		this.addTabSlider(container, true);
	},

	renderSidebarMenu: function(container, tree, url) {
		var children = ui.menu.getChildren(tree);
		if (children.length == 0) return;

		var group = E('div', { 'class': 'nav-group' });

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var subChildren = ui.menu.getChildren(child);
			var hasChildren = subChildren.length > 0;

			var isActive = L.env.dispatchpath[1] == child.name;

			/* For items with children, link to first child */
			var linkUrl = hasChildren
				? L.url(url, child.name, subChildren[0].name)
				: L.url(url, child.name);

			var submenuId = 'glass-nav-' + i;
			var item = E('a', {
				'class': 'nav-item' + (isActive ? ' open' : ''),
				'href': linkUrl,
				'data-name': child.name,
				'aria-expanded': hasChildren ? (isActive ? 'true' : 'false') : null,
				'aria-controls': hasChildren ? submenuId : null
			}, [
				E('span', { 'class': 'nav-label' }, [ _(child.title) ])
			]);

			/* Add icon before the label */
			item.insertBefore(this.getIcon(child.name), item.firstChild);

			if (hasChildren) {
				item.appendChild(E('svg', {
					'class': 'nav-arrow',
					'viewBox': '0 0 24 24',
					'fill': 'none',
					'stroke': 'currentColor',
					'stroke-width': '2'
				}, [
					E('polyline', { 'points': '9 18 15 12 9 6' })
				]));

				}

			group.appendChild(item);

			if (hasChildren) {
				var subMenu = E('div', {
					'class': 'nav-sub' + (isActive ? ' open' : ''),
					'id': submenuId,
					'aria-hidden': isActive ? 'false' : 'true',
					'inert': isActive ? null : ''
				});

				/* Sliding highlight indicator */
				var slider = E('div', { 'class': 'nav-slider' });
				subMenu.appendChild(slider);

				for (var j = 0; j < subChildren.length; j++) {
					var sub = subChildren[j];
					var isSubActive = isActive && L.env.dispatchpath[2] == sub.name;

					var subItem = E('a', {
						'class': 'nav-item' + (isSubActive ? ' active' : ''),
						'href': L.url(url, child.name, sub.name),
						'aria-current': isSubActive ? 'page' : null
					}, [
						E('span', { 'class': 'nav-label' }, [ _(sub.title) ])
					]);

					subMenu.appendChild(subItem);
				}

				/* Position slider on the active item after render */
				(function(sm, sl) {
					requestAnimationFrame(function() {
						var active = sm.querySelector('.nav-item.active');
						if (active) {
							sl.style.transition = 'none';
							sl.style.top = active.offsetTop + 'px';
							sl.style.height = active.offsetHeight + 'px';
							sl.style.opacity = '1';
							/* Re-enable transition after initial position */
							requestAnimationFrame(function() {
								sl.style.transition = '';
							});
						}
					});
				})(subMenu, slider);

				group.appendChild(subMenu);

				/* Bind click handler to toggle submenu */
				(function(navItem, subEl) {
					function toggleSubmenu() {
						var open = !subEl.classList.contains('open');
						subEl.classList.toggle('open', open);
						navItem.classList.toggle('open', open);
						navItem.setAttribute('aria-expanded', open ? 'true' : 'false');
						subEl.setAttribute('aria-hidden', open ? 'false' : 'true');
						if (open) subEl.removeAttribute('inert');
						else subEl.setAttribute('inert', '');
					}

					navItem.addEventListener('click', function(ev) {
						if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey)
							return;
						ev.preventDefault();
						toggleSubmenu();
					});

					navItem.addEventListener('keydown', function(ev) {
						if (ev.key === ' ') {
							ev.preventDefault();
							toggleSubmenu();
						}
					});
				})(item, subMenu);
			}
		}

		container.appendChild(group);
	},

	renderTabMenu: function(tree, url, level) {
		var container = document.getElementById('header-sub');
		if (!container) return E([]);

		var children = ui.menu.getChildren(tree);
		if (children.length == 0)
			return E([]);

		/* Clear any CBI tabs that footer.ut added before menu loaded */
		container.innerHTML = '';
		container.setAttribute('data-source', 'menu');
		container.classList.remove('active');
		document.body.classList.remove('has-sub-nav');

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = L.env.dispatchpath[3 + (level || 0)] == child.name;

			container.appendChild(E('a', {
				'class': 'sub-tab' + (isActive ? ' active' : ''),
				'href': L.url(url, child.name),
				'aria-current': isActive ? 'page' : null
			}, [ _(child.title) ]));
		}

		container.classList.add('active');
		document.body.classList.add('has-sub-nav');

		/* Add sliding selector */
		this.addTabSlider(container, true);

		/* Do NOT recurse — deeper menu-tree levels stay in-content as CBI tabmenus */
	}
});
