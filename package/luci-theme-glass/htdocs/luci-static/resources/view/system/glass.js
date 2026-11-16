'use strict';
'require view';
'require form';
'require uci';
'require fs';

function renderColorInput() {
	var node = form.Value.prototype.renderWidget.apply(this, arguments);
	var input = node.querySelector('input');
	if (input) {
		input.type = 'color';
		input.classList.add('glass-color-input');
	}
	return node;
}

function renderRangeInput(min, max, step, suffix) {
	return function() {
		var node = form.Value.prototype.renderWidget.apply(this, arguments);
		var input = node.querySelector('input');
		if (!input) return node;

		input.type = 'range';
		input.min = min;
		input.max = max;
		input.step = step;
		input.classList.add('glass-range');
		node.classList.add('glass-range-control');

		var output = E('output', {
			'class': 'glass-range-value',
			'for': input.id
		});

		function updateOutput() {
			output.value = input.value;
			output.textContent = input.value + (suffix || '');
		}

		input.addEventListener('input', updateOutput);
		updateOutput();
		node.appendChild(output);
		return node;
	};
}

function validateColor(sectionId, value) {
	return /^#[0-9a-f]{6}$/i.test(value) || _('Invalid hexadecimal value');
}

function validateOpacity(sectionId, value) {
	var n = Number(value);
	return (value !== '' && Number.isFinite(n) && n >= 0 && n <= 1) ||
		_('Expecting: %s').format(_('a number between 0 and 1'));
}

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('glass'),
			L.resolveDefault(fs.list('/www/luci-static/glass/background'), [])
		]);
	},

	render: function (data) {
		var backgroundOrder = [ 'bg.jpg', 'bg.jpeg', 'bg.png', 'bg.gif', 'bg.webp', 'bg.mp4', 'bg.webm' ];
		var names = (data[1] || []).map(function(f) { return f.name; });
		var bgName = backgroundOrder.find(function(name) { return names.indexOf(name) !== -1; }) || null;
		var hasBg = bgName != null;

		var m, s, o;

		m = new form.Map('glass', _('Glass Theme'),
			_('Configure the appearance of the Glass theme. Changes take effect after saving and refreshing the page.'));

		/* ── General ── */
		s = m.section(form.NamedSection, 'global', 'global', _('General'));
		s.anonymous = true;

		o = s.option(form.ListValue, 'mode', _('Theme mode'),
			_('Controls the overall appearance. "Normal" follows the system preference.'));
		o.value('normal', _('Auto (follow system)'));
		o.value('light', _('Light'));
		o.value('dark', _('Dark'));
		o.default = 'normal';
		o.rmempty = false;

		o = s.option(form.ListValue, 'effects', _('Effects profile'),
			_('Balanced keeps blur on primary navigation and overlays. Reduced disables backdrop blur and most motion.'));
		o.value('balanced', _('Balanced'));
		o.value('full', _('Full'));
		o.value('reduced', _('Reduced'));
		o.default = 'balanced';
		o.rmempty = false;

		o = s.option(form.Flag, 'status_bar', _('Header status bar'),
			_('Show live system stats (CPU, RAM, network, uptime) in the header. Disable to reduce resource usage on low-end devices.'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.ListValue, 'font_size', _('Base font size'),
			_('Scales all text in the theme. Larger values improve readability on high-DPI displays.'));
		o.value('13', _('Small (13px)'));
		o.value('14', _('Normal (14px)'));
		o.value('16', _('Large (16px)'));
		o.value('18', _('Extra Large (18px)'));
		o.default = '14';

		/* ── Colors ── */
		s = m.section(form.NamedSection, 'global', 'global', _('Accent Colors'));
		s.anonymous = true;

		o = s.option(form.Value, 'primary', _('Primary color (light mode)'),
			_('Accent color used for active elements, links, and buttons in light mode.'));
		o.default = '#007AFF';
		o.placeholder = '#007AFF';
		o.validate = validateColor;
		o.renderWidget = renderColorInput;

		o = s.option(form.Value, 'dark_primary', _('Primary color (dark mode)'),
			_('Accent color used for active elements, links, and buttons in dark mode.'));
		o.default = '#0A84FF';
		o.placeholder = '#0A84FF';
		o.validate = validateColor;
		o.renderWidget = renderColorInput;

		/* ── Glass Effects (Light Mode) ── */
		s = m.section(form.NamedSection, 'global', 'global', _('Glass Effects — Light Mode'));
		s.anonymous = true;

		o = s.option(form.Value, 'blur', _('Blur intensity (px)'),
			_('Backdrop blur radius for glass panels. Higher values create a more frosted appearance.'));
		o.default = '20';
		o.placeholder = '20';
		o.datatype = 'range(0,50)';
		o.renderWidget = renderRangeInput('0', '50', '1', 'px');

		o = s.option(form.Value, 'transparency', _('Panel transparency'),
			_('Background opacity of glass panels (0 = fully transparent, 1 = fully opaque).'));
		o.default = '0.72';
		o.placeholder = '0.72';
		o.validate = validateOpacity;
		o.renderWidget = renderRangeInput('0', '1', '0.01', '');

		/* ── Glass Effects (Dark Mode) ── */
		s = m.section(form.NamedSection, 'global', 'global', _('Glass Effects — Dark Mode'));
		s.anonymous = true;

		o = s.option(form.Value, 'blur_dark', _('Blur intensity (px)'),
			_('Backdrop blur radius for glass panels in dark mode.'));
		o.default = '25';
		o.placeholder = '25';
		o.datatype = 'range(0,50)';
		o.renderWidget = renderRangeInput('0', '50', '1', 'px');

		o = s.option(form.Value, 'transparency_dark', _('Panel transparency'),
			_('Background opacity of glass panels in dark mode (0 = fully transparent, 1 = fully opaque).'));
		o.default = '0.30';
		o.placeholder = '0.30';
		o.validate = validateOpacity;
		o.renderWidget = renderRangeInput('0', '1', '0.01', '');

		/* ── Background ── */
		s = m.section(form.NamedSection, 'global', 'global', _('Background'));
		s.anonymous = true;

		o = s.option(form.DummyValue, '_bg_info', _('Current background'));
		o.cfgvalue = function () {
			return hasBg
				? _('Active') + ': ' + bgName
				: _('No background set. Upload an image or video named "bg" (e.g. bg.jpg, bg.png, bg.mp4) to /www/luci-static/glass/background/ via SCP.');
		};

		return m.render();
	}
});
