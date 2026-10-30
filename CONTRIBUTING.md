# Contributing

Thanks for helping. Reports from real runs are the most useful thing you can give, above all on **web apps**, where
these skills have had only one full run so far.

## Report a run

Open an issue with the "Report a run" template: what you built (mobile or web, framework, roughly how many screens),
which step went wrong or worked well, and what Claude did. Screenshots of the Figma result help. Remove anything
private first.

## Suggest a change

1. **Open an issue first** for a new skill or a big change, so we agree on it before you write it.
2. Fork the repo, make the change on a branch, and open a pull request against `main`.
3. Run the checks before you push:

   ```bash
   node --test test/*.test.js skills/figma-sync/scripts/*.test.js skills/dev-loop-audit/scripts/*.test.js
   node scripts/check-repo.js
   ```

   They run again on every pull request.

## How the skills are written

- **One folder per skill** in `skills/`: `SKILL.md` (what the agent follows) and `README.md` (what a person reads).
  The folder name and the `name` in `SKILL.md` match, lowercase with hyphens.
- **The name starts with the word people search for**: `retro-session`, not `session-retro`. Type the first
  word of the job ("retro", "figma", "weekly") and the skill shows up beside the others for it.
- **SKILL.md is steps**, each ending with a "Done when" line the agent can check. Longer reference goes in
  `references/` and is linked from the step that needs it.
- **Learned the hard way?** Add it to `references/build-rules.md` as one short rule, with the mistake it prevents.
- **Shared copies:** `figma-sync` carries copies of `references/build-rules.md` and `templates/batch-brief.md` from
  `figma-from-code`, so it can be installed on its own. Change both; a test checks they match.
- **No project details**: no company names, file keys, ticket tools or fonts from your own project.
- **House style**: plain, short sentences; no em or en dashes; ASCII diagrams, not Mermaid.

By contributing, you agree your work is released under the [MIT license](LICENSE).
