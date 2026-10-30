# Build rules

Every rule here came from a mistake in a real build. Paste this file into each batch brief.

## Source of truth

- Read the code. Screenshots of the running product are for checking layout, never the source.
- **Every word comes from the code**: the screen, its components, their empty and error messages, or the product's real
  data source. List any string you could not find.
- Demo data only: the product's sample persona, `example.com` emails, initials for avatars.
- In the running product, look and go back. Never save, submit, send, pay, accept, revoke or delete, unless your
  brief quotes the person allowing that action on a test account.

## Variables and themes

- Every colour is a variable in one collection with a mode per theme. Every gap, padding and radius binds a size
  variable where a token exists. Every text uses a text style. Every shadow is an effect style.
- Name variables after the code tokens, and put the token's code name in each variable's description.
- Light and dark are **one frame with a different variable mode**, never two drawings.
- Set the default theme **once, on the page**. Frames follow the page, so the whole page flips with one switch.
- Only two kinds of frame set their own mode: a pair shown in both themes on purpose (name them "/ Light" and
  "/ Dark"), and a screen the code always shows in one theme (name it "(always dark)" or "(always light)"). A part the
  code always shows in one theme (a toast that ignores the theme) gets the same mode and name on its component.
  Sections and inner layers never set a mode. Designers want every toggle on auto.
- **Trap:** a frame's own fill follows its parent's mode, not its own. A "/ Light" frame on a Dark page shows a dark
  background with light content. Fix: a locked rectangle named "Theme background", bound to the background colour, as
  the frame's first child.
- **Rebind sweep after every batch:** walk the batch's frames for solid fills and strokes with no variable bound. Look
  each colour up in the variables (a reverse index from value to variable for the frame's mode), bind the match, and
  list the colours with no match in the report. In the same walk, check every text uses a text style: special text
  (an uppercase label, a badge) loses its style most often.
- **A bound paint loses its own opacity on a mode switch.** For a colour with alpha (`bg-black/50`), draw a child layer
  with layer opacity, or bake the alpha into a variable.
- **Figma-only variables** fill what the tokens do not: a per-theme pair the code writes as classes (Tailwind `dark:`),
  the page chrome. Put them in a `figma/` group, each with a description naming the classes or the use. An image shown
  in one theme only gets a boolean variable (with a mode per theme) bound to its visibility.
- **Colours are sRGB.** Code colours are sRGB; check the file's colour profile before building, and write values as
  0 to 1 sRGB channels.
- **Trap:** a layer cloned from a frame of the other theme can keep a stale colour. Scan bound paints: compare the
  stored colour with the variable's value for the node's mode, and re-bind the ones that differ.

## Components

- Reuse before you build: list every component on the design system page first.
- Every icon is **one vector named "Vector"**, so a colour override survives an icon swap. Name icon components after
  the code's icon names, so people can search one name in both places. Take the SVGs from the icon package at the
  version the code uses (for example `lucide-static` for lucide). Swapping an icon to itself resets its colour: skip
  the swap when it is already right.
- Variants where the code has states; properties where they help. Text properties share one default across variants,
  so set real text on each instance.
- Each component has a description: its source file and one line on when to use it. No double quotes in descriptions.
- Group components by one rule. Ours: building blocks by type (actions, inputs, status, lists, cards, navigation,
  brand); a component used in only one area goes in that area's group. Count instances to decide.
- Each component sits on a card: the main component in a Light panel (edit it there), live instances in a Dark panel.
- A component that shows a value (a progress bar, a meter) gets a free width or a numeric property, not stepped
  variants: steps of 25 drew 51% as 50%.
- Re-binding an instance's fill to the same variable as its main renders black: copy the main's fills instead.
- A nested instance's size cannot be overridden. Expose the size on the inner component, or swap to a variant.

## Layout on the canvas

- Follow the page plan from the map: your brief names the page and the place for each section. Put each section
  there at once; parking it elsewhere to move later breaks the plan.
- Build new nodes off to the side, then move them into place. Only the Contents frame sits at the page origin (0, 0).
- Rows and columns stay within about 15,000 px (at 1440 wide, about 8 frames to a row; wrap the rest onto a new line),
  and nothing goes past about 60,000 px from the origin: Figma's canvas misbehaves beyond that.
- Inside a page: sections 200 apart. Inside a section: one row per screen, then each state to the right. A notes
  column at the right of each section: the flow, the states drawn, motion and haptics, what is not drawn and why.
- A Contents frame at 0, 0 on each page, linking every row and section.
- **Page look:** sections fill with a neutral grey Figma-only variable, shared across products, never white or tinted,
  so light frames stand out. Notes are cream cards, from a variable. Captions and notes wrap at a fixed width (520 px):
  one or two plain sentences; class and token detail goes in the component description.
- Name every frame clearly: "Contacts / Empty". No layers named "Frame 123".
- Prefix helper nodes with `__` and delete them before the batch ends.
- After each batch: no two sections overlap, no notes cover a frame, sections fit their content.

## Figma tool habits

- Return every new node id from every call, and record ids in the progress file's Registry.
- `clone()` lands the copy on the current page, not beside the original. Append each clone to its target section at
  once.
- Write a value you could not measure (a spacing, a size) as a visible marker in the notes, never a guess.
- A failed `use_figma` call rolls back completely. Fix it and run it again.
- `node.screenshot()` inside a script can show stale colours. Check with the `get_screenshot` tool.
- `upload_assets` cannot target a layer inside an instance. Upload to a temporary rectangle, copy its `imageHash` into
  the instance's fill, delete the rectangle.
- A library not enabled on the file (for example a platform UI kit) cannot be imported. Draw local stand-ins and say so.
- Do not scale a clone of a screen down: size variables do not scale. For small previews, export the real frame with
  `exportAsync` and place the image.
- Before changing a setting on many layers at once, list what will change and check the list. We once cleared the theme
  on 28 frames that had to stay dark.
- `findOne` by name can hit a text layer first: filter by type.

## Large edits (a token rename, a component merge, a whole-file sweep)

- **Read and count on the server, one page per call.** A whole-file scan in the browser console froze the tab on a page
  of 60,000 nodes; the Figma tool did it in seconds per page.
- **Only words and fonts need the brand font.** Rebinding a colour variable on a text layer's fill works without it;
  changing its characters, text style or font does not.
- **Move many nodes between pages one group per call**, and read back the frame count on both pages after each.
- **Retire a token in four moves:** rebind the main components first (instances follow), then the remaining overrides
  page by page, recount until nothing uses it, then delete it.
- **Merge a component by swapping, then deleting:** read each old instance's text, `swapComponent` to the new variant,
  write the text back, recount to zero, delete the old main.
- **Leave card titles, descriptions and notes alone during a swap** if they are in the brand font outside the text
  styles. List them, and edit them from the browser after the font swap.

## In the browser (Claude in Chrome)

- Wait about 30 seconds after the file opens before loading local fonts. An early test says the font is missing when it
  is not.
- The `figma` object there has no `createAutoLayout`. Use `createFrame()` and set `layoutMode`.
- Each JavaScript call times out after about 45 seconds. For a long job, start an async function that writes its result
  to `window`, then read that value in a later call. Awaiting it directly returns `{}`.
- `deleteCharacters(start, end)` takes an end index, not a length.
- Close the tab when you are done.
