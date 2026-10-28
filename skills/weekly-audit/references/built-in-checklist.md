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
- adds an **inbound webhook or push payload** handler.

Each finding says: "new attackable surface, needs a scoping check", with the file and line, and the guard a person
should confirm (the ownership check, the permission check, the allowlist). It is a pointer for a human pass.
**Never call the endpoint, send a request, or try to exploit it.**

### Docs freshness

For each feature the range changed or added:

- Is there a doc for it (a guide, a README section, an in-repo help page), and does the repo's docs index list it?
- Does the doc still describe what the code does? A doc that is missing, thin (a heading with little under it) or
  stale against the change is a finding.
- Does the doc written for users describe the flow a normal person follows, end to end, with no code knowledge?

Skip a check the repo already automates, for example an unindexed doc caught by a script.

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

Do not query the analytics tool to check arrival unless the config says to and gives the project. Never write to it.

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
