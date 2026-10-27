# The file's own rules

A mirror file drifts by itself too: someone edits a mirror page, a helper layer is left behind, a theme setting
changes. Check each rule with read-only `use_figma` calls, one page per call (switch the page once per call). Report
at most 20 violations per rule, then a count.

Take the expected sections and overlays from `figma-diff.js --json` (`expectedSections`, `overlays`).

1. **Every expected section exists** on the Screens page (sections may be nested inside row sections). List the
   missing ones.
2. **Every overlay has a frame**: each `overlays` regex (with its flags) matches at least one frame name on the
   Screens page. List the missing ones.
3. **Theme modes** (if the file draws each theme as one frame with a variable mode): the page has the default mode set. Only frames named "/ Light", "/ Dark" or "(always <theme>)" set
   their own mode. No section and no inner layer sets one, except an instance of a component variant that fixes its
   theme by design. List violations.
4. **No helper layers:** no layer whose name starts with `__` on any mirror page.
5. **No font stand-in left:** if a brand font failed the Figma tool's font check, no text on the mirror pages uses
   Inter. Count and name up to
   10.
6. **No overlaps:** no two top-level rows, and no two sections inside a row, overlap on the Screens page.
7. **Nothing at the origin:** no top-level node at (0, 0) except the page's first row, if that is the layout.

If a Figma call fails because the tool is not signed in or not available, say so, and still report the code side.
