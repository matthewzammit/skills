// Helpers to paste at the top of a use_figma script that draws screens. Text writes need the text styles on a font
// the Figma tool can load (references/font-problem.md). Set the three names below, and fill ID from your first
// read-only listing of the design system page.

// Set these three: this batch's screens page id, the colour collection name, and its two theme mode names.
const SCREENS_PAGE_ID = '<page id>';
const COLOUR_COLLECTION = '<colour collection name>';
const MODES = { light: 'Light', dark: 'Dark' };

const page = await figma.getNodeByIdAsync(SCREENS_PAGE_ID);
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const colour = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === COLOUR_COLLECTION);
const LM = colour.modes.find((m) => m.name === MODES.light).modeId;
const DM = colour.modes.find((m) => m.name === MODES.dark).modeId;
const vars = await figma.variables.getLocalVariablesAsync();
const V = (n) => { const v = vars.find((x) => x.name === n); if (!v) throw new Error('no var ' + n); return v; };
const paint = (n, o) => { const p = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(n)); return o == null ? p : { ...p, opacity: o }; };
const tstyles = await figma.getLocalTextStylesAsync();
const al = (dir, name, props = {}) => { const f = figma.createAutoLayout(dir, { name, ...props }); f.fills = []; return f; };
// Text on a Type/* style, coloured by a variable: T('Save', 'label', 'text/text').
const T = async (s, style, cv, o = {}) => { const t = figma.createText(); const st = tstyles.find((x) => x.name === 'Type/' + style); if (!st) throw new Error('no style ' + style); await t.setTextStyleIdAsync(st.id); t.characters = s; t.fills = [paint(cv)]; if (o.name) t.name = o.name; if (o.center) t.textAlignHorizontal = 'CENTER'; return t; };
const gap = (n, nm) => n.setBoundVariable('itemSpacing', V(nm));
const pad = (n, t, r, b, l) => { [['paddingTop', t], ['paddingRight', r], ['paddingBottom', b], ['paddingLeft', l]].forEach(([k, nm]) => { if (nm) n.setBoundVariable(k, V(nm)); else if (nm === 0) n[k] = 0; }); };
const rad = (n, nm) => ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach((k) => n.setBoundVariable(k, V(nm)));

// Components by short key, ids from the listing: { btn: '12:34', status: '12:56', back: '12:78', home: '12:90' }.
const ID = {};
const C = {}; for (const [k, id] of Object.entries(ID)) C[k] = await figma.getNodeByIdAsync(id);
const vr = (set, props) => set.type === 'COMPONENT_SET' ? set.children.find((c) => Object.entries(props).every(([k, v]) => c.name.split(', ').includes(k + '=' + v))) : set;
// An instance of a component, optionally of one variant: mk('btn', { Variant: 'Primary' }).
const mk = (k, vp) => { const set = C[k]; const c = vp ? vr(set, vp) : (set.type === 'COMPONENT_SET' ? set.defaultVariant : set); if (!c) throw new Error('no variant ' + k + JSON.stringify(vp)); return c.createInstance(); };
// Set component properties by their base name, without the "#12:3" suffix.
const setP = (inst, map) => { const p = {}; for (const k of Object.keys(inst.componentProperties)) { const b = k.split('#')[0]; if (b in map) p[k] = map[b]; } inst.setProperties(p); return inst; };
const txtOf = (n, name) => n.findOne((x) => x.type === 'TEXT' && x.name === name);
const lines = (t, k) => { t.maxLines = k; t.textTruncation = 'ENDING'; };
const fill = (n) => { n.layoutSizingHorizontal = 'FILL'; return n; };
const img = (n, hash) => { n.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }]; if ('children' in n) for (const c of [...n.children]) c.remove(); };

// A phone frame (402 x 874 here: use your device size) in a section, its content column, chrome, and final height.
// status, back and home are your status bar, back button and home indicator components; the colour names are yours.
const frame = (name, sec) => { const f = figma.createFrame(); f.name = name; f.resize(402, 874); f.fills = [paint('surface/background')]; f.clipsContent = true; sec.appendChild(f); return f; };
const body = (f, y = 126) => { const c = al('VERTICAL', 'Content'); c.resize(370, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; gap(c, 'spacing/xxl'); c.paddingBottom = 48; f.appendChild(c); c.x = 16; c.y = y; return c; };
const chrome = (f, o = {}) => { const s = mk('status'); f.appendChild(s); s.x = 0; s.y = 0; let b = null; if (o.back !== false) { b = mk('back'); f.appendChild(b); b.x = 16; b.y = 62; } return { s, b }; };
const fin = (f, c, min = 874) => { const h = Math.max(min, Math.round(c.y + c.height)); f.resize(402, h); const hi = mk('home'); f.appendChild(hi); hi.x = 0; hi.y = h - 34; return f; };
// Only for the two halves of a "/ Light" + "/ Dark" pair. Every other frame follows the page's mode.
// clone() lands on the current page, so put the copy back in the original's section.
const darkOf = (f, name) => { const d = f.clone(); f.parent.appendChild(d); d.name = name; d.setExplicitVariableModeForCollection(colour, DM); return d; };
const place = (fs, y) => { fs.forEach((f, i) => { f.x = 80 + i * 482; f.y = y; }); return Math.max(...fs.map((f) => f.height)); };
