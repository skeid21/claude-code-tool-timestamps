import { expect, mock, test } from 'claude-code/testing'

import { formatDuration, stampText } from '../hooks/register'

const STARTED = Date.UTC(2026, 9, 1, 21, 31, 44)

test('durations read in seconds under a minute and minutes past it', () => {
  expect(formatDuration(3_240)).toBe('3.2s')
  expect(formatDuration(125_000)).toBe('2m05s')
})

test('a running call leaves the duration column blank and keeps the clock flush right', () => {
  expect(stampText(STARTED, null)).toMatch(/^ {10}\d\d:31:44$/)
  expect(stampText(STARTED, STARTED + 3_200)).toMatch(/^ {4}3\.2s  \d\d:31:44$/)
})

test('a finished tool row keeps the engine drawing first and puts the stamp after it', async ($, on) => {
  const clock = mock.clock(on, { now: STARTED })
  let callId = ''
  on('tool.call', { tool: 'Bash' }, async (_, e) => {
    callId = e.tool_use_id
    await clock.sleep(3_200)
    return { result: { stdout: 'ok', stderr: '', interrupted: false } } as never
  })
  on('ui.render', { component: 'ToolUse' }, ($inner, e) => {
    const { Text } = $inner.ui.resolve(e)
    return <Text>● Bash(ls)</Text>
  })

  const call = $.tool.call({ tool: 'Bash', command: 'ls', description: 'list' } as never)
  await clock.advance(3_200)
  await call

  const ui = await $.ui.mount({
    plugin: 'tool-timestamps',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: callId,
    props: { tool_use_id: callId, tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: false, isInterrupted: false },
  })

  const texts = await ui.findAll({ type: 'Text' })
  expect(texts.map(text => text.text)).toEqual(['● Bash(ls)', stampText(STARTED, STARTED + 3_200)])
  await ui.unmount()
})

test('a row the plugin never timed is drawn unchanged', async ($, on) => {
  on('ui.render', { component: 'ToolUse' }, ($inner, e) => {
    const { Text } = $inner.ui.resolve(e)
    return <Text>● Read(a.md)</Text>
  })

  const ui = await $.ui.mount({
    plugin: 'tool-timestamps',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'never-seen',
    props: { tool_use_id: 'never-seen', tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false },
  })

  expect(await ui.find({ type: 'Text', text: /\d\d:\d\d:\d\d/ })).toBeUndefined()
  await ui.unmount()
})
