# Sections and lenses

A **section** is a slice of the code one survey reads. A **lens** is what the survey looks for, written as one brief.
Sections find local problems; whole-app lenses find the ones that cross folders. Run both.

## Splitting into sections

- **By folder or layer** for improvements: data and auth, mappers and adapters, shared libraries and types, shared
  components, features (split in two if large), routes or screens. The lead takes a cross-cutting pass itself:
  dependencies, config, startup, test time, docs drift.
- **By user flow** for state machines: one area per flow (sign-in, lock, account switch, documents, sharing,
  notifications, editing), each told which guide or doc describes it. Comparing the code's machine with the guide's
  finds docs that are wrong as well as code that is wrong.
- Aim for sections a survey can read in 10 to 20 minutes. Show the list before any survey starts.

## The lenses

| Lens | Brief | What it finds |
|---|---|---|
| Improvements | [survey-brief](../templates/survey-brief.md) | Bugs, speed, duplication, dead code, missing tests, missing error reporting, accessibility, types, security notes, per folder. |
| Security | survey brief, whole app | Each finding tied to a concrete attack or leak path, judged against the repo's own security principles. |
| Failure modes | survey brief, whole app | Network loss, concurrency, data extremes, swallowed errors, and **spec gaps**: behaviour nobody wrote down. Pin each with a test. |
| State machines | [state-machine-brief](../templates/state-machine-brief.md) | Pieces of state with rules nobody named, tested against a fixed event list. Most real bugs in a live app are holes here. |
| Speed | survey brief, second wave | Startup, memory, slow screens, test time. Measure first; every speed PR shows before and after. |
| Tests | survey brief, second wave | Tests that cannot fail, tests tied to internals, pure logic with none. **Property tests** on the core pure logic (maths, parsers, state machines). |
| Structure | survey brief, second wave | Pieces that should change together and do not: hidden links (copies, globals read across modules, call-order rules), needless links (callers on internals, stable code importing volatile code), surplus (pass-through wrappers, speculative config). |

Run improvements with security and failure modes in the first wave. Speed, tests and structure go in a second wave,
told what the first wave found.

## The second wave runs tools

A read-only survey cannot see what a tool sees. The second wave runs them and reads the output:

- the compiler's or optimiser's own log, per file: "the compiler is on" is not "the compiler compiled it". One run
  found 56 shipping components the React Compiler silently skipped, after the first wave had dismissed every render
  finding because the compiler was on;
- an import graph (`madge`, `dependency-cruiser`, or a script): cycles, stable code importing volatile code;
- type-aware lint and stricter compiler flags, run once and not committed;
- git history for what changes together (co-change), to find hidden links;
- a code skeleton (bodies stripped) when the whole app must fit in one context.

## Sizing a state machine pass

Count the evidence first, cheaply: boolean state flags per file, status unions, refs used as flags, module-level
mutable variables, files with three or more boolean states. It sizes the pass and points each survey at its hot
spots. Name one or two explicit machines already in the repo as the model of good, so surveys compare against
something concrete.

## Special cases as a progress measure

Count them before and after the run: an `if` for one value, a parameter for one caller, a sleep or retry, a
swallowed error, a disabled test. Each is a requirement the design missed. A run is done when a typical change
lands in one place, no stable code imports something more volatile, and a fresh survey finds nothing worth fixing.

## Optional cleanups

Ask before adding these to a run: drop comments that restate the code (keep ones about the outside world), drop tests
that repeat the implementation or cannot fail, rewrite tests tied to internals.

## Teach, not only list

The final report explains each section in plain words with an ASCII diagram, not only a list. Generate it from data
(a JSON state file and a small script) so it refreshes as results land, instead of hand-editing a page.
