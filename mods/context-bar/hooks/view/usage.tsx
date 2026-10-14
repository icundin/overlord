import { cacheHit, sumTokens, totalTokens } from '../figures'
import { ago, compact, duration, levelColor, limitLabel, modelLabel, resetsIn } from '../format'
import { chunk, parts } from './kit'
import type { Kit } from './kit'

const LIMIT_BAR = 20

// The plan limits, the session's cost and time, the tokens counted, and compact or start anew.
export function usageCard(kit: Kit) {
  const { Box, Text } = kit.ui
  const { section, chip } = parts(kit)
  const { view, act } = kit
  const current = view.usage
  const counted = view.tally
  const limits = current.limits
  const limitsAge = view.limitsAt === null ? [] : [`updated ${ago(view.limitsAt, view.now)}`]
  const labels = limits.map(limit => limitLabel(limit.kind))
  const labelWidth = Math.max(0, ...labels.map(label => label.length))
  const byModel = Object.entries(counted?.models ?? {})
  const tokens = sumTokens(byModel.map(([, one]) => one))
  const all = totalTokens(tokens)
  const hit = cacheHit(tokens)
  // The desktop app's three columns: cost, api, active, then each model's share and the cache hit rate.
  const figures = [
    current.cost !== null && { label: 'cost', value: `$${current.cost.toFixed(2)}` },
    counted !== null && { label: 'api', value: duration(counted.apiMs) },
    counted !== null && { label: 'active', value: duration(counted.activeMs) },
    ...byModel.map(([model, one]) => ({
      label: modelLabel(model),
      value: `${all === 0 ? 0 : Math.round((totalTokens(one) / all) * 100)}%`,
    })),
    hit !== null && { label: 'cache hit', value: `${hit}%` },
  ].filter(figure => figure !== false)
  const figureWidth = Math.max(0, ...figures.map(figure => figure.label.length + 1 + figure.value.length))
  const modelNames = byModel.map(([model]) => modelLabel(model)).join(', ')
  const tokenRows = [
    ['input', tokens.input],
    ['output', tokens.output],
    ['cache read', tokens.cacheRead],
    ['cache write', tokens.cacheWrite],
  ] as const

  return (
    <Box key="usage" flexDirection="column" rowGap={1}>
      {limits.length > 0 &&
        section('limits', 'plan usage limits', [limits.map(limit => `${limit.percentUsed}%`).join(', '), ...limitsAge], () =>
          limits.map((limit, i) => {
            const filled = Math.min(LIMIT_BAR, Math.round((limit.percentUsed / 100) * LIMIT_BAR))

            return (
              <Text key={limit.kind}>
                {(labels[i] ?? '').padEnd(labelWidth)}{'  '}
                <Text color={levelColor(limit.percentUsed)} backgroundColor={kit.shadeBehind}>
                  {'▓'.repeat(filled)}
                </Text>
                <Text color="subtle">{'░'.repeat(LIMIT_BAR - filled)}</Text>
                {'  '}
                <Text bold>{`${limit.percentUsed}%`.padStart(4)}</Text>
                <Text dimColor>{limit.resetsAt === null ? '' : `  resets in ${resetsIn(limit.resetsAt, view.now)}`}</Text>
              </Text>
            )
          }),
        )}
      {figures.length > 0 &&
        section('session', 'this session', current.cost === null ? [] : [`$${current.cost.toFixed(2)}`], () =>
          chunk(figures, 3).map((line, row) => (
            <Box key={`figures-${row}`} columnGap={3}>
              {line.map(figure => (
                <Text key={figure.label}>
                  <Text dimColor>{figure.label}</Text> <Text bold>{figure.value}</Text>
                  {' '.repeat(figureWidth - figure.label.length - 1 - figure.value.length)}
                </Text>
              ))}
            </Box>
          )),
        )}
      {counted !== null &&
        section(
          'tokens',
          'tokens',
          [compact(all), ...(modelNames ? [modelNames] : []), `counted for the last ${duration(view.now - counted.since)}`],
          () =>
            tokenRows.map(([label, value]) => (
              <Text key={label}>
                {label.padEnd(12)}
                <Text bold>{compact(value).padStart(7)}</Text>
              </Text>
            )),
        )}
      <Box key="actions" flexDirection="column">
        <Text key="tip" dimColor>
          Longer sessions cost more, even when cached. Compact mid-task, and start a new session when you switch tasks.
        </Text>
        <Box key="buttons" columnGap={2}>
          {chip('compact', view.confirming === 'compact' ? 'confirm compact' : 'compact this session', act.compact, view.confirming === 'compact')}
          {chip('clear', view.confirming === 'clear' ? 'confirm new session' : 'new session', act.newSession, view.confirming === 'clear')}
        </Box>
      </Box>
    </Box>
  )
}
