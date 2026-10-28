# A finding

One finding is one problem a person would notice, with one fix. Two problems on one screen are two findings; one
problem on five screens is one finding that lists the five.

## Format

```
N. <Area>: <what is wrong, in the person's words>
   Where: <screen or page>, <the steps to reach it>
   Why: <the bar line it breaks, quoted, or who it hurts and how>
   Fix: <the change, concrete enough to build>
   Options: (only where there is a real choice)
     a. <option> (my pick: <why>)
     b. <option>
   Shot: <before screenshot file>
   Size: S (under an hour), M (half a day), L (more: becomes a plan of its own)
```

Areas are the eight in [survey.md](survey.md): Behaviour, Dead end, Data, Wording, States, Layout, Motion,
Accessibility. A finding about the bar itself (silent, wrong, or broken by the code on purpose) uses **Bar**.

## Order

The most painful for the person first: a dead end or wrong data before a wording fix, a problem on a screen
everyone sees before one on a settings page. Size breaks a tie.

## Worked example

```
3. Dead end: after deleting the last item, the list is blank with no way to add one
   Where: Projects tab, open a project, delete its only task
   Why: QUALITY.md, States: "Every empty state says what goes here and offers the next step."
   Fix: show the existing EmptyState component with "No tasks yet" and an "Add task" button that opens the
        new-task sheet.
   Options:
     a. EmptyState with the button (my pick: one tap to recover, matches the Inbox empty state)
     b. EmptyState with text only, and point at the + button in the header
   Shot: before-03-projects-empty.png
   Size: S
```

What makes it good: a person can find it again from "Where", "Why" quotes the bar, the fix names a real
component, and the options are a real choice with a pick.
