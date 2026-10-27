// Figma from code: font swap, for the browser console on figma.com (no desktop app needed).
// Open the file at figma.com, open DevTools > Console, then paste this whole file. A `figma` global exists
// once the file is open. Then call `await toBrand()` or `await toInter()`.
//
// Tips:
// - Wait about 30 seconds after the file opens so local and team fonts have loaded.
// - Each console call times out after about 45 seconds. For a big file run it page by page: the styles pass
//   repeats harmlessly on each call (swapped styles are skipped), and the text-layer pass takes an optional page argument (default: the current page),
//   for example `await toBrand(figma.root.children[2])`.
// - Keep long results on `window` and read them in a later call: `window.swapLog`.
// - Paste the file once per tab (a second paste fails on the repeated const names). Edit the three constants first. Run only where the brand font is available, or it stops with a message.

const BRAND_FAMILY = 'Your Brand Font';
const TO_BRAND = { 'Regular': 'Regular', 'Medium': 'Medium', 'Semi Bold': 'Semi Bold', 'Bold': 'Bold' };
const TO_INTER = { 'Regular': 'Regular', 'Medium': 'Medium', 'Semi Bold': 'Semi Bold', 'Bold': 'Bold' };

async function swapStyles(from, to, map) {
  const fallback = Object.values(map)[0];
  let styles = 0;
  for (const st of await figma.getLocalTextStylesAsync()) {
    if (st.fontName.family !== from) continue;
    await figma.loadFontAsync(st.fontName);
    st.fontName = { family: to, style: map[st.fontName.style] || fallback };
    styles++;
  }
  return styles;
}

// Stray text layers: runs in `from` that follow no text style. Only the given page is touched.
async function swapLayers(from, to, map, page = figma.currentPage) {
  const fallback = Object.values(map)[0];
  let layers = 0, runs = 0;
  await page.loadAsync();
  for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) {
    if (t.hasMissingFont) continue;
    let touched = false;
    for (const seg of t.getStyledTextSegments(['fontName', 'textStyleId'])) {
      if (seg.fontName.family !== from || seg.textStyleId) continue;
      await figma.loadFontAsync(seg.fontName);
      t.setRangeFontName(seg.start, seg.end, { family: to, style: map[seg.fontName.style] || fallback });
      runs++; touched = true;
    }
    if (touched) layers++;
  }
  return { layers, runs };
}

async function swap(from, to, map, page) {
  try {
    for (const style of new Set(Object.values(map))) await figma.loadFontAsync({ family: to, style });
  } catch (e) {
    return `${to} could not be loaded. Wait 30 seconds after the file opens, and run this where the font is installed.`;
  }
  const styles = await swapStyles(from, to, map);
  const { layers, runs } = await swapLayers(from, to, map, page);
  const msg = `Done: ${styles} text styles, ${layers} text layers (${runs} runs) on "${(page || figma.currentPage).name}" now use ${to}.`;
  (window.swapLog = window.swapLog || []).push(msg);
  return msg;
}

const toBrand = (page) => swap('Inter', BRAND_FAMILY, TO_BRAND, page);
const toInter = (page) => swap(BRAND_FAMILY, 'Inter', TO_INTER, page);
