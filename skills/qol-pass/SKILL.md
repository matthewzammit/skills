---
name: qol-pass
description: Quality pass on one section of a mobile or web app - walks the running product and checks behaviour, dead ends, wrong or stale data, wording, empty, loading and error states, layout edge cases (largest text, small screens, long names), motion and accessibility against the team's written standards, and drafts a QUALITY.md when the repo has none; lists findings with a recommended fix each and builds only what the person picks. Use when someone asks for a QoL, polish or UX pass, a quality review of a screen, flow or page, a check of a section before release, or wants the product's quality standards written down.
argument-hint: "[setup | next | <section name>]"
---

# QoL pass

Check one section of the product (a tab, a flow, a group of pages) for the small problems users notice, judge it against
written standards (**the bar**), and hand back one numbered list of findings. **Build nothing before the person
picks.** One section per pass keeps the list short enough to decide on and the pull request small enough to review.

Talk to the person in short, plain sentences. Every finding has a recommended fix; where there is a real choice,
give 2 or 3 options with your pick first.

## 0. The bar (first run, or `setup`)

If the repo has no qol-pass config (`.qol-pass/config.json`, or `~/.claude/qol-pass/<repo>/config.json`), or
`$ARGUMENTS` is `setup`, follow [references/setup.md](references/setup.md). It finds the team's own standards or
drafts a `QUALITY.md` from what the code already does, and the person approves it. Stop there if the argument was
`setup`.

Read the bar files the config names before every pass. A team's own standards always win over
[references/default-quality.md](references/default-quality.md).

Done when: a config exists, and it names bar files the person has approved.

## 1. Pick the section

From `$ARGUMENTS`: a section name is the section. Empty or `next`: read `<records>/passes.md` (the log of past
passes) and the product's route list (the router folder, such as `app/` or `pages/`, or the navigator files), and
propose the next section nobody has passed yet, the most used first.

List the screens or pages in the section, with how to reach each one, and the states worth seeing (empty, full,
error, signed out). Confirm the list with the person in one message.

Done when: the person has confirmed the section and its screen list.

## 2. Survey

Start the product with the config's `run` commands and walk every screen on the list, in each theme a person can
switch to. Follow [references/survey.md](references/survey.md): eight areas, how to test each on mobile and on web. Take
a **before** screenshot of every finding into a scratch folder as you go, and note the steps to reach it.

Use test accounts and test data. With `"readOnly": true`, change no data at all. To check an action with a real-world effect (a payment, a sent message, a
submitted application), stop at the last screen before it and write "not tested: <why>". A state the test data cannot
produce (an empty list in a demo full of samples) is read in the code and marked "seen in code only". If the
product cannot run here, survey from the code, and say so in the first line of the findings.

Done when: every screen on the list has been walked, and each of the eight areas has a finding or a one-line
"checked, fine: <what you tried>".

## 3. List and ask

Write each finding in the format of [references/finding.md](references/finding.md): what, where, why it matters
(the bar line it breaks, or the person it hurts), the fix, options where there is a real choice, and your pick.
A finding that the bar itself is wrong or silent is fine: propose the bar edit as its own finding.

Save the list to `<records>/<YYYY-MM-DD>-<section>.md` from [templates/findings.md](templates/findings.md) (run
`date` first; never guess today). Reply in the chat with the numbered list, the most painful for the person first,
one or two lines each. Then ask: "Which should I build? Numbers, 'all' or 'none'." **Stop and wait.**

Done when: the findings file exists, and the person has the list and the question.

## 4. Build the picks

Build only the picked findings, following the repo's own rules for branches and commits (by default a new branch,
`qol/<section>-<date>`, from the main branch): one commit per finding unless the person asked for one commit for the pass. Take every value from the bar and the existing
design system; reuse the product's own components. Run the repo's own checks (tests, lint, types) before each
commit.

Verify each fix in the running product, on the same screen and steps as its before shot, and take the **after**
shot. A fix you cannot see working is not done: say what blocked it.

Done when: every picked finding has a commit and an after shot, or a written reason it was not built.

## 5. Evidence and hand over

1. Open one pull request: per finding, the before and after shots side by side and one line on the change. Never
   merge it.
2. Update the findings file: each finding marked built (with the commit), skipped, or deferred.
3. Add a row to `<records>/passes.md`: date, section, findings found, built, and the pull request.
4. If the config files tickets: one ticket per built finding, with its shots, as the config says.
5. If a pass proposed a bar edit the person accepted, make it in the bar file in the same pull request.

Done when: the pull request is open, and the findings file and the log are up to date.
