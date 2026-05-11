# pi-agent-system

[![ci](https://github.com/code-yeongyu/pi-agent-system/actions/workflows/ci.yml/badge.svg)](https://github.com/code-yeongyu/pi-agent-system/actions/workflows/ci.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Agent profile extension for the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent). It reads the sub-agent type from `SANEPI_AGENT_TYPE` or `PI_AGENT_TYPE`, loads markdown agent profiles, filters the active toolset, and appends per-agent prompt fragments.

This package is the standalone extraction of senpi-mono's former builtin `agent-system` extension.

## Behavior

| Case | Result |
|------|--------|
| No `SANEPI_AGENT_TYPE` / `PI_AGENT_TYPE` | extension stays inactive |
| Known agent type | filters active tools using the agent's `tools` rules |
| Agent has prompt body | appends the body to the system prompt before the agent starts |
| Unknown agent type | logs available agent types and leaves tools unchanged |

Built-in profiles:

| Agent | Purpose | Default tool rules |
|-------|---------|--------------------|
| `general` | General sub-agent for parallel work | allow everything except nested `task` and `todowrite` |
| `explore` | Fast read-only exploration | deny by default, allow `read`, `grep`, `find`, `ls`, `bash` |

## Agent files

Create markdown files in any of these locations:

- `~/.pi/agent/agents/<name>.md`
- `~/.pi/agent/agent/<name>.md`
- `~/.senpi/agent/agents/<name>.md`
- `~/.senpi/agent/agent/<name>.md`
- `<project>/.pi/agents/<name>.md`
- `<project>/.pi/agent/<name>.md`
- `<project>/.senpi/agents/<name>.md`
- `<project>/.senpi/agent/<name>.md`

Project definitions override global definitions. `.senpi` definitions override `.pi` definitions at the same scope.

```md
---
description: Review code changes
mode: subagent
model: gpt-5.1
temperature: 0.2
tools:
  "*": deny
  read: allow
  grep: allow
  bash:
    "git diff*": allow
---
You are a careful code-review sub-agent.
Focus on correctness, regressions, and missing tests.
```

The file name is the agent type. For example, `reviewer.md` is selected by spawning a sub-agent with `agent_type: "reviewer"`.

## Settings defaults

Global and project settings can define default rules that apply before an agent profile's own rules:

```json
{
  "agentDefaults": {
    "permission": {
      "bash": "deny"
    }
  }
}
```

Settings files are read from:

- `~/.pi/agent/settings.json`
- `~/.senpi/agent/settings.json`
- `<project>/.pi/settings.json`
- `<project>/.senpi/settings.json`

## Installation

```bash
# 1. From npm (once published)
pi install npm:pi-agent-system

# 2. From git
pi install git:github.com/code-yeongyu/pi-agent-system

# 3. Manual placement
git clone https://github.com/code-yeongyu/pi-agent-system ~/.pi/agent/extensions/pi-agent-system
cd ~/.pi/agent/extensions/pi-agent-system && npm install

# 4. Dev / one-shot test
pi -e /path/to/pi-agent-system/src/index.ts
```

After installation, restart pi or run `/reload` inside an interactive session.

## Development

```bash
npm install
npm test
npm run typecheck
npm run check
npm pack --dry-run
SANEPI_AGENT_TYPE=explore pi -e ./src/index.ts
```

## Branch rules and releases

- `main` is protected by `.github/branch-ruleset.json`.
- CI runs Node 20 and 22 on Ubuntu and macOS.
- Releases are GitHub Releases tagged as `v<semver>`.
- Publishing runs from the `publish` workflow after a GitHub Release is published.

## Origin

Extracted from `packages/coding-agent/src/core/extensions/builtin/agent-system` in `code-yeongyu/senpi-mono`.

## License

[MIT](LICENSE).

## Acknowledgements

- **Mario Zechner** ([@badlogic](https://github.com/badlogic)) — author of [pi-mono](https://github.com/badlogic/pi-mono) and the pi-coding-agent extension API this package targets.
- **Yeongyu Kim** ([@code-yeongyu](https://github.com/code-yeongyu)) — maintainer of the senpi fork and this extracted extension.
