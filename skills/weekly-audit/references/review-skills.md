# Starter review skills

A recommended set of review skills written by other authors. This repo does not copy them: each one is installed
from its own author, so it stays current and stays theirs. The weekly audit runs whichever of them are installed
and fit the repo (the config's `skills`).

Install one with the command in its row. Check the skill's page on skills.sh first if you want to read what it
does.

## The set

| Skill | What it checks | Applies to | Author | Install |
|---|---|---|---|---|
| `vibe-security` | Security holes common in AI-written apps: exposed keys and secrets, broken access control, missing auth checks, client-side trust, payment flows, rate limiting, mobile storage and deep links | any | `raroque/vibe-security-skill` | `npx skills add raroque/vibe-security-skill --skill vibe-security` |
| `web-design-guidelines` | UI code against the Web Interface Guidelines: accessibility, focus, forms, animation, touch targets, text handling | web (the accessibility rules carry to mobile) | `vercel-labs/agent-skills` | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` |
| `vercel-react-native-skills` | React Native and Expo practice: list performance, animation, navigation, images, pressables, safe areas, state and render cost | mobile | `vercel-labs/agent-skills` | `npx skills add vercel-labs/agent-skills --skill vercel-react-native-skills` |
| `better-ui` | Interface polish: concentric radii, optical alignment, shadows over borders, press feedback, hit areas, enter and exit animation | web (most rules carry to mobile) | `jakubkrehel/skills` | `npx skills add jakubkrehel/skills --skill better-ui` |
| `better-typography` | Type scale, line height by role, font weights, tabular numbers, truncation, wrapping, text contrast | web (the principles carry to mobile) | `jakubkrehel/skills` | `npx skills add jakubkrehel/skills --skill better-typography` |
| `better-colors` | Colour in OKLCH: palettes, contrast checks, gamut limits, theming | web (a design aid on mobile) | `jakubkrehel/skills` | `npx skills add jakubkrehel/skills --skill better-colors` |
| `no-ai-slop` | Copy and docs: wording that reads as machine-written, padding, vague claims | any | `petergyang/no-ai-slop` | `npx skills add petergyang/no-ai-slop --skill no-ai-slop` |

## Where each source was checked

Each author and repo below was read from the local skills lock file (`~/.agents/.skill-lock.json`), and each skill
page on skills.sh was opened and listed its install command, on 2026-10-28.

| Skill | Lock file source | Listed on skills.sh |
|---|---|---|
| `vibe-security` | `raroque/vibe-security-skill` | yes |
| `web-design-guidelines` | `vercel-labs/agent-skills` | yes |
| `vercel-react-native-skills` | `vercel-labs/agent-skills` | yes |
| `better-ui` | `jakubkrehel/skills` | yes |
| `better-typography` | `jakubkrehel/skills` | yes |
| `better-colors` | `jakubkrehel/skills` | yes |
| `no-ai-slop` | not in the lock file; the installed copy names `petergyang/no-ai-slop` as its origin | yes, under `petergyang/no-ai-slop` |

If a skill moves or its author renames the repo, run `npx skills find <name>` or search skills.sh, and trust the
page over this table. When you cannot confirm a source, write "source not confirmed" beside the skill and tell the
person before they install it.

## Which to install

- **A web app:** `vibe-security`, `web-design-guidelines`, `better-ui`, `better-typography`. Add `better-colors`
  when the app owns its colour tokens, and `no-ai-slop` when the app has a lot of copy or docs. **Next.js or
  another React server framework:** add `vercel-react-best-practices` (data fetching, server components, bundle
  size); it only stops paying on an app with no server.
- **A mobile app (Expo or React Native):** `vibe-security`, `vercel-react-native-skills`,
  `web-design-guidelines`, `better-ui`, `better-typography`. Add `no-ai-slop` for the copy.
- **Any repo:** `vibe-security` fits every stack that handles users, secrets or payments. `no-ai-slop` fits any
  repo with readable copy or docs.
- **A repo with no UI** (an API or a library): `vibe-security` and `no-ai-slop` only. The design skills have
  nothing to review.

Fewer, well-matched skills beat a long list. Each installed skill costs one agent per run, and a skill that never
finds anything on this repo is a cost with no return. Review the config's `skills` every few months and move the
silent ones to `skipped` with the reason.

## Two we dropped, and why

A skill that finds nothing is worth keeping only when you cannot explain why. These two were run on a real app,
the reasons were structural, and they are written down so nobody runs them blind again.

- **`vercel-react-best-practices` on an app with no server and the React Compiler.** It was run twice and found
  nothing both times. Most of its categories (server components, data-fetching waterfalls on the server,
  route-level bundle splitting, browser storage) describe problems a native app cannot have, and its
  memoisation rules are wrong advice when the compiler owns memoisation. Keep it for a Next.js or server-rendered
  React app. Reopen the question if the app gains a server, drops the compiler, or moves to a bundler with
  route-level splitting. If one rule is worth keeping, such as the barrel-import check, turn it into a one-line
  search the built-in checklist can run instead of a whole skill.
- **`make-interfaces-feel-better`, superseded by `better-ui` plus `better-typography`.** The newer pair is the same
  skill with the typography rules split out. Running the old one next to `better-typography` applies the
  typography rules twice and repeats the rest. Install the pair, and skip the old skill.

## Apply the principle, translate the mechanism

Most of these skills were written for the web: a browser, CSS, a DOM. When a skill meets a native app, each
agent applies the principle and translates the mechanism, and drops a rule that has no native form. For example:

- A tabular-numbers rule becomes the platform's font variant for tabular numbers, not `font-feature-settings`.
- An OKLCH colour string is not a valid native colour. Use the skill to check contrast and pick the colour, then
  write the platform's own value.
- A rule about `:focus-visible`, `htmlFor`, hydration or `will-change` has no native twin. Skip it, and name it
  as skipped in the record.
- A rule about touch targets, reduced motion, labels on icon-only buttons and truncation carries over in
  substance. Apply it with the platform's own properties.

A finding that only restates a web rule with no native effect is noise. Drop it in the verify step.
