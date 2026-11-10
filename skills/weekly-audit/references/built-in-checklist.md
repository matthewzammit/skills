# Built-in checklist

Two parts. The first part always runs, because no review skill covers it. The second part runs only when no
review skill is installed, and it is thin on purpose.

Report judgement findings. Skip anything a lint rule, a type check or a test already catches in this repo.

## Always runs

### Security surface tripwire

You cannot run a red-team pass: it needs a signed-in person and a live token. What you can do, reading code only,
is flag a new attackable surface so a person scopes it before the next release. Report a finding when the range:

- adds a **route or endpoint that takes an id** (a user, account, document or resource id) or adds a new write
  (`POST`, `PUT`, `PATCH`, `DELETE`);
- adds a **public or anonymous route**, which should expose no per-user data and take no caller-bound id;
- adds a **deep link, URL scheme or universal link** destination, which anyone can open from outside the app;
- adds an **inbound webhook or push payload** handler;
- adds a **server action** or form handler that writes, or a client call to a new endpoint;
- widens an **exemption** in middleware, a proxy or an auth gate (a path pattern that skips the check);
- changes **agent or CI permissions**: an allowlist in an agent settings file, a workflow's `permissions:`, a token
  scope. A command allowed to run with no prompt that reads any file path and sends it out is a finding.

Each finding says: "new attackable surface, needs a scoping check", with the file and line, and the guard a person
should confirm (the ownership check, the permission check, the allowlist). It is a pointer for a human pass.
**Never call the endpoint, send a request, or try to exploit it.**

### Docs freshness

For each feature the range changed or added:

- Is there a doc for it (a guide, a README section, an in-repo help page), and does the repo's docs index list it?
- Does the doc still describe what the code does? A doc that is missing, thin (a heading with little under it) or
  stale against the change is a finding.
- Does the doc written for users describe the flow a normal person follows, end to end, with no code knowledge?

How to check: for each behaviour the range changed, grep the docs for its name and its old wording, and read the
Status or "last updated" lines of the guides the range touched. A guide whose code changed while the guide did
not is the first place to look.

Skip a check the repo already automates, for example an unindexed doc caught by a script.

### Docs facts

Every run, run `node <this skill>/scripts/doc-facts.js` from the repo root over ALL docs. It is cheap and read-only.
It lists relative links to a missing file or heading, backticked repo paths that no longer exist, and `npm run`
names with no such script. Each hit is a finding. A doc that tells a change's history is skipped by the script; a
line that must keep a missing name carries `doc-check-ignore` and the reason. Docs about another codebase can
trip it: say so once instead of listing each hit.

Then check whether the repo's own gate (package.json scripts, git hooks, CI workflows) already runs a docs check
like it. If it does not, that is one finding with a **Decision needed** block: add one to the gate. Options: adopt
`doc-facts.js` as a gate step, write a stricter repo-specific check, or keep it audit-only. Pick "add it to the
gate", because a stale doc found a week later has already been followed.

A decision about a check or a rule never lives only in the record. It gets a Decision needed block, and a ticket
when tickets are on, so the person sees it.

### Docs rotation

The check above reads only docs next to changed code. A doc nobody edits is never read again, and it drifts as the
code around it moves. So each run also re-reads a few docs the range did not change:

- **Which:** run `scripts/pick-docs.js` (see SKILL.md step 3). It takes the config's `docsRotation.count`
  (default: enough to re-read every doc in about 16 runs, never under 3; 3 a run never finished a round of a
  large docs set) from `docsRotation.docs` (default every tracked Markdown file outside the records folder): docs
  never re-read first, oldest last commit first, then the ones re-read longest ago. A doc's last commit is not a
  re-read: a one-line edit is not a review.
- **How:** read each one end to end against today's code. Check both parts: the flow a person follows, and the
  developer details (file names, functions, switches, defaults, status lines). Each line that no longer matches
  the code is a finding. Spend the re-read on what `doc-facts.js` cannot prove: behaviour, defaults, locations,
  status lines.
- **Contradictions and copies.** For each rule or fact in the doc, grep its key words across all `*.md`. Does
  another doc say the opposite? Is the same rule copied in a second place? Each is a finding. Its fix names the one
  source of truth and turns the other into a pointer.
- **The repo's process docs count**, and so do this audit's own config and routine. A limit they state ("the run
  cannot do X") that no longer holds is a finding.
- **Record it** on one fixed line, even when all were clean: `Docs re-read: a.md, b.md, c.md`. The next run reads
  these lines from past records to move on to the next docs.

### Errors reach crash reporting

Skip this section when the repo has no crash reporting (Sentry, Bugsnag, Crashlytics or similar). Otherwise report
a finding when the range adds:

- a `catch` that shows the person a message or swallows the error without reporting it;
- a request or job that fails with no name or context a person could search for in the crash tool;
- an error report whose context could carry personal data (a name, an email, free text, a record id, a token).

### Analytics events

Skip this section when the repo has no product analytics. Otherwise report a finding when the range adds:

- a **new user action** (a choice, a new step in a flow, a screen's main button) that sends no event;
- an event whose properties could carry personal data;
- an event name that breaks the repo's naming pattern, or that duplicates an existing event.

Check that new events arrive only when the config's `analytics.check` says how (a read-only query, a CLI, a
connector) and which project. Never write to the analytics tool.

## Only when no review skill is installed

Run this thin checklist on the changed files, and **say in the record that the review was thin**, because a short
checklist finds far less than an installed review skill. Tell the person which starter skills would fit
([review-skills.md](review-skills.md)).

### Security

- A secret, key or token in code, config, a log line or a client bundle.
- A server route or query that trusts an id from the caller without checking the caller owns it.
- Missing authentication or permission checks on a new write.
- Input used in a query, command, file path or HTML without validation or escaping.
- Personal data in logs, analytics or error reports.
- A redirect, deep link or webhook handler that accepts an unchecked target.
- A new dependency pulled from an unknown source, or a lock file edited by hand.

### Accessibility

- An icon-only or image-only control with no accessible name.
- A tappable or clickable target smaller than the platform minimum.
- An error shown only in colour, or not announced to a screen reader.
- Text that does not scale with the person's text size setting, or that clips at the largest size.
- Motion with no reduced-motion path.
- Contrast below the platform's guideline on a new colour pairing.

### Error handling

- A request with no loading, empty or failure state, so a failed fetch leaves the screen waiting forever.
- A `catch` that discards the error, or a promise with no rejection path.
- A retry with no limit, or a write that runs twice when a person taps twice.
- A destructive action with no confirmation and no undo.
- A message that tells the person nothing they can act on.

## How to report

Put each finding in the record's format ([record.md](record.md)). A check that found nothing goes under "Already
right" in one line. A check you could not run goes under "Not checked", with why.
