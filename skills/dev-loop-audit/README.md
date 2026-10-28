<p align="center">
  <img src="../../assets/dev-loop-audit.png" alt="Dev loop audit: GitHub Actions, git hooks and Claude Code transcripts on the left, Claude Code in the middle, and on the right minutes lost per area (agent time, gate, CI) and fixes ranked by minutes saved." width="100%">
</p>

# Dev loop audit

**Your whole development loop, in one audit you run any time or every Monday.** Your agent measures where last
week's time went, ranks every problem by minutes lost, double-checks the biggest ones, keeps a trend, and asks
which fixes to build.

It checks three areas:

1. **CI (GitHub Actions).** Failed and flaky runs, slow jobs, billed minutes, and code that landed on main with no
   passing run, and for how long.
2. **Local checks (git hooks and the tests before a push).** Are the hooks installed? Do they run the same checks
   as CI? How long does a push take, and how many pushes failed for no good reason?
3. **Agent time.** Where your agent waited, retried or got blocked, commands it typed by hand fifty times, and how
   long each check in a simulator or browser took. This part reads Claude Code transcripts on your machine, so it is
   Claude Code only for now. In other agents the audit covers areas 1 and 2, and says it skipped agent time.

Most audits look at one of these. Time lost in one area often shows up in another, so this one ranks them all on
one list.

## Run it

| You type | When | What happens |
|---|---|---|
| `/dev-loop-audit setup` | Once per repo | Looks at your CI, hooks and transcripts, asks where records go, how you file tickets, and whether to schedule it. |
| `/dev-loop-audit` | Any time, or weekly | Audits last week (Monday to Monday). Or `/dev-loop-audit last 7 days`, or two dates. |

When installed as a Claude Code plugin, the command is `/matthewzammit-skills:dev-loop-audit`. It also starts when you ask
"why is CI so slow?" or "audit our pipeline".

It is **read-only until you pick**: it writes only its report and a row in `trend.csv`. When you pick fixes, it
builds them on a branch and opens a pull request. It never merges.

## What you get

A short reply, and a full report in your records folder. Made-up numbers:

```
Minutes lost, week of 2026-10-19
  CI          4 people-min (1 flaky test, re-run twice); 0 holes; 212 billed runner-min (was 260)
  Gate        6 min waste: 3 pushes failed on stale node_modules; 2 real catches
  Agent time  48 min: 31 sleep-only calls (12 min), 9 retries of `npm test` after a cut-off error (14 min),
              a dev server started 22 times in one session (22 min)

Fixes, ranked by minutes saved a week
  1. Reliability, agent time: a `dev:up` script that reuses a running server (~20 min). Pick.
  2. Reliability, gate: the pre-push hook checks node_modules first and says "run npm ci" (~6 min).
  3. Speed, CI: cache Playwright browsers; the install step is 61 s of a 140 s run (~1 min a run, 40 runs).
Which should I build? Numbers, 'all' or 'none'.
```

## Every check, in detail

- **CI:** failures and their cause, flakes, cancelled runs, holes (from every real push, so a push no workflow ran
  on still counts), jobs with no timeout, failures that cannot block (`continue-on-error`, `|| true`, a summary job
  with `if: always()`), the longest job chain, run and queue times from successful runs, billed minutes and the waste
  in them, path filters that filter nothing.
- **Local checks:** hooks installed and executable, hooks against CI, worktrees still running an old copy of the
  hooks, failed pushes sorted into real catches and waste, `--no-verify` and piped pushes, push and gate times.
- **Agent time:** waits, long calls, retries, refusals, repeated commands (by count and by time, so a slow lookup run
  in a loop shows), model time after errors.
- **Fixed since:** the commits after the audited week that changed workflows or hooks, so a problem already fixed is
  not reported as open.
- **Mobile add-on** (on by itself for iOS and Android apps): native build times and failures, simulator and
  emulator checks, screenshots per tap, setup time.
- **Web add-on** (on by itself for web apps): dev server starts, port clashes, browser test runs, preview deploys,
  browser checks.

Each finding says whether it is measured or estimated. The report keeps what was already right and what could not
be checked.

## What it needs

- An agent that runs skills, in the repo. For the agent time part: Claude Code, on the machine where you work (its
  transcripts live there). Other agents get CI and hooks only.
- `gh` signed in, for GitHub Actions. GitLab CI and other CI systems are not covered yet. Code review in another
  tool (Linear Diffs, say) is fine: the pull requests and their runs stay on GitHub.
- Node 18 or newer. The scripts have no dependencies and do not install anything.

## The weekly run

Schedule it every Monday in the Claude desktop app (Code tab, Scheduled, "Only on this computer"). The prompt and
the steps are in [templates/weekly-routine.md](templates/weekly-routine.md).

## Privacy

Transcripts never leave your machine. The scripts mask anything that looks like a token or password before they
store or print a command, and the report quotes commands, not your conversations.

## Credits

Checks borrowed from other public skills, with thanks:

- [smorinlabs/ci-fix](https://www.skills.sh/smorinlabs/smorinlabs-skills/ci-fix): job time from successful runs
  only, with p90 and queue wait; a flake is a run that went green on a later attempt.
- [smorinlabs/ci-audit](https://www.skills.sh/smorinlabs/smorinlabs-skills/ci-audit): hooks installed and running
  the same tools as CI; checking the API rate limit first.
- [edloidas/ci-audit](https://www.skills.sh/edloidas/skills/ci-audit): failures that cannot block, the longest job
  chain, timeouts at twice the longest run, measured against estimated, "Already right" and "Not checked".
- [enesgules/optimise-github-actions](https://www.skills.sh/enesgules/dotfiles/optimise-github-actions): billed
  minutes apart from wall time, cancelled-run waste, path filters that match most runs, fetching runs one day at a
  time.

Built from the weekly audit we ran on the [Binderr](https://binderr.com) Wallet app.
