# Skills

Agent skills by [Matthew Zammit](https://github.com/matthewzammit), made while building the
[Binderr](https://binderr.com) Wallet app with Claude Code. Each one is a folder with a `SKILL.md` (what the agent
follows) and a `README.md` (what a person reads).

| Skill | What it does |
|---|---|
| [figma-from-code](skills/figma-from-code/) | Rebuild your app in Figma from its code: every screen in light and dark with its states, a design system of real components and variables, and an optional brand deck, in reviewed batches. |
| [figma-sync](skills/figma-sync/) | Keep that Figma file in step with the code: a sync after each change or release, and a weekly drift check that asks before it changes anything. |

## Install

With the [`skills`](https://skills.sh) CLI, for Claude Code, Cursor, Codex and other agents:

```
npx skills add matthewzammit/skills
```

It asks which skills and agents to install. Add `-g` to install for every project.

As a Claude Code plugin:

```
/plugin marketplace add matthewzammit/skills
/plugin install matthewzammit-skills@matthewzammit
```

Or copy a skill's folder into `~/.claude/skills/` or `<your repo>/.claude/skills/`.

## License

[MIT](LICENSE)
