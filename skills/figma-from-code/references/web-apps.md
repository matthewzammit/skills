# Web apps: what changes

Everything in SKILL.md still applies. These parts differ for a web app.

- **A pixel capture helps.** The Figma plugin's `generate_figma_design` tool captures a running web page into the file
  as a picture with its real spacing and images. Load `figma-generate-design` first; it says how. Use the capture only
  as a **reference**: build the real screen beside it from variables and components with `use_figma`, match it, copy
  any image fills across (logos and photos without uploading), then **delete the capture**. A screen that is only a
  captured picture is not finished: designers cannot edit it. If the capture cannot reach a local server, build from
  the code and compare with browser screenshots.
- **Where the tokens are:** CSS variables, a Tailwind config, a theme file, or a component library's theme. Dark mode
  is often a `dark` class or `prefers-color-scheme`. Map each token to a variable with a mode per theme. Set each
  variable's Web code syntax to the CSS name with the `var()` wrapper: `var(--color-bg-primary)`.
- **Where the screens are:** the router (`app/` or `pages/` folders, a routes file). Modals and drawers are often a
  query parameter or a state flag, not a route: look for them.
- **Frame sizes:** desktop 1440 wide, tablet 768, mobile 390, each the full page height. Name them
  "Invoices / Empty / Desktop". One row per screen: desktop states first, then the other widths.
- **Extra states:** hover, focus (with the focus ring), disabled and pressed for each control, drawn as component
  variants on the design system page, not on every screen. Table states (sorting, filtering, many rows, pagination, no
  results), form validation, toasts, the side navigation open and collapsed, a session timeout or permission error.
- **Not drawn:** browser chrome, the system file picker and print dialog, third-party iframes (payment forms, identity
  checks). List them in the notes.
- **Checking with the product:** a browser at each width. Never submit a form, send an email, pay or delete anything.
- **Accessibility:** note where the layout changes at 200% browser zoom.
