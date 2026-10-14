import type { ElementTable } from 'claude-code'

import { alerts, hasUsage, turnsUntil } from '../figures'
import { compact, dollars, levelColor, modelLabel, share, signed } from '../format'
import { longestFitting, reveal, segments } from '../layout'
import { breakdownCard } from './breakdown'
import { CLOSE_WIDTH, filled, parts, swatchOf } from './kit'
import type { Actions, Kit, View } from './kit'
import { menuCard } from './menu'
import { settingsCard } from './settings'
import { usageCard } from './usage'

// The band: the header, the bar with a hover card per segment, the warning line, and the open card.
export function band(ui: ElementTable<'terminal'>, view: View, act: Actions) {
  const { Box, Button, Text } = ui
  const { usage: current, open, effort: level } = view
  const inner = view.width - 4
  // The card's border and padding, and the close button.
  const kit: Kit = { ui, view, act, inner, card: inner - 4 - CLOSE_WIDTH, shadeBehind: view.isLight ? 'white' : 'black' }
  const { headerButton, dot } = parts(kit)
  const isUsageShown = hasUsage(current)
  const isAutoCompact = current.autoCompactThreshold !== null
  const bar = segments(current.rows, inner)
  const shown = reveal(bar, view.fill)
  const { lastDelta, lastCost } = view.growth
  const growthNote = lastDelta
    ? ` · ${signed(lastDelta)}${lastCost !== null && lastCost > 0 ? ` · ${dollars(lastCost)}` : ''} last turn`
    : ''
  const totalNote = current.cost !== null && current.cost > 0 ? ` · ${dollars(current.cost)} total` : ''
  // The next mark the context heads for: the warning threshold, else the compaction point.
  const warnAt = view.settings.contextWarnPercent
  const mark =
    warnAt > 0 && warnAt > current.percentage
      ? { tokens: (warnAt / 100) * current.maxTokens, label: `${warnAt}%` }
      : current.autoCompactThreshold !== null
        ? { tokens: current.autoCompactThreshold, label: 'compaction' }
        : null
  const turnsLeft = mark === null ? null : turnsUntil(mark.tokens, current.totalTokens, view.growth.deltas)
  const projection = turnsLeft === null || mark === null ? '' : ` · ≈ ${turnsLeft} turn${turnsLeft === 1 ? '' : 's'} to ${mark.label}`
  const agentsNote = view.runningAgents > 0 ? `${view.runningAgents} agent${view.runningAgents === 1 ? '' : 's'}` : ''
  const compactsAt = current.autoCompactThreshold === null ? '' : ` · compacts at ${compact(current.autoCompactThreshold)}`
  const ofMax = ` of ${compact(current.maxTokens)}`
  // The header's left side as drawn, its items one cell apart: the session, then the tabs, which take a row of their
  // own under the bar when they do not fit beside the shortest totals.
  const lead = [
    '◆ context',
    '·',
    modelLabel(current.model),
    ...(level === null ? [] : ['·', level]),
    ...(agentsNote === '' ? [] : ['·', agentsNote]),
  ]
  const tabNames = ['breakdown', ...(isUsageShown ? ['·', 'usage'] : []), '·', 'settings']
  const shortestTotals = `${compact(current.totalTokens)}  ${current.percentage}% `.length
  const withTabs = [...lead, '│', ...tabNames].join(' ')
  const hasTabsRow = withTabs.length + 2 + shortestTotals > inner
  const title = hasTabsRow ? lead.join(' ') : withTabs
  // The totals give up detail as the band narrows: the projection first, then the growth note, the session's cost,
  // the compaction point, and the window.
  const detail = longestFitting(
    [
      `${ofMax}${compactsAt}${growthNote}${totalNote}${projection}`,
      `${ofMax}${compactsAt}${growthNote}${totalNote}`,
      `${ofMax}${compactsAt}${totalNote}`,
      `${ofMax}${compactsAt}`,
      ofMax,
      '',
    ],
    inner - title.length - 2 - shortestTotals,
  )
  const totals = `${compact(current.totalTokens)}${detail}  ${current.percentage}% `
  // Worked out on every draw from the figures and the settings, so a changed threshold shows at once.
  const warnings = alerts(
    { contextPercent: current.percentage, limits: current.limits, cost: current.cost },
    { context: view.settings.contextWarnPercent, limit: view.settings.limitWarnPercent, cost: view.settings.costWarnUsd },
  )
  const tabs = [
    headerButton('breakdown', 'breakdown', open === 'breakdown', () => act.toggle('breakdown')),
    isUsageShown && dot('usage-dot'),
    isUsageShown && headerButton('usage', 'usage', open === 'usage', () => act.toggle('usage')),
    dot('settings-dot'),
    headerButton('settings', 'settings', open === 'settings', () => act.toggle('settings')),
  ]
  // The context warning's `/compact` is itself the button: /compact opens no dialog, so the band keeps the keys.
  const COMMAND = '/compact'

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
      <Box key="header" justifyContent="space-between">
        <Box key="title" columnGap={1}>
          <Text key="name">
            <Text color="claude">◆</Text> <Text bold>context</Text>
          </Text>
          {dot('model-dot')}
          {headerButton('model', modelLabel(current.model), open === 'model', () => act.toggle('model'))}
          {level !== null && dot('effort-dot')}
          {level !== null && headerButton('effort', level, open === 'effort', () => act.toggle('effort'))}
          {agentsNote !== '' && dot('agents-dot')}
          {agentsNote !== '' && (
            <Text key="agents" color="suggestion">
              {agentsNote}
            </Text>
          )}
          {!hasTabsRow && (
            <Text key="panels-bar" color="subtle">
              │
            </Text>
          )}
          {!hasTabsRow && tabs}
        </Box>
        <Text key="total">
          <Text bold>{compact(current.totalTokens)}</Text>
          <Text dimColor>
            {detail}{' '}
          </Text>
          <Text bold color="inverseText" backgroundColor={levelColor(current.percentage)}>
            {` ${current.percentage}% `}
          </Text>
        </Text>
      </Box>
      <Box key="bar">
        {shown.flatMap(seg => {
          const scope = `segment:${seg.name}`

          if (seg.kind === 'buffer') {
            return [
              <Text key={seg.name} color={swatchOf(seg, isAutoCompact)} hover={{ scope, dimColor: true }}>
                {'▒'.repeat(seg.cells)}
              </Text>,
            ]
          }

          if (seg.kind === 'used') {
            // On hover a shaded segment's own color fills the gaps in the shade, and a solid one turns lighter
            // (dimColor turns colors grey on some terminals).
            const cells = filled(kit, seg.color)

            return [
              <Text key={seg.name} {...cells.style} hover={{ scope, ...cells.hover }}>
                {cells.glyph.repeat(seg.cells)}
              </Text>,
            ]
          }

          // The free space is a light shade, close to the background; it brightens on hover.
          return [
            <Text key={seg.name} color="subtle" hover={{ scope, color: 'inactive' }}>
              {'░'.repeat(seg.cells)}
            </Text>,
          ]
        })}
        {bar.map(seg => {
          const figures =
            seg.kind !== 'buffer'
              ? `${compact(seg.tokens)} · ${share(seg.tokens, current.maxTokens)} of the window`
              : current.autoCompactThreshold === null
                ? `${compact(seg.tokens)} reserved for compaction`
                : `${compact(seg.tokens)} reserved · compacts at ${compact(current.autoCompactThreshold)}`
          const name = seg.name.toLowerCase()
          // Padded to the totals' width so the card hides them; it never reaches the header's buttons.
          const padding = ' '.repeat(Math.max(0, totals.length - name.length - figures.length - 4))

          return (
            <Box
              key={`card-${seg.name}`}
              position="absolute"
              top={-1}
              right={0}
              display="none"
              hover={{ scope: `segment:${seg.name}`, display: 'flex' }}
            >
              <Text>
                {padding}
                <Text color={swatchOf(seg, isAutoCompact)}>■</Text> <Text bold>{name}</Text>
                {'  '}
                <Text dimColor>{figures}</Text>
              </Text>
            </Box>
          )
        })}
      </Box>
      {hasTabsRow && (
        <Box key="tabs" columnGap={1}>
          {tabs}
        </Box>
      )}
      {warnings.length > 0 && (
        <Box key="warnings">
          <Text key="mark" color="warning">
            ⚠{' '}
          </Text>
          {warnings.flatMap((warning, i) => {
            const separator =
              i === 0
                ? []
                : [
                    <Text key={`separator-${i}`} color="warning">
                      {' · '}
                    </Text>,
                  ]
            const at = warning.indexOf(COMMAND)

            return at === -1
              ? [
                  ...separator,
                  <Text key={`warning-${i}`} color="warning">
                    {warning}
                  </Text>,
                ]
              : [
                  ...separator,
                  <Text key={`warning-${i}`} color="warning">
                    {warning.slice(0, at)}
                  </Text>,
                  // A first click asks, in red; a second runs it.
                  <Button key="warning-compact" plain label={COMMAND} onPress={act.compact}>
                    <Text color={view.confirming === 'compact' ? 'error' : 'warning'} bold>
                      {view.confirming === 'compact' ? `${COMMAND}?` : COMMAND}
                    </Text>
                  </Button>,
                  <Text key={`warning-${i}-rest`} color="warning">
                    {warning.slice(at + COMMAND.length)}
                  </Text>,
                ]
          })}
        </Box>
      )}
      {open !== null && (
        <Box key="panel" borderStyle="round" borderColor="subtle" paddingX={1} justifyContent="space-between">
          {open === 'breakdown'
            ? breakdownCard(kit)
            : open === 'usage'
              ? usageCard(kit)
              : open === 'settings'
                ? settingsCard(kit)
                : menuCard(kit, open)}
          <Button key="close" plain label="[x]" onPress={act.close}>
            <Text color="inactive">[x]</Text>
          </Button>
        </Box>
      )}
    </Box>
  )
}
