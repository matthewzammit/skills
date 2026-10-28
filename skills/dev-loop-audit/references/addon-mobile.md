# Add-on: mobile

On when the config's `addons` has `mobile`. Tags: simulator and emulator tool calls (`sim_tool`), `xcrun simctl`,
`axe`, `adb`, native builds (`native`, `native_run`, `xcodebuild`, `pod_install`, `prebuild`, `gradle`, `archive`),
and image reads that match `screenReads`. Numbers are in the Mobile and QA sections of `metrics.txt`.

## Reliability

1. **Build failures:** a native build that failed, and how long until one passed. Read the tail in `calls.json`:
   a code error is a real catch; a stale cache, a pod or Gradle sync problem, signing, or a script phase that needs
   a network is waste with a known cure. A cure that lives only in a person's notes wants a script.
2. **Device problems:** screenshots that failed, a simulator found shut down or headless, the app not installed,
   the wrong device (a session tapping another session's simulator), a bundler (Metro) down or its port taken.
3. **Hand relaunches** (`hand_relaunches`): terminate and launch typed by hand; a helper should do it.
4. **Archive:** count archive and release builds; an agent that archives or uploads when the team says only people
   do is a rule gap.

## Speed

1. **Native build times** (`native.*.median_s_fg`, `max_s_fg`): foreground builds block the agent; a long one run
   in the background is cheaper. Compare cold (a fresh worktree or after a prebuild) with warm.
2. **The check step:** median from a tap to the screen seen, batched against unbatched, and the batched share. A
   tap, a screenshot and its read in one message is the fast loop; three messages is about three times slower.
3. **Screenshots per input** and **consecutive screens**: above about 1.2 screenshots per input means re-shots of
   the same screen.
4. **Setup:** warm and cold medians, and the slowest episodes (`episode_rows`).
5. **The simulator tool's own screenshot** (`sim_tool_actions.screenshot`) against the repo's screenshot helper,
   when the repo has one: the helper usually waits for a still screen and is cheaper to read.
