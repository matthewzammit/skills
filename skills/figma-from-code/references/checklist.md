# Checks that are easy to forget

Run these before you call the build done.

- [ ] Every **full screen with no route** (offline, update required, lock, splash, intro) is drawn.
- [ ] **Every state in every theme.** No state drawn in one theme only, unless the person said so.
- [ ] Screens the code **always** shows in one theme are named "(always dark)" or "(always light)" and fix that mode.
- [ ] **No real customer data**, and no tokens, keys or private URLs in any frame or screenshot.
- [ ] **Text contrast** holds on every surface. Notes say where the layout changes at the largest text size (mobile)
      or 200% zoom (web).
- [ ] **System controls** are listed as not drawn. Mobile: pickers, camera, share sheet, biometrics, permission
      prompts. Web: browser chrome, file picker, print dialog, third-party iframes.
- [ ] **Web: every control's hover, focus and disabled states** are variants on the design system page, and every
      chosen width is drawn.
- [ ] **Motion and haptics** are described in the notes.
- [ ] **Nothing at the origin**, no `__` helper nodes, no overlaps, no layers named "Frame 123".
- [ ] **No text left in the Inter stand-in** once the brand font swap is done.
- [ ] **Every variable's value read back** and matched with the code tokens, in every mode.
- [ ] **No unbound colour** that matches a token (the rebind sweep found nothing left).
- [ ] **Every screen uses component instances** where the code uses components.
- [ ] **Old Figma pages** are left alone or moved under a divider with the person's OK, never deleted.
- [ ] Each page has a **Contents** frame, and the design system page has "How to use this page" and real counts.
- [ ] Later, maybe: Code Connect links from each Figma component to its code component.
