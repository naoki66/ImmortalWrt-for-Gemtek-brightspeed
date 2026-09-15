'use strict';
/* LuCI view files are loaded as a function body (top-level `return view.extend`,
 * `'require ui'` pseudo-directives), so `node --check` rejects them. Wrapping the
 * source in new Function() parses it with the same shape the browser sees.
 * The wrappers carry 'use strict', so the parse also catches strict-mode-only
 * errors such as legacy octal escapes. */
const fs = require('fs');
let bad = 0;
for (const f of process.argv.slice(2)) {
	if (!fs.existsSync(f)) { console.log('MISSING  %s', f); bad++; continue; }
	const src = fs.readFileSync(f, 'utf8');
	try {
		new Function("'use strict';\n" + src);
		console.log('OK    %s  (%d lines)', f, src.split('\n').length);
	} catch (e) {
		bad++;
		console.log('SYNTAX ERROR  %s\n  %s', f, e.message);
	}
}
process.exit(bad ? 1 : 0);
