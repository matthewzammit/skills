# Stack notes

Read the section for the repo's stack during setup, and paste its relevant lines into the briefs. React Native first:
that is where this skill was proven.

## React Native (and Expo)

**Surveys**
- Speed: unmemoised context values, inline objects and functions passed to memoised children or list rows, long
  lists rendered with `ScrollView` and `map`, heavy work in render, JS-thread animation work that belongs in a
  worklet, uncached images, query waterfalls, refetch storms (no stale time, invalidating too broadly), timers and
  listeners never cleaned up.
- With the React Compiler on, run its logger over the source before dismissing any render finding: it silently
  skips components (shared values written with `.value =`, lint disables, `try`/`finally`).
- State machines hide in: boolean `useState` flags, status unions, refs as flags, module-level `let`, held promises,
  timer chains, `cancelled` cleanups, stored flags (secure storage, async storage), query `enabled` conditions, the
  route as state, and native state mirrored in JS (foreground, keyboard, permissions, biometrics).
- Dead code: `npx knip`. False positives: config plugins, bundler and PostCSS config, scripts loaded by path.

**Builders**
- Render tests: `@testing-library/react-native`, mocking only the edges. Assert order at the moment of the side
  effect (record state inside the mocked call), never "not called yet" right after an `await`: that races under load.
- Test files never sit inside a file-based router folder (`app/`): the router bundles them as routes.

**App checks on the iOS simulator**
- Command-line taps (for example `axe`) may need a "physical" tap style, or do nothing. Inside sheets and lists, a
  touch path with a short hold (about 80 ms) works when a tap does not. Switches need a drag.
- A system alert ("Open in ...?") cannot be tapped from the command line. Avoid commands that raise one (opening a
  URL); if one appears, reboot the simulator and launch the app directly.
- Never tap a system permission prompt: one stray tap left push permission denied on the device.
- Background the app by launching Settings. Push: `xcrun simctl push` with a payload file. Face ID:
  `notifyutil` enrolment and match notifications through `xcrun simctl spawn`; if they do not answer, the check is
  device-only.
- A debug app keeps its JS in memory but loads images from its dev server: hand a borrowed simulator back with its
  owner's dev server running, or close the app.
- A Notification Center pull is a real background on the simulator; Control Center is not.
- Force a failure with a temporary local edit (a slow or throwing mock), reverted before the next unit.

**macOS host**
- There is no `timeout` command; run long jobs in the background instead. Never pipe `git push` through `tail` or
  `head`: the exit code is lost.

## Web

- App checks in a real browser (Playwright, a browser extension, the agent's own browser), a fresh profile per run.
- Speed: bundle size per route (the framework's analyser), Lighthouse or Web Vitals before and after, hydration
  waterfalls, client components that could be server ones.
- State machines hide in: URL and search params, global stores, form libraries' state, optimistic updates, service
  worker caches, `localStorage` flags.
- Events to add to the list: the back and forward buttons, a reload mid-flow, two tabs open, a slow third-party
  script.
- Dead code: `npx knip`, or `ts-prune` on older setups.

## Backend

- No device: the app check is a request against a local or test environment, with the response and logs as evidence.
- Failure modes: retries without idempotency, partial writes outside a transaction, timeouts with no cancel,
  unbounded queries, swallowed errors in background jobs.
- State machines hide in: status columns, job queues and their retry states, webhooks arriving out of order, caches
  with their own expiry.
- Security: authorisation on every route (not only authentication), secrets in logs, input reaching a query or shell.
- Dead code: `vulture` (Python), `staticcheck` (Go), `knip` (Node).
