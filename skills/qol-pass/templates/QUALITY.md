# Quality bar

What "good" means for <product>. Every QoL pass judges screens against this file. Each line is checkable: look at a
screen and say pass or fail. Lines marked `(default)` are suggestions from the qol-pass skill; the rest describe
what the product already does. Change any line by pull request, like code.

Platforms: <mobile, web>. Themes: <light, dark>.

## Layout and spacing

- <Spacing comes from <the token scale, named>; no one-off values.>
- <Content keeps a <N> margin from the screen edges, and from the safe areas on mobile.>

## Typography and text size

- <Text uses <the type scale, named>.>
- <Every screen works at the largest text size: nothing cut off, nothing overlapping.>

## Colour and contrast

- <Colours come from <the theme, named>, in light and dark.>
- <Body text 4.5:1 against its background; large text and UI parts 3:1.>

## Components and consistency

- <Buttons, inputs, lists and sheets use <the shared components, named>.>
- <The same thing has the same name and the same look everywhere.>

## Wording

- <Case: <sentence case or title case> for labels and buttons.>
- <Buttons say what happens ("Save changes"), not "OK".>
- <No raw error codes or backend text on screen.>

## States

- <Every list and screen has an empty, a loading and an error state.>
- <Every empty state says what goes here and offers the next step.>
- <Every error says what happened and what to do next.>

## Navigation and dead ends

- <Every screen has a way back or a way forward.>
- <Back returns to where the person came from, with their place kept.>

## Feedback and motion

- <Every tap gives feedback within 100 ms.>
- <A finished task gets a small confirmation; a frequent action gets none.>
- <Motion respects Reduce Motion (mobile) and prefers-reduced-motion (web).>

## Accessibility

- <Every control has a name a screen reader reads, and a role.>
- <Tap targets at least 44 pt (iOS), 48 dp (Android), 24 px (web).>
- <Web: every action works from the keyboard, with a visible focus ring.>

## Data honesty

- <Counts, dates and labels match what the person did, right after they did it.>
