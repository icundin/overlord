import { DEFAULT_OPEN } from '../defaults'
import { cacheHit, sumTokens, totalTokens } from '../figures'
import { ago, compact, dollars, duration, levelColor, limitLabel, modelLabel, resetsIn } from '../format'
import { MAIN, spendGroups } from '../spend'
import type { SpendGroup } from '../spend'
import { chunk, parts } from './kit'
import type { Kit } from './kit'

const BAR_CELLS = 20

// The plan limits, the session's cost and time, the tokens counted, and compact or start anew.
export function usageCard(kit: Kit) {
  const { Box, Button, Text } = kit.ui
  const { section, chip } = parts(kit)
  const { view, act } = kit
  const current = view.usage
  const counted = view.tally
  const limits = current.limits
  const limitsAge = view.limitsAt === null ? [] : [`updated ${ago(view.limitsAt, view.now)}`]
  const labels = limits.map(limit => limitLabel(limit.kind))
  const byModel = Object.entries(counted?.models ?? {})
  const tokens = sumTokens(byModel.map(([, one]) => one))
  const all = totalTokens(tokens)
  const hit = cacheHit(tokens)
  // The desktop app's three columns: cost, api, active, then each model's share and the cache hit rate.
  const figures = [
    current.cost !== null && { label: 'cost', value: dollars(current.cost) },
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
  const groups = view.spend === null ? [] : spendGroups(view.spend)
  const spendTotal = groups.reduce((sum, group) => sum + group.usd, 0)
  const shareOf = (usd: number) => (spendTotal === 0 ? 0 : Math.round((usd / spendTotal) * 100))
  const subagents = view.spend?.agents.filter(one => one.id !== MAIN) ?? []
  const main = groups.find(group => group.key === MAIN)
  const shares = [
    ...(main === undefined ? [] : [`main ${shareOf(main.usd)}%`]),
    ...(subagents.length === 0
      ? []
      : [`${subagents.length} subagent${subagents.length === 1 ? '' : 's'} ${shareOf(subagents.reduce((sum, one) => sum + one.usd, 0))}%`]),
  ]
  // Says only what the rows say: before the first request is counted, what there is (`earlier 100%`).
  const agentSummary = (shares.length > 0 ? shares : groups.map(group => `${group.label} ${shareOf(group.usd)}%`)).join(', ')
  // The `N more` row opens to the rows it stands for, listed under it.
  const isMoreOpen = view.opened.agentsMore ?? DEFAULT_OPEN.agentsMore
  const agentRows = groups.flatMap(group =>
    group.folded === undefined
      ? [{ group, label: group.label, isMore: false }]
      : [
          { group, label: `${isMoreOpen ? '⌄' : '›'} ${group.label}`, isMore: true },
          ...(isMoreOpen ? group.folded.map(one => ({ group: one, label: one.label, isMore: false })) : []),
        ],
  )
  const agentDetail = (group: SpendGroup) =>
    [
      dollars(group.usd),
      ...(group.tokens === null ? [] : [`${compact(group.tokens)} tokens`]),
      ...(group.models.length === 0 ? [] : [group.models.map(modelLabel).join(', ')]),
    ].join(' · ')
  // One label column for the limits and the agents, the folded rows counted open or not, so the bars start in line
  // and stay put when the list opens.
  const folded = groups.flatMap(group => group.folded ?? [])
  const labelWidth = Math.max(
    0,
    ...labels.map(label => label.length),
    ...agentRows.map(row => row.label.length),
    ...folded.map(one => one.label.length),
  )
  // A bar filled to `percent`, the percentage, and the detail after it.
  const gauge = (percent: number, color: string, detail: string) => {
    const filled = Math.min(BAR_CELLS, Math.round((percent / 100) * BAR_CELLS))

    return [
      <Text key="filled" color={color} backgroundColor={kit.shadeBehind}>
        {'▓'.repeat(filled)}
      </Text>,
      <Text key="empty" color="subtle">
        {'░'.repeat(BAR_CELLS - filled)}
      </Text>,
      '  ',
      <Text key="percent" bold>
        {`${percent}%`.padStart(4)}
      </Text>,
      <Text key="detail" dimColor>
        {detail === '' ? '' : `  ${detail}`}
      </Text>,
    ]
  }
  // A row of bars: the label, then its gauge.
  const meter = (key: string, label: string, percent: number, color: string, detail: string) => (
    <Text key={key}>
      {label.padEnd(labelWidth)}{'  '}
      {gauge(percent, color, detail)}
    </Text>
  )
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
          limits.map((limit, i) =>
            meter(
              limit.kind,
              labels[i] ?? '',
              limit.percentUsed,
              levelColor(limit.percentUsed),
              limit.resetsAt === null ? '' : `resets in ${resetsIn(limit.resetsAt, view.now)}`,
            ),
          ),
        )}
      {figures.length > 0 &&
        section('session', 'this session', current.cost === null ? [] : [dollars(current.cost)], () =>
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
      {groups.length > 0 &&
        section('agents', 'cost by agent', [agentSummary], () =>
          agentRows.map(({ group, label, isMore }) =>
            isMore ? (
              // Only the label is the button, grey as every button label is (see `parts`).
              <Box key="agents-more-row">
                <Button key="agents-more" plain label={group.label} onPress={() => act.toggleSection('agentsMore')}>
                  <Text color="inactive">{label}</Text>
                </Button>
                <Text>
                  {' '.repeat(labelWidth - label.length + 2)}
                  {gauge(shareOf(group.usd), group.color, agentDetail(group))}
                </Text>
              </Box>
            ) : (
              meter(`agent-${group.key}`, label, shareOf(group.usd), group.color, agentDetail(group))
            ),
          ),
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
