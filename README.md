# Tool Timestamps for Claude Code

See when every tool call started and how long it took, right in the transcript.

```
● Bash(./build.sh)                                     42.7s  15:39:20
  ⎿  Build succeeded
● Read 3 files, searched 2 patterns                     0.4s  15:40:03
● The build passed. Next I'll run the tests …                 15:40:05
```

- **Tool calls** get their local start time, and the duration once they finish, at the right
  edge of the row's first line.
- **Grouped lines** (`Read 3 files, …`) get one stamp covering the whole group.
- **Replies** get the time each block of text arrived.
- Nothing shifts: the bullet stays at the left edge, and the clock is always flush right so
  the times line up down the screen.

## Install

In Claude Code:

```
/plugin marketplace add <github-user>/claude-code-tool-timestamps
/plugin install tool-timestamps@tool-timestamps
```

Then restart Claude Code.

### Requirements

- A Claude Code build with function-hook plugins (developed and tested on 2.1.287). That
  plugin API is in early access and can change between releases.
- The terminal. The desktop app and the VS Code extension draw their rows differently, so
  the plugin leaves them unchanged there.

## Notes

- Durations count from the moment Claude issues the call, so time spent waiting on a
  permission prompt is included.
- Timings live in the session's memory: rows from before the plugin loaded, or from a
  resumed session, are drawn without a stamp.
- A reply block is stamped when it finishes arriving, so a long block's time can trail the
  moment it began appearing by a few seconds.

## Develop

Load your working copy for one session:

```
claude --plugin-dir /path/to/claude-code-tool-timestamps
```

Check it:

```
claude plugin validate .
claude plugin test .
```

Claude Code lays the API's TypeScript declarations into `.claude-plugin/types/` whenever it
loads the plugin from disk; `tsconfig.json` extends them, so `tsc -p .` type-checks the
plugin after one load.

## License

[MIT](LICENSE)
