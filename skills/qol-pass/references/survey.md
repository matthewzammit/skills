# Survey guide

Walk the running product. Note the screen and the steps to reach each finding. A pass from code alone says so in
its first line.

Use a simulator or emulator for mobile, and a browser for web. Judge each finding against the bar, and write it in
the format of [finding.md](finding.md).

## 1. Behaviour
Looking for: what each tap or click does, where Back goes, and what a double tap or a slow network does.
- Mobile: tap every control on the screen once and note where it goes.
- Mobile: go Back from each screen (iOS edge swipe, Android system Back) and confirm it lands where you came from.
- Mobile: double-tap each action button fast. Look for a duplicate request or a double navigation.
- Mobile: send the app to the background and return. The screen should keep its state and its place.
- Web: click every link and button. Use browser Back, Forward and reload on each page, and check the URL and scroll position.
- Web: double-click each submit button, with the network on Slow 3G. Expect one request per action.

## 2. Dead ends
Looking for: a state with no way out or no next step (empty, error, finished, offline).
- Reach each empty, error, finished and offline state. Each needs a control that moves the person forward or back.
- Mobile: open each dialog and sheet. Confirm it can be dismissed and its buttons are visible at the largest text size.
- Mobile offline: Android `adb shell svc wifi disable` and `adb shell svc data disable`. iOS simulator: turn off the
  Mac's Wi-Fi, since the simulator shares the host network.
- Web: set the network to Offline in devtools, then load a page. Right-click a request in the Network tab and block it
  to force an error state.
- Web: Tab into each modal. Escape should close it, and focus should return to the control that opened it.

## 3. Wrong or stale data
Looking for: a label, count or date that does not match what the person did.
- Do something (add, edit, delete, accept), then visit every screen that shows it. Counts, badges, dates and
  statuses should change without a manual refresh.
- Compare each count and date with the list or source behind it. Check "Today" and "This week" boundaries.
- Mobile: pull to refresh, background and return, then force-quit and relaunch. The same values should show.
- Web: reload, then open the page in two tabs, change something in one, and return to the other.
- Look for raw strings: codes, enums, snake_case, ids, `null`, `undefined`, ISO timestamps.

## 4. Wording
Looking for: unclear text, text that differs from the same thing elsewhere, and backend strings shown raw.
- Read every string on the screen. Note any that name the same thing two ways.
- Trigger each real error (bad input, offline, a rejected request) and compare its sentence with the bar's error pattern.
- Search the code or the pages for a label you doubt (grep, or Find in the browser) to see how it is worded elsewhere.
- Check dialogs, empty states and button labels for a lone word on the last line.

## 5. Empty, loading and error states
Looking for: each state exists and says something useful.
- Empty: use an account or profile with no data in this section, and open every list and page.
- Loading, mobile: relaunch cold, or throttle the network. iOS: Network Link Conditioner (Xcode additional tools),
  profile "Very Bad Network". Android emulator: Extended controls > Cellular > Network type and Signal strength.
- Loading, web: devtools Network set to Slow 3G, then a hard reload. Watch what draws first.
- Error, mobile: turn the network off, then open the screen and pull to refresh.
- Error, web: set Offline or block one request, then reload.
- Check each state: it exists, it says what is happening, it offers a way forward, loading is a skeleton, and an
  error has a retry.

## 6. Layout edge cases
Looking for: clipped, overlapped or off-screen content, and layouts that break with unusual content.
- Mobile largest text, iOS: `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`. Reset with
  `content_size large`.
- Mobile largest text, Android: `adb shell settings put system font_scale 2.0`. Reset with `font_scale 1.0`.
- Mobile: repeat on the smallest supported phone, then a tablet and landscape if the app supports them.
- Mobile themes: iOS `xcrun simctl ui <udid> appearance dark` (or `light`). Android `adb shell cmd uimode night yes`
  (or `no`). Check every theme the product ships.
- Mobile: enter a 60-character name, a single very long word, and a list of 50 or more rows.
- Web: zoom to 200% (Cmd or Ctrl and +). Zoom further to reach a 320px-wide layout and check the page reflows.
- Web: set the viewport to 320px, 768px and 1440px or wider (devtools device toolbar). Expect no horizontal page
  scroll, and lines that stay readable when wide.
- Both: at the largest size, open each dialog and sheet. Its text scrolls and its action buttons stay in view.

## 7. Motion and feedback
Looking for: press feedback, confirmations, transitions and Reduce Motion behaviour.
- Press and click every tappable row, card and button. Each gives feedback, and only one effect.
- Finish each action in the section. A small confirmation plays after the result, on the thing that changed.
- Trigger a failure and a cancel. Neither plays anything like success.
- Switch tabs, refresh and unlock. A frequent action gets no celebration.
- Open a screen where the change already happened. It shows at rest and does not replay.
- Mobile Reduce Motion, iOS: Settings > Accessibility > Motion > Reduce Motion. Android: Settings > Accessibility >
  Remove animations. Repeat the actions. End states appear at rest.
- Mobile recording: iOS `xcrun simctl io <udid> recordVideo out.mov`. Android `adb shell screenrecord /sdcard/out.mp4`.
  Judge timing from the recording, not from a still.
- Mobile haptics: simulators and emulators do not play them. Say which actions need a check on a real phone.
- Web: devtools > Rendering > "Emulate CSS media feature prefers-reduced-motion" set to reduce. Repeat the actions.
- Web: check hover, active and focus states on every control.

## 8. Accessibility
Looking for: names a screen reader reads, target sizes, focus order, contrast and text size.
- Mobile: turn on VoiceOver (iOS Settings > Accessibility > VoiceOver) or TalkBack, and swipe through each screen.
  Listen for a role and a name that says the thing. Listen for state (busy, dimmed) and for errors being spoken.
  Record what you heard, not "checked".
- Mobile: measure targets with Xcode Accessibility Inspector or Android Accessibility Scanner. Minimum 44pt iOS, 48dp
  Android. Neighbouring hit areas should not overlap.
- Web: put the mouse away. Use Tab, Shift+Tab, Enter, Space and Escape through the whole section.
  Check visible focus, a Tab order that follows reading order, and no keyboard trap.
- Web: read the accessibility tree in devtools, or use a screen reader (VoiceOver with Cmd+F5 on macOS). Check names,
  roles and the heading outline. Targets are at least 24px.
- Both: measure contrast in each theme against the composited background. Text 4.5:1. Large text and UI parts 3:1.
  Browser devtools show the ratio in the colour picker.
- Both: confirm status is never colour alone, and that icon-only controls have a name.

Done when: every area has at least one finding or a one-line "checked, fine: <what you tried>".
