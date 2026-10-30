# Setup

Ask these, one message, short options with a default:

1. **Where do records go?** Default: `~/.claude/retro-session/<repo>/`, outside the repo. Choose `.retro-session/`
   in the repo when the team should see them.
2. **How do fixes ship?** Default: one branch and one pull request per retro, with the fixes and their tests.
   Ask whether the repo also wants a plan file or a ticket, and the exact commands for them.
3. **Anything the scan should also count?** Extra failure text the repo's tools print (`--pattern`, a regular
   expression), for example a test runner's "0 tests ran".

Write the config:

```json
{
  "repo": "owner/name",
  "records": "/Users/me/.claude/retro-session/name",
  "ship": "One branch and one pull request per retro. Each fix with a test.",
  "patterns": []
}
```

`ship` is free text in the person's words, followed as written. It can name the repo's own commands for plans,
tickets and pull requests.

If records from an earlier retro exist anywhere (a plans folder, notes), name them in the first record under
"Earlier retros", so step 4 can find repeats from the first run.
