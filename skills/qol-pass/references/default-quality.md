# Default quality bar

The bar a section is judged against when a repo has no written standards, and the base for a drafted QUALITY.md.
A team's own standards always win over this file. Each line is a check: look at a screen and say pass or fail.

## Layout and spacing
- A page made of sections gives each a title. The gap between sections is clearly larger than the gap between rows.
- Spacing comes from one scale (a 4-point grid). No one-off values.
- Nothing is clipped, overlapped or pushed off screen at any supported size.
- Each screen has one primary action, its reason to exist. A per-row action is never a primary on a list page.
- Long text and form fields sit on solid surfaces. Blur or glass is for floating layers such as bars and sheets.
- Mobile: content respects the safe areas. Web: the layout holds from 320px to 1440px+ with no horizontal scroll.

## Typography and text size
- Sizes and weights come from one type scale. Hierarchy comes from size and weight, not extra greys.
- Text follows the person's size setting and is not capped. Mobile: system text size. Web: browser zoom to 200%.
- Labels wrap. They never clip or shrink to fit. A line limit is only for a preview of text shown in full elsewhere.
- A one-word chip or status never breaks inside its word. The label beside it wraps instead.
- Short wrapping copy (titles, dialog messages, empty states, buttons) never ends with one word alone on a line.
- A number that changes in place (countdown, counter) uses tabular figures. A static price or amount does not.

## Colour and contrast
- Colours come from the theme or design tokens. No raw hex or rgba value in a screen.
- Text has 4.5:1 contrast against what is behind it. Large text and UI parts (icons, control edges, focus rings) 3:1.
- Translucent fills are measured composited. Text on a blur, image or glass gets a scrim, never lower contrast.
- Secondary grey text still has 4.5:1 on every surface. A fainter grey is for disabled labels only.
- Colour is never the only signal: a status also has a word or an icon. Words are coloured only for a warning or error.
- Bright status colours belong on dots, chips and bars, not on a large button fill.
- Every shipped theme (light, dark, follow-system) passes, not just the default one.

## Components and consistency
- A shared component is used, not redrawn. Same job, same component, same look on every screen.
- A different look of a component is a variant of it. A new component is for a job no existing one does.
- One icon set, one stroke weight, one icon per concept. A different meaning gets a different icon (a tick is not a seal).
- A row that opens something shows a chevron or equivalent. A row that does nothing shows none.
- Tappable rows and cards give press feedback, with one effect only (Web: hover and active states too).
- A status on a row is the same chip everywhere. It shows the exceptional state (expired), not the default (active).

## Wording
- The same thing has the same name on every screen. Sentences are short, plain and active.
- An error says what failed ("We could not save your changes") and what to do next. Never a bare "Something went
  wrong".
- "Check your connection" only when no answer came back. Otherwise "Try again in a moment".
- A reason the backend wrote for the person is shown as written. The fallback sentences are ours.

## States (empty, loading, error, offline, success)
- Every list and page has an empty, a loading and an error state. Each says something useful.
- Empty says what is missing and offers one next step in a quiet control, not the loud primary.
- Loading a page or list shows a skeleton, not a spinner. A button's own busy state may spin.
- Error says what failed, offers a retry, and is spoken to a screen reader.
- Offline says there is no connection, keeps what was already loaded, and recovers when the connection returns.
- Success shows on the thing that changed, and only after the result is known.

## Navigation and dead ends
- Mobile: every pushed page has a back control, and an edge swipe (iOS) or system Back (Android) closes it.
- Back returns to the screen the person came from. Web: the URL names the page and a reload returns to it.
- Empty, error, finished and offline states each offer a way out or a next step.
- A double tap or slow network never creates a duplicate action.
- A destructive action has one guard: a confirm dialog, or a step that already asks for confirmation. Not both.

## Feedback and motion
- Each feature answers "does this need a moment?" A finished task, a change to something on screen or a destructive
  action earns a small, true confirmation (a tick or pop, and on Mobile one haptic).
- A frequent action (unlock, tab switch, refresh, scroll) gets none. A celebration there becomes a delay.
- A confirmation plays after the result is known, never on the press. A failure or a cancel plays nothing like success.
- It plays on the thing that changed, while that screen is in front, once. Not on a refetch, reopen or remount.
- A screen that opens with the change already there shows it at rest.
- It is short and subtle: a small mark about 300 to 350 ms, a screen moment about a second, one overshoot, no confetti.
- Reduce Motion (Mobile: the OS setting, Web: prefers-reduced-motion) drops automatic and decorative motion to a
  fade or nothing and shows the end state at rest. The haptic still plays. Motion the person drives stays.
- Nothing jumps: a replaced element keeps its place and size, and nothing snaps in one frame while the screen moves.

## Accessibility
- Every control has a role and a name. The name says the thing (the contact's name, the field and its value), not the
  verb. Icon-only controls are named. Decorative icons are not. A row that draws a status also speaks it.
- Announced state matches real state: disabled only when disabled, busy while working. Every error is announced.
- Targets are at least 44pt on iOS, 48dp on Android and 24px on the web. Neighbouring hit areas never overlap.
- Contrast: 4.5:1 for text, 3:1 for large text and UI parts. Mobile: VoiceOver and TalkBack read in logical order.
- Web: everything works by keyboard, Tab order follows reading order, focus is visible, Escape closes a dialog
  and focus returns to what opened it, and no control traps focus.
- At the largest text size nothing clips, centred content scrolls, and a dialog never outgrows the screen
  (its text scrolls, its action buttons stay in view).

## Data honesty
- Counts, dates and labels match what the person did and what the data says.
- No raw backend string reaches the screen: codes, enums, ids, snake_case, null, undefined, ISO timestamps.
- Text a person wrote shows as they wrote it, line breaks included.
- Nothing claims what the product cannot back, such as "verified" on something unchecked. Sample data never
  promises what the live product does not deliver.
