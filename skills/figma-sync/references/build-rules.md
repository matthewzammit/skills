# Build rules

Every rule here came from a mistake in a real build. Paste this file into each batch brief.

## Source of truth

- Read the code. Screenshots of the running product are for checking layout, never the source.
- **Every word comes from the code**: the screen, its components, their empty and error messages, or the product's real
  data source. List any string you could not find.
- Demo data only: the product's sample persona, `example.com` emails, initials for avatars.
- In the running product, look and go back. Never save, submit, send, pay, accept, revoke or delete.

## Variables and themes

- Every colour is a variable in one collection with a mode per theme. Every gap, padding and radius binds a size
  variable where a token exists. Every text uses a text style. Every shadow is an effect style.
- Name variables after the code tokens, and put the token's code name in each variable's description.
- Light and dark are **one frame with a different variable mode**, never two drawings.
- Set the default theme **once, on the page**. Frames follow the page, so the whole page flips with one switch.
- Only two kinds of frame set their own mode: a pair shown in both themes on purpose (name them "/ Light" and
  "/ Dark"), and a screen the code always shows in one theme (name it "(always dark)" or "(always light)"). Sections and
  inner layers never set a mode. Designers want every toggle on auto.
- **Trap:** a frame's own fill follows its parent's mode, not its own. A "/ Light" frame on a Dark page shows a dark
  background with light content. Fix: a locked rectangle named "Theme background", bound to the background colour, as
  the frame's first child.
- **Trap:** a layer cloned from a frame of the other theme can keep a stale colour. Scan bound paints: compare the
  stored colour with the variable's value for the node's mode, and re-bind the ones that differ.

## Components

- Reuse before you build: list every component on the design system page first.
- Every icon is **one vector named "Vector"**, so a colour override survives an icon swap. Name icon components after
  the code's icon names, so people can search one name in both places.
- Variants where the code has states; properties where they help. Text properties share one default across variants,
  so set real text on each instance.
- Each component has a description: its source file and one line on when to use it. No double quotes in descriptions.
- Group components by one rule. Ours: building blocks by type (actions, inputs, status, lists, cards, navigation,
  brand); a component used in only one area goes in that area's group. Count instances to decide.
- Each component sits on a card: the main component in a Light panel (edit it there), live instances in a Dark panel.

## Layout on the canvas

- Build new nodes off to the side, then move them into place. Never leave anything at the page origin (0, 0).
- Screens page: one row per area, sections left to right, 200 apart. Inside a section: one row per screen, then each
  state to the right. A notes column at the right of each section: the flow, the states drawn, motion and haptics,
  what is not drawn and why.
- A Contents frame at the top left of each page, linking every row and section.
- Name every frame clearly: "Contacts / Empty". No layers named "Frame 123".
- Prefix helper nodes with `__` and delete them before the batch ends.
- After each batch: no two sections overlap, no notes cover a frame, sections fit their content.

## Figma tool habits

- Return every new node id from every call, and record ids in the progress file.
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
