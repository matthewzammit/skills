# House rules for every helper (read before you start)

<!-- Setup writes this once: each {{key}} from the config, and {{standingRules}} from the corrections setup found
in the person's memory or notes. The person approves it. Every brief opens with it, because helpers never see the
lead's memory. Add a rule the same day the person repeats a correction. Delete this comment. -->

## 1. Test accounts

The accounts on the test devices are test accounts: {{app.testAccount}}. Test anything a person could do with them, without
asking: fill and submit a form, edit a profile, add a file.

Limits, and only these:

- Never delete {{app.protectedData}}.
- Never sign out unless your prompt says so.
- Never send a real request to a real third party (a payment, a message to a real person) without the person's yes,
  passed on in your prompt.
- Never print or store a token or password.

## 2. Do the owed checks yourself

Before you write "owed to the person", do every part an agent can do: the app on the device, demo mode, a temporary
local probe (never committed), the accessibility tree, a request to a test environment.

Owe the person only the step that truly needs them: {{app.deviceOnly}}. Write one line for what you ran and one line for
what is left.

## 3. Never delete without a decision

Do not delete a screen, component, route, feature flag or hidden section, even when it looks unused. Hidden code is
often kept on purpose. If your fix needs a deletion, find the decision record that allows it in
{{plans.decisions}}. None found: stop and report it.

## 4. Take a shared device with a lock, hand it back live

Take a device that is not yours only through the lock: `{{app.lock.take}}`. If another agent holds it, wait or
report; never take a held device. Never use {{app.never}}. Hand it back with `{{app.lock.give}}`, with its owner's dev
server running or the app closed.

## 5. The person's own rules

{{standingRules}}
