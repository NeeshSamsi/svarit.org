# Svarit.org — Project Instructions

## Sub-Agent Cleanup

This project follows the global sub-agent spawning rules (`~/.claude/CLAUDE.md`). Two rules in particular:

**No nested sub-agents — tell every sub-agent so explicitly.** Only the orchestrator may spawn agents. Every spawn prompt MUST instruct the sub-agent: do not spawn sub-agents, set orchestration timers, or delegate — if another agent is genuinely needed, escalate back up to the orchestrator; otherwise do the work yourself with your own tools. (Sub-agents with Solo MCP tools will otherwise try to orchestrate and loop.)

**Bubble up permission prompts.** If a sub-agent stalls asking permission for simple, expected tool calls, surface it to the user so they can enable auto mode within that sub-agent — don't silently work around it.

The cleanup policy in particular:

**Clean up at the START of the next turn, never at the end of the current one.** When a Solo sub-agent finishes its work and goes idle, leave it running. Do NOT close it as the turn wraps up. The next time a sub-agent is needed, make cleanup the first step of that turn (combined with the `mcp__solo__list_processes` + "Reuse over respawn" check):

- **Reuse** the leftover agent if it has useful context for the new work — overlapping category (`layout`, `design-system`, `content`), already-read relevant files, or related task history. Resume it via `mcp__solo__send_input` with a one-sentence context refresher.
- **Close** it via `mcp__solo__close_process` (stop first with `mcp__solo__stop_process` if still running) only if it has no useful overlap and a fresh agent would do just as well.

Why: an agent that just finished layout work may be exactly what the next layout task needs. Deferring cleanup preserves expensive file context for reuse and avoids respawn cost for recurring work.

Example: a session does layout work and spawns a `layout` agent — leave it alive at the end. The next session that needs an agent first inspects `layout`: good context for the new task → reuse; not worth it → close, then spawn fresh.
