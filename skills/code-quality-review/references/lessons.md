# Lessons

Each lesson lives once, in the file whose step applies it. This page holds the ones with no other home, then points
to the rest. Add a new one as one short rule with the mistake it prevents.

## Lessons with no other home

- **Rules in the lead's memory never reach a helper.** The person repeated "do the checks yourself" and "these are
  test accounts" three times each, and a builder deleted a hidden section kept on purpose: each rule was in the lead's
  memory, none in a brief. Every standing correction goes into the house rules file the same day.
- **A survey finding can be a past decision.** A survey called a missing block "dropped in a merge"; an archived plan
  said the person decided to drop it. Surveys and builders grep the decision records first, and a recorded decision
  becomes a decision-check item, never a fix.
- **Helpers cannot always act on the person's real account.** A permission layer can refuse a helper's tap on a real
  account. Plan those checks for when the person is present; demo and test accounts went through.
- **Simulator timing cannot show a small speed win.** Launch time on a fast machine moved 23 ms in the noise. Measure
  on a device or in the field, and say so in the plan before spending a release build on it.
- **Bugs found in passing get a ticket during the run**, and are fixed the next day with an app check. One date
  picker fix made the bug worse until it was checked on a device.

## Where the other lessons live

| Lesson | Lives in |
|---|---|
| Four questions first; findings only vs fix; who merges; decisions in one batch | [kickoff.md](kickoff.md) |
| Tracker in the repo; hot files; dead-code tool; device approved before the person leaves; spare device | [setup-run.md](setup-run.md) |
| Folder sections plus whole-app lenses; tool runs in a second wave; "compiler on" is not "compiled" | [lenses.md](lenses.md) |
| One fix behind several problems; confirm "suspected" first; no stacked PRs | [triage.md](triage.md) |
| Load gate; recover from a freeze; review every build; extra rounds for session fixes | [build.md](build.md) |
| Three lists; merge-order list; stop rules; full gate after each batch; docs and plan refresh | [merging.md](merging.md) |
| Confirm the finding; never edit old changelog entries; name the version file; docs grep; property tests; date fixtures | [../templates/builder-brief.md](../templates/builder-brief.md) |
| PASS only if seen; quick checks first; log after each unit; never tap a system prompt; stop on a hang | [../templates/verifier-brief.md](../templates/verifier-brief.md) |
| Per-unit status table, not only a running log | [../templates/tracker.md](../templates/tracker.md) |
| Patterns that hide a machine; the event list; the guide comparison | [../templates/state-machine-brief.md](../templates/state-machine-brief.md) |
