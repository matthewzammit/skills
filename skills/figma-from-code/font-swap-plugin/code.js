// Figma from code: font swap. Swaps Inter (the stand-in the Figma tool can write) for your brand font, and back.
// Edit the three constants, then run a command from Plugins > Development > Figma from code: font swap.
// Run it in the Figma DESKTOP app on a computer that has the brand font installed.
// It changes local text styles first, then stray text layers (Inter with no text style) on every page.
// It never removes or renames anything.

const BRAND_FAMILY = 'Your Brand Font';

// Inter style -> brand style. Use the exact style names your font has in Figma.
const TO_BRAND = { 'Regular': 'Regular', 'Medium': 'Medium', 'Semi Bold': 'Semi Bold', 'Bold': 'Bold' };

// Brand style -> Inter style (the reverse of the table above).
const TO_INTER = { 'Regular': 'Regular', 'Medium': 'Medium', 'Semi Bold': 'Semi Bold', 'Bold': 'Bold' };

async function swap(from, to, map) {
  // A style the table does not list falls back to the first entry (normally Regular).
  const fallback = Object.values(map)[0];
  const target = (style) => ({ family: to, style: map[style] || fallback });

  try {
    for (const style of new Set(Object.values(map))) await figma.loadFontAsync({ family: to, style });
  } catch (e) {
    figma.closePlugin(`${to} could not be loaded. Run this in the Figma desktop app on a computer that has the font installed.`);
    return;
  }

  let styles = 0, layers = 0, runs = 0;

  for (const st of await figma.getLocalTextStylesAsync()) {
    if (st.fontName.family !== from) continue;
    await figma.loadFontAsync(st.fontName);
    st.fontName = target(st.fontName.style);
    styles++;
  }

  await figma.loadAllPagesAsync();
  for (const page of figma.root.children) {
    for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) {
      if (t.hasMissingFont) continue;
      let touched = false;
      for (const seg of t.getStyledTextSegments(['fontName', 'textStyleId'])) {
        if (seg.fontName.family !== from) continue;
        if (seg.textStyleId) continue; // follows a text style, which was handled above
        await figma.loadFontAsync(seg.fontName);
        t.setRangeFontName(seg.start, seg.end, target(seg.fontName.style));
        runs++; touched = true;
      }
      if (touched) layers++;
    }
  }

  figma.closePlugin(`Done: ${styles} text styles and ${layers} text layers (${runs} runs) now use ${to}.`);
}

if (figma.command === 'toInter') swap(BRAND_FAMILY, 'Inter', TO_INTER);
else swap('Inter', BRAND_FAMILY, TO_BRAND);
