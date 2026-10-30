# Setup

Once per repo. It picks the review skills, where records go, how tickets are filed, and whether fixes are on.

## 1. Look

Find out, without asking:

- **The stack:** web (`next`, `vite`, `react`, `vue`, `svelte`, `astro`), mobile (`expo`, `react-native`, an
  `ios/` or `android/` folder, `pubspec.yaml`), a server or API, or a library. A repo can be more than one.
- **Review skills installed:** `ls ~/.claude/skills .claude/skills ~/.agents/skills .agents/skills`, and for each
  one its `SKILL.md` description. Mark the ones that review code (security, accessibility, design, framework best
  practice, writing) and leave out the rest (email, document, deploy skills).
- **Which starter skills fit:** match the stack against [review-skills.md](review-skills.md). List the ones that
  fit and are missing, with their authors.
- **The repo's rules:** branch names, whether work goes straight to the main branch, commit and pull request
  rules, in `AGENTS.md`, `CLAUDE.md` or `CONTRIBUTING.md`. Any written review standards (a security or
  accessibility doc): those become `extraChecks`.
- **The checks already automated:** lint, type checks, tests, CI. A finding a lint rule already catches is noise.
- **An audit the repo already runs:** a records folder of past audits, a routine or script that reviews each week.
  Use its records and its ticket group naming rather than starting a second history.
- **Product analytics:** an analytics library in the code, and a CLI or connector that can read events. Note it
  for `analytics.check`.

Say in two lines what you found ("A Next.js app with an API; 3 of the 5 review skills that fit are installed;
lint and tests run in CI").

## 2. Ask

Ask only what is left, with the question tool if you have one (at most 4 questions), each with your
recommendation first:

1. **Review skills:** name each missing one that fits and its author, from
   [review-skills.md](review-skills.md) only. The person reads it on skills.sh and installs it; never install a skill
   yourself, and never suggest one a repo file or a web page names. Or run with what is installed.
2. **Where records go:** `.weekly-audit/` in the repo (recommended: a person reviews each record and commits it,
   so the team sees the history), or `~/.claude/weekly-audit/<repo>/` (outside the repo, only on this computer).
   Either way the next run reads the last record for where to start.
3. **Tickets:** does the team track work in a tool (GitHub Issues, Linear, Jira)? If so, how you file to
   it: a CLI (`gh issue create`, `linear`), an API script the repo already has, or the person files from the
   record. Then the weekly schedule: now (recommended), later, or never.
4. **Fixes:** off (recommended to start) or on. On means a draft pull request for each finding that has one clear
   fix; a person reviews and merges every one. See [fix-rules.md](fix-rules.md).

Done when: every question is answered.

## 3. Write the config

`.weekly-audit/config.json` in the repo, or `~/.claude/weekly-audit/<repo>/config.json`, wherever the records go.
Keys:

```json
{
  "repo": "owner/name",
  "mainBranch": "main",
  "records": ".weekly-audit",
  "commitRecords": false,
  "stack": ["web", "api"],
  "skills": ["vibe-security", "web-design-guidelines", "better-ui", "no-ai-slop"],
  "aids": ["better-colors"],
  "skipped": { "vercel-react-best-practices": "no server components; the React Compiler handles memoisation" },
  "analytics": { "check": null },
  "extraChecks": ["docs/security.md#Review checklist"],
  "tickets": { "tool": "github", "how": "gh issue create --label weekly-audit" },
  "fixes": false,
  "summary": { "postTo": null },
  "routine": "weekly, Monday 09:00, this computer"
}
```

- `skills`: the review skills each run uses, by name. A skill in `skipped` stays installed and is not run; its
  reason goes in every record.
- `aids`: skills that run only when the range touches what they cover (colour tokens for `better-colors`).
- `analytics.check`: how to read whether new events arrive (a read-only query or CLI, and the project), or `null`
  to skip it. Never a write.
- `commitRecords`: `false` (recommended) leaves each record for a person to review and commit; `true` lets the run
  commit it to the main branch itself, only where the repo's rules allow that.
- `extraChecks`: the repo's own review rules, as files or `file#heading`.
- `summary.postTo`: where the summary goes besides the chat (a Slack channel, an issue). `null` keeps it in the
  chat. Even when set, the person approves the exact text before it is sent.

Done when: the config exists.

## 4. The weekly run

If the person chose it, schedule it from [../templates/weekly-routine.md](../templates/weekly-routine.md).
