# Set up the run

Everything here happens before a single survey starts. Write each result to the tracker.

## The machine and the worktree

- Keep the machine awake for the run (`caffeinate` on macOS, the host app's keep-awake, or a power setting).
- A fresh worktree from the main branch for the lead: `git fetch origin && git worktree add <path> origin/<main>`.
  The repo's main checkout stays on the main branch and is never edited while a merge runs there.
- Pick the branch names and plan numbers from one place, at build time: the lead hands each builder its number.
  A number picked hours early can be taken by another stream.

## The run folder

`<records>/<run>/` in the repo (run = `pass-N` or a dated name), from [../templates/tracker.md](../templates/tracker.md).
It holds the tracker, the findings files, the hot-file list, the dead-code output, the triage and the check logs.
Commit it to the main branch at checkpoints and at the end. Logs a merge tool writes go outside the repo or in a
git-ignored folder: a `git add -A` in a merge commit takes them in.

## The hot-file list

Every file an open branch changes:

```bash
for b in $(git branch -r --no-merged origin/<main> | grep -v HEAD); do
  git diff --name-only origin/<main>...$b
done | sort | uniq -c | sort -rn > <run>/hot-files.txt
```

A fix in a hot file conflicts with another stream, so surveys mark it `hot: yes` and it waits. Before you wait on a
"blocking" branch, check it: last commit date, commits behind the main branch, an open PR or not. Ask the owner. Stale
blockers are common; build on the main branch with small, local diffs so the slow branch can take them later.

## The dead-code run and the baseline

- Run the config's dead-code tool (`npx knip` for JavaScript and TypeScript; see [stacks.md](stacks.md) for others)
  and save its output. It has false positives (config plugins, files loaded by path, build config): every hit is
  confirmed before it becomes a finding.
- Record baseline numbers to compare against at the end: test suite time and count, type-check time, build or export
  time, bundle size.
- Check the docs for version lines that disagree with the code (a framework version, a runtime version). It is the
  cheapest docs drift to find.

## The device

- A fresh simulator, emulator or browser profile for the run, never one another stream holds. Take a shared one only
  through the config's lock, and hand it back live (its dev server running, or the app closed).
- Agree a spare device up front. A device can die mid-run (stuck shutting down); never restart the shared device
  service on a shared machine, it takes down every other session's devices. Make a new one.
- Get the agent's device access approved while the person is still here. A new simulator often asks the person to
  approve the tool, and overnight nobody can.
- Confirm the test account or demo mode works, and that the app starts on this worktree.

## Earlier runs

Read every earlier run's tracker and findings. A new run never reports or fixes the same bug twice, and two lenses
over the same code share one memory.

Done when: the tracker names the worktree, device and spare, epic, baseline and earlier runs read.
