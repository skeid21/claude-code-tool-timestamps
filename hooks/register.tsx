import type { EngineInterface, Register, RenderElement } from 'claude-code'

import type { ToolTiming } from '../types'

const timings = { plugin: 'tool-timestamps', key: 'timings' } as const
const replies = { plugin: 'tool-timestamps', key: 'replies' } as const

const DURATION_WIDTH = 7

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatClock(ms: number): string {
  const at = new Date(ms)
  return `${pad2(at.getHours())}:${pad2(at.getMinutes())}:${pad2(at.getSeconds())}`
}

export function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m${pad2(Math.floor(seconds % 60))}s`
}

/**
 * Right-edge stamp: the duration column comes first so the clock always sits flush right
 * and lines up across tool rows and replies.
 */
export function stampText(startedAt: number, endedAt: number | null): string {
  const duration = endedAt === null ? '' : formatDuration(endedAt - startedAt)
  return ` ${duration.padStart(DURATION_WIDTH)}  ${formatClock(startedAt)}`
}

export function replyStampText(at: number): string {
  return `  ${formatClock(at)}`
}

async function readTiming($: EngineInterface, id: string): Promise<ToolTiming | undefined> {
  const { value } = await $.state.get({ ...timings, id })
  return value
}

function withStamp($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0], stamp: string, drawing: RenderElement) {
  const { Box, Text } = $.ui.resolve(e)

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" flexGrow={1} flexShrink={1}>
        {drawing}
      </Box>
      <Box flexShrink={0}>
        <Text dimColor>{stamp}</Text>
      </Box>
    </Box>
  )
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const ref = { ...timings, id: e.tool_use_id }
    const startedAt = await $.clock.now()
    await $.state.set(ref, { startedAt, endedAt: null })

    try {
      return await next(e)
    } finally {
      await $.state.set(ref, { startedAt, endedAt: await $.clock.now() })
    }
  })

  on('session.append', { door: 'response' }, async ($, e, next) => {
    await $.state.set({ ...replies, id: e.uuid }, await $.clock.now())
    return next(e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }

    const timing = await readTiming($, e.props.tool_use_id)
    const drawing = await next(e)
    if (timing === undefined) {
      return drawing
    }

    return withStamp($, e, stampText(timing.startedAt, timing.endedAt), drawing)
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isExpanded) {
      return next(e)
    }

    const ids = e.props.calls.flatMap(call => (call.tool_use_id === undefined ? [] : [call.tool_use_id]))
    const found = await Promise.all(ids.map(id => readTiming($, id)))
    const known = found.filter((timing): timing is ToolTiming => timing !== undefined)
    const drawing = await next(e)
    if (known.length === 0) {
      return drawing
    }

    const startedAt = Math.min(...known.map(timing => timing.startedAt))
    const isDone = !e.props.isActive && known.every(timing => timing.endedAt !== null)
    const endedAt = isDone ? Math.max(...known.map(timing => timing.endedAt ?? 0)) : null

    return withStamp($, e, stampText(startedAt, endedAt), drawing)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }

    const { value: at } = await $.state.get({ ...replies, id: e.requestId })
    const drawing = await next(e)
    if (at === undefined) {
      return drawing
    }

    return withStamp($, e, replyStampText(at), drawing)
  })
}
