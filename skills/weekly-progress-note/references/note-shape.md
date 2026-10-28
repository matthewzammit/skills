# The shape of the note

Short enough to read in a minute. Blank lines between the parts: in Slack and email they keep the groups apart.

```
Weekly progress, <period>
<One or two sentences: a big or a slow week and why, the biggest piece still in progress.>

Last week
- <Topic>: <what changed for the people who use it>
- ...                                      (5 to 8 lines)

This week (suggested)
- <Carried over: topic>
- <Next step from open work>
- Maybe: <a stretch item>                  (one or two at most)
```

## Writing the lines

- **One topic per line.** Twenty small pull requests on the same screen are one line: "Settings polish: clearer
  labels, faster loading, works at the largest text size".
- **Name the feature, not the code.** "Invoices can be paid by card", never "Added StripeCheckoutSession to
  billing.ts" or "PR #412".
- **Say what changed for the user,** when there is one. Internal work gets one line for all of it ("Faster test
  runs and a cleaner release process").
- **Plain words.** The person reading may not be an engineer. Explain or drop any term they would not know.
- **No claims you cannot point to.** A line comes from a merged pull request or a commit to the main branch, a
  release, a changelog entry or a closed ticket in the period; an "In progress" line from an open pull request.

## A quiet week

A week with nothing merged still gets a short note, so nobody wonders:

```
Weekly progress, 19 to 25 October
A quiet week in the code: <context: add what the repo cannot show>.

Last week
- In progress: the invoice redesign (the detail page, not merged yet)

This week (suggested)
- Carried over: the invoice redesign
```

## A made-up example

```
Weekly progress, 19 to 25 October
A big week for payments: card payments shipped, and the invoice redesign is half done.

Last week
- Card payments: customers can pay an invoice by card, with receipts by email
- Invoices list: search by customer name, and filters for paid and overdue
- Sign-in: magic links now work on mobile, and expired links explain what to do
- Settings polish: clearer labels, and every page works at the largest text size
- Two releases (1.4.0 and 1.4.1), the second fixing a crash on older phones
- Behind the scenes: faster tests and a simpler release checklist

This week (suggested)
- Carried over: the invoice redesign (the list is done, the detail page is next)
- Partial refunds from the invoice page
- Maybe: export invoices to CSV
```

Last week's plan, checked:

```
- Card payments: done
- Invoice redesign: partly done (list shipped, detail page not started)
- CSV export: not started, carried over as a Maybe
```
