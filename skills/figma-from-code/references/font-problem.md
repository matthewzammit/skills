# The font problem

Claude's Figma tool (`use_figma`) runs on Figma's servers. It can load only the fonts those servers have: Inter and
Google Fonts. A font installed only on your computer fails, and so does any text the tool writes in it.

## Check it

Do this for **every** font family the product uses, and every style of it the code uses (SKILL.md step 2, "Fonts").

1. In `use_figma`, call `await figma.loadFontAsync({ family: '<font>', style: '<style>' })`. If every font loads, skip
   the rest of this page.
2. Otherwise check the browser route: with Claude in Chrome, open the Figma file in a new tab, wait about 30 seconds
   for local fonts, then run `typeof figma` and the same `loadFontAsync` in the page. Check the real style names with
   `(await figma.listAvailableFontsAsync()).filter(f => f.fontName.family === '<brand font>')`.
3. If Chrome cannot load it: the person installs the font and Figma's font installer, and signs in to Figma in Chrome.
   Ask the person before you open their Chrome: it is their browser and their Figma session.
   Fallback: the desktop plugin in [../font-swap-plugin/](../font-swap-plugin/) (Figma desktop app, Plugins >
   Development > Import plugin from manifest).

## Work around it

1. Build every text style in **Inter** as a stand-in. Write down which brand style each Inter style stands for.
2. At the end, switch the **text styles** to the brand font from the browser
   ([../font-swap-plugin/font-swap-console.js](../font-swap-plugin/font-swap-console.js), `toBrand()`), or with the
   desktop plugin. One change per style: every layer using it follows. Then fix any text layer still in Inter.
3. Whenever the tool must write text again (a sync, a fix), switch the styles back to Inter first (`toInter()`), do the
   work, then switch them to the brand font again.

The plugin and the console script are new, general versions of the ones we used; if one fails, fall back to
switching each text style by hand, and report it. Edit `BRAND_FAMILY`, `TO_BRAND` and `TO_INTER` at the top of the script first, with the real style names. With more
than one local font, run the swap once per family, each with its own tables.

Text in the brand font outside the text styles (component card titles, notes) cannot be written by the tool at all.
Leave it alone during a build, list it, and edit it from the browser after the swap.

If your Figma plan has shared organisation fonts, test whether the tool can load the brand font from there. That would
remove this whole workaround.
