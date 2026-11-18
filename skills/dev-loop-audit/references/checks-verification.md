# Verification (is agent work proven?)

Inputs: the `# Verification` section of `checks.txt` (repo-checks.js, from git and the repo's files), the Agent section
of `metrics.txt` (`rerun_green`, `fix_loops`, `verify_*`, from the transcripts), and `calls.json` for evidence. The
transcript items are Claude Code only; the git and repo items work for any AI agent.

The report section is "Proof of agent work". The question behind every item: when an agent says "done", can a person look at proof instead of reading the diff?
Time lost here is real, and so is work that was never checked. Rank a finding by the minutes it cost; when it cost
none, say what it left unproven.

## Reliability

1. **Proof on commits:** the share of agent commits that say how they were checked. The repo stamps its commits with
   a trailer (the config's `verification.trailer`, default `Verified`), for example `Verified: ran the app on the
   simulator, checked the new screen` or `Verified: none`. `checks.txt` counts agent commits (a Co-Authored-By or
   generated-with line naming an agent; the config's `verification.agentPattern` replaces that) as **verified**
   (a stamp with a reason), **free** (a merge commit, or one whose every changed file matches the config's
   `verification.freePaths`, default markdown files and `docs/`: no stamp needed, left out of the share), **none** (the stamp says nothing was checked) and **unstamped** (no stamp at all).
   Report the four counts and the verified share (verified of the commits that are not free), and compare the share with the trend (`verified_share`).
   - A finding is a low or falling share, a share of `none` that hides a risky area (an auth, payment or data
     change stamped `none`), or unstamped commits when a stamp exists (a hook or a skill that does not add it).
   - No commit in the last 500 carries the stamp (`checks.txt` says so): there is no stamp. Propose one as a fix,
     in observe mode first. The three modes: **off**, **observe** (the commit gate logs what it would block and
     blocks nothing) and **enforce** (it blocks a commit with no stamp, and the message says why it skipped). Run
     observe for a week, read the log, then enforce. Add an exit so the gate cannot deadlock: after 2 blocks in one
     session, the next commit goes through.
   - Squash merges drop the commit messages of a branch. When the repo squashes, the stamp must reach the
     squash commit (the pull request description), or the count reads low. Say so under "Not checked".
2. **Re-run until green:** the same test or check command run again with no file edit between, failing and then
   passing. That is a flaky check that the agent worked around instead of fixing. `rerun_green` counts it, with
   `rerun_green_examples` (session, time, command). The transcripts can tell this much: both runs are tagged test,
   lint, typecheck, gate or verify; the second run passed; no Edit, Write or MultiEdit call, and no shell command that
   changes files (`sed -i`, `git checkout`, `git stash`, `--fix`, an install), ran between; the two runs are under 30
   minutes apart. Read each example before reporting it. The transcripts cannot see:
   - a file changed by a script, a redirect or another session, so a count can be too high;
   - a failure whose cause was outside the files (a port taken, a server not yet up, a network error), which is an
     environment problem, not a flake in the test, and also worth a fix;
   - a flake that passed on the first run and failed on the second, or one the agent never re-ran;
   - on CI, a run that went green on a re-run (the CI list has it: flakes).
   The fix for a flaky test is its cause, or deletion with the reason written down. A flaky test gets no sleep and no
   retry-until-green, because that teaches the agent to re-run instead of fix. Add the rule to the agent docs.
3. **Sleeps and retries in tests:** lines added to test files in the window that wait or retry: `sleep`, `time.sleep`,
   `Thread.sleep`, `setTimeout`, `waitForTimeout`, `retryTimes`, `retries:`, `--retries`, `retry(...)`, `@flaky`.
   `checks.txt` gives the counts added and removed, the files with most added and examples with the commit. Every
   added line counts, even one a later commit removed, because the agent wrote it. Read each example: a
   `setTimeout` that drives a fake clock or a documented timeout is fine; a sleep before an assertion, or a retry
   around a flaky call, hides a cause. A finding names the test and the commit. The fix is the cause, a rule in the agent
   docs, and a lint or review rule that rejects a sleep or retry in a test unless a comment says why. A wait on a
   condition (poll until a state is true, with a limit) is the right shape for an end-to-end check.
4. **Fix loops:** the same check failing more than 3 times in a session before the agent asked the person.
   `fix_loops` counts a check (test, lint, typecheck, gate or verify command) that failed 4 or more times in a row,
   where a pass, a question to the person (AskUserQuestion) or a human message ends the streak; `fix_loop_examples`
   names the session, the first time, the command and the number of failures. Edits between the failures are normal
   (each is a fix round); the finding is that nobody was asked. Read the session to see whether the rounds moved
   forward (a new error each time) or went round in circles (the same error). The fix is a rule in the agent docs:
   after 3 failed fix rounds on the same check, stop and ask a person, with what was tried and the last error.
5. **A verify step:** does the repo have one command or one agent skill that checks a change end to end, by running
   the real thing (the app on a simulator or in a browser, a local service called over its API), and that agents
   run before each commit? `checks.txt` lists candidates by name (a skill, a package script or a Makefile target
   named verify, e2e or smoke); then read the repo's agent docs (`AGENTS.md`, `CLAUDE.md`) for whether they say
   when to run it. Check the transcripts: how many commits had a verify run before them (the config's
   `verification.commands` tags those commands `verify`; `verify_calls` counts them). A finding is:
   - **None:** no such command. Propose one: a skill or script that starts the app, drives the main flow, looks at
     the result and prints pass or fail. End-to-end checks come first, then property tests (round-trip, invariants,
     idempotency, equivalence), then differential tests where the old system is the oracle (normalise the noise;
     keep an approved-changes list). Every one of these is written in the repo, not in someone's notes.
   - **Not used:** it exists, but few commits run it. The agent docs do not name it, or it is too slow (see Speed).
   - **Not trusted:** it exists but fails for reasons that are not the change (re-runs, fix loops on it).
6. **Judges out of reach:** a change must not be able to edit the rules that judge it. A rule read from the branch
   under review is one the change can rewrite to pass. Check each judge:
   - **CI:** a workflow triggered by `pull_request` runs the workflow file from the pull request's own merge commit,
     so the change can edit it. List each workflow's triggers (`checks.txt`). A check that must hold goes in a place the
     change cannot edit: a required status check or ruleset (`gh api repos/<repo>/rulesets` and
     `gh api repos/<repo>/branches/<main>/protection`), a reusable workflow pinned to a commit in another
     repository, or a `pull_request_target` workflow that checks out only the base branch (never the head: that
     runs the change's code with the base's secrets, a worse hole).
   - **Review rules:** an AI review workflow or a review skill that reads its rules from a file in the checkout
     (`AGENTS.md`, a review prompt, `.github/` config) is read from the branch under review. The rules should come from
     the default branch (`git show origin/<main>:<path>`), and the review should be of the commit, not the branch: a
     push during review makes the review stale.
   - **The gate:** a tracked hooks folder, a test or lint config, a coverage threshold and a hook's list of checks
     live in the repo and travel with the branch (see "Old hooks in old worktrees" in checks-local.md). Name the ones a
     change can loosen, and whether CODEOWNERS (read from the base branch) makes a person approve edits to them.
   - **Agent settings:** `.claude/settings.json` and the hooks it names are read from the branch the agent works on.
   The commands above are read-only. A finding says which judge, how the change could edit it, and which fix applies
   (required check, base-branch read, CODEOWNERS on the path). When nothing can be edited, write "already right".

## Speed

1. **Verify step time:** how long the verify step takes (`verify_median_s`, `verify_p90_s`, from calls tagged
   `verify`; when the config names no commands there is no number, and "not checked" says why; time the command once
   yourself only when the machine is quiet, as in checks-local.md Speed 4). An agent runs a check before each
   commit only if it is fast and reliable: a step that takes minutes gets skipped, or run once at the end. Compare with
   the trend (`verify_median_s`). A finding is a step over about 2 minutes per commit, a cold start paid on every run
   (a simulator booting, a dev server starting, dependencies installing) that a warm start would skip, or a step
   that runs everything when the change touches one screen. Name the slowest part of the step and a fix: reuse the
   running app, run cheap checks (tests, build, lint) first so a failure ends the step early, run only the flow the
   change touches. A step that is fast but flaky belongs to Reliability item 5, not here.
