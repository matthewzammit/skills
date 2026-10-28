# Review brief

Fill the `<...>` and give one copy to each review agent.

```
You are reviewing one week of changes in <repo> with one review skill: <skill name>.

- Read the skill: <path to its SKILL.md>, and the reference files it points to that fit this stack (<stack>).
- Range: <start>..<end> (<N> commits). Changed files: <list>. Read them at <end> (`git show <end>:<file>` when the
  working tree differs), plus the code around them that you need to judge a change. Nothing outside the range.
- The repo's own rules win over the skill's: <AGENTS.md, CLAUDE.md, the standards in extraChecks>. A rule the repo
  has decided against is not a finding.
- On a platform the skill was not written for, apply the principle and translate the mechanism; skip rules that
  have no equivalent.
- Already known, do not report again: <open findings from the last record, one line each>.
- Do not open <records folder>. Do not edit, commit or run anything that changes state.

Return at most 15 findings, the most serious first, each as:
  file:line | the skill's rule | what is wrong and why it matters | High, Medium or Low | the fix in one line
Then one line per rule area you checked and found fine. Under 600 words.
```
