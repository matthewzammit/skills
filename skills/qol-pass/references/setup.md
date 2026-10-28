# Setup

Once per repo. It sets the bar every pass judges against, and how to run the product.

## 1. Look

Find out, without asking:

- **The platforms:** mobile when the repo builds an iOS or Android app (an `ios/` or `android/` folder, `app.json`
  for Expo, `pubspec.yaml`, an `.xcodeproj`); web when it serves pages (`next`, `vite`, `nuxt`, `astro`, `remix`,
  `angular`, a `public/` folder with HTML). A repo can be both.
- **How to run it:** `package.json` scripts (`dev`, `start`, `ios`, `android`), a `Makefile`, the README's "Getting
  started". Any helper scripts for screenshots, reloads or simulators.
- **Written standards:** design system docs, an accessibility guide, a copy or tone guide, a `QUALITY.md`,
  contributing notes on UI. Search `docs/`, the README, `AGENTS.md`, `CLAUDE.md`, and Storybook or component
  docs. A token file is not a standard by itself, but it says what the standard is.
- **What the code already does:** the theme or tokens (colours, spacing, type sizes, radii), the shared components
  (buttons, inputs, lists, sheets, empty states), how screens show loading and errors, the copy style of existing
  labels (sentence case or title case, "Sign in" or "Log in"), light and dark themes.
- **The sections:** the route list, grouped the way a person moves through the product (tabs, top-level pages,
  flows).

Say in two lines what you found ("An Expo app with light and dark themes; standards: an accessibility doc, no
design or copy guide; 6 sections").

## 2. The bar

- **Standards found:** list them as the bar files. Where they are silent on an area of
  [default-quality.md](default-quality.md), ask whether to fill the gap with a short `QUALITY.md` that points to them
  and adds only the missing areas.
- **No standards:** draft `QUALITY.md` at the repo root from [../templates/QUALITY.md](../templates/QUALITY.md).
  Write each line from what the code already does (name the real token, component or pattern), and take the
  default line where the code shows nothing. Mark every default line `(default)`, so the person sees which lines
  describe their product and which are suggestions.

Show the person the draft, or the list of bar files, and change it until they approve it. A drafted `QUALITY.md`
goes in on a branch with a pull request, like any change.

Done when: the person has approved the bar.

## 3. Ask

Ask only what is left, with the question tool if you have one (at most 4 questions), each with your
recommendation first:

1. **Where records go:** `.qol-pass/` in the repo, git-ignored (recommended: it stays beside the code), or
   `~/.claude/qol-pass/<repo>/` (outside the repo: nothing to ignore).
2. **Tickets:** does the team track work in a tool (GitHub Issues, Linear, Jira, ClickUp)? If so, how you file to
   it: a CLI (`gh issue create`, `linear`), an API script the repo already has, or the person files from your list.
3. **Test accounts:** which account or data to sign in with, if the product needs one. Never the person's own
   real account unless they say so.
4. Only if unclear from step 1: how to start the product, or which device and screen sizes to test on.

Done when: every question is answered.

## 4. Write the config

`<records>/config.json`. With records in `.qol-pass/`, add `.qol-pass/` to `.gitignore` in the same pull request
as the bar. Keys:

```json
{
  "records": ".qol-pass",
  "platforms": ["mobile", "web"],
  "bar": ["QUALITY.md", "docs/accessibility.md"],
  "run": {
    "mobile": "npm run ios",
    "web": "npm run dev, then http://localhost:3000"
  },
  "devices": { "mobile": "iPhone SE and the largest iPhone", "web": "320, 768 and 1440 px wide" },
  "themes": ["light", "dark"],
  "testAccount": "the seed user in README, 'Getting started'",
  "tickets": { "tool": "github", "how": "gh issue create --label qol" }
}
```

Start the product once with `run` and open the first screen, so the first pass does not begin with a broken setup.

Done when: the config exists, and the product starts with it.
