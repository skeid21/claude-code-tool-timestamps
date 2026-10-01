export type ToolTiming = { startedAt: number; endedAt: number | null }

declare module 'claude-code' {
  interface PluginState {
    'tool-timestamps': { timings: StateFamily<ToolTiming>; replies: StateFamily<number> }
  }
}
