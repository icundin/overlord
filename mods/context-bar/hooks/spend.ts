// What each agent's requests cost: the session total's growth, measured as requests start and end.

import type { AgentSpend, Spend } from '../types'

// The main loop's id among the agents; subagents go by the engine's agent id.
export const MAIN = 'main'

// The main loop in Claude Code's orange, then the subagents in the order they first spent, each keeping its color.
const MAIN_COLOR = '#D97757'
const AGENT_COLORS = ['#6A9BCC', '#16A34A', '#CA8A04', '#0891B2', '#C46686', '#827DBD']

export function startSpend(total: number): Spend {
  return { earlier: total, other: 0, read: total, agents: [] }
}

// Growth seen as a request starts follows no request the mod saw end: Claude Code's own.
export function costAtStart(spend: Spend | null, total: number): Spend {
  const was = spend ?? startSpend(total)

  return { ...was, other: was.other + Math.max(0, total - was.read), read: Math.max(was.read, total) }
}

// Growth seen as a request ends is that request's. Overlapping requests may read the total out of order; a reading
// below the last one adds nothing, so no cent counts twice. `agent` null is a loop no agent list names; `model` is the
// one that answered, when the response said.
export function costAtEnd(
  spend: Spend | null,
  total: number,
  agent: { id: string; label: string } | null,
  tokens: number,
  model?: string,
): Spend {
  const was = spend ?? startSpend(total)
  const growth = Math.max(0, total - was.read)
  const read = Math.max(was.read, total)

  if (agent === null) {
    return { ...was, other: was.other + growth, read }
  }
  const withModel = (models: string[]) => (model === undefined || models.includes(model) ? models : [...models, model])
  const known = was.agents.some(one => one.id === agent.id)
  const agents: AgentSpend[] = known
    ? was.agents.map(one =>
        one.id === agent.id ? { ...one, usd: one.usd + growth, tokens: one.tokens + tokens, models: withModel(one.models) } : one,
      )
    : [...was.agents, { id: agent.id, label: agent.label, usd: growth, tokens, models: withModel([]) }]

  return { ...was, agents, read }
}

// `folded`: the rows a `N more` row stands for.
export type SpendGroup = { key: string; label: string; usd: number; tokens: number | null; models: string[]; color: string; folded?: SpendGroup[] }

// The rows besides main and the earlier cost; the rest fold into one.
const MAX_ROWS = 4

// Main first, then the subagents and Claude Code's own requests by cost, and the cost from before the mod counted
// last. A task's runs on the same models share a row (`list files ×2`), past MAX_ROWS the cheapest fold into one, and
// what cost nothing is left out, main aside.
export function spendGroups(spend: Spend): SpendGroup[] {
  const tasks = new Map<string, SpendGroup & { runs: number }>()

  for (const one of spend.agents.filter(agent => agent.id !== MAIN)) {
    const task = `${one.label}\n${one.models.join(',')}`
    const was = tasks.get(task)
    const color = AGENT_COLORS[tasks.size % AGENT_COLORS.length] ?? MAIN_COLOR
    tasks.set(
      task,
      was
        ? { ...was, usd: was.usd + one.usd, tokens: (was.tokens ?? 0) + one.tokens, runs: was.runs + 1 }
        : { key: one.id, label: one.label, usd: one.usd, tokens: one.tokens, models: one.models, color, runs: 1 },
    )
  }
  const main = spend.agents
    .filter(one => one.id === MAIN)
    .map(one => ({ key: MAIN, label: one.label, usd: one.usd, tokens: one.tokens, models: one.models, color: MAIN_COLOR }))
  const rest = [
    ...[...tasks.values()].map(({ runs, ...task }) => ({ ...task, label: runs > 1 ? `${task.label} ×${runs}` : task.label })),
    { key: 'other', label: 'claude code', usd: spend.other, tokens: null, models: [], color: 'inactive' },
  ]
    .filter(group => group.usd > 0)
    .sort((a, b) => b.usd - a.usd)
  const folded = rest.slice(MAX_ROWS)
  const more =
    folded.length < 2
      ? folded
      : [
          {
            key: 'more',
            label: `${folded.length} more`,
            usd: folded.reduce((sum, one) => sum + one.usd, 0),
            tokens: folded.reduce((sum, one) => sum + (one.tokens ?? 0), 0),
            // The folded rows may run on every model; each names its own once opened.
            models: [],
            color: 'inactive',
            folded,
          },
        ]
  const earlier = { key: 'earlier', label: 'earlier', usd: spend.earlier, tokens: null, models: [], color: 'inactive' }

  return [...main, ...rest.slice(0, MAX_ROWS), ...more, ...(earlier.usd > 0 ? [earlier] : [])]
}
