# {{run}}: tracker

The source of truth if the lead's context is summarised. Update it as things happen, not at the end.

- **Started:** {{date}} · **Lens:** {{lens}} · **Output:** findings only | fix
- **Worktree:** {{worktree}} · **Branches:** {{branch}}, each cut from {{mainBranch}}, never stacked
- **Device:** {{device}} · **Spare:** {{spare}} · **Account:** {{account}}
- **Epic:** {{epic}}
- **Baseline:** tests {{testTime}} ({{testCount}}), type-check {{typecheckTime}}, build {{buildTime}}, bundle {{bundleSize}}
- **Earlier runs read:** {{earlierRuns}}

## Phases

`resume` starts at the first unticked phase. Tick each one when its "Done when" line in SKILL.md is true.

- [ ] 1. Agree the run
- [ ] 2. Set up the run
- [ ] 3. Plan the sections
- [ ] 4. Survey
- [ ] 5. Triage and pick
- [ ] 6. Build and review
- [ ] 7. Check in the running app
- [ ] 8. Pull requests and merging
- [ ] 9. Close out

## Agreed

1. Can a fix change what a person sees:
2. How a fix ships:
3. Where the work goes:
4. How big a fix may be:
5. Who merges:
6. Never without a yes:

## Assumptions

- A1:

## Sections

| Section | Lens | Survey | Findings (H/M/L) | Units | Notes |
|---|---|---|---|---|---|

## Decisions

| Id | Question | Options | Pick | Answer |
|---|---|---|---|---|

## Units

One row per unit from triage onward. Every unit has a final state before the run closes.

| Unit | Findings | Wave | Branch | Plan | Ticket | Model | Built | Review | App check | PR | Merged | Waits on |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

## Big items

| Item | Findings | Ticket | Plan |
|---|---|---|---|

## Owed to the person

| Unit | What | Why an agent cannot |
|---|---|---|

## Log

- {{time}}: kickoff
