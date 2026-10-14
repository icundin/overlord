// Figures derived from the session's usage: token sums, groupings, projections and warnings.

import type { McpServer, Skill, Tokens } from '../types'
import { amount, dollars, limitLabel } from './format'

export function totalTokens(tokens: Tokens): number {
  return tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite
}

export function sumTokens(all: Tokens[]): Tokens {
  return all.reduce(
    (sum, one) => ({
      input: sum.input + one.input,
      output: sum.output + one.output,
      cacheRead: sum.cacheRead + one.cacheRead,
      cacheWrite: sum.cacheWrite + one.cacheWrite,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  )
}

// The share of the input side read from the cache, as a whole percentage; null before any input.
export function cacheHit(tokens: Tokens): number | null {
  const input = tokens.input + tokens.cacheRead + tokens.cacheWrite

  return input === 0 ? null : Math.round((tokens.cacheRead / input) * 100)
}

export function byServer(tools: { serverName: string; tokens: number }[]): McpServer[] {
  const servers = new Map<string, McpServer>()

  for (const tool of tools) {
    const server = servers.get(tool.serverName) ?? { server: tool.serverName, tools: 0, tokens: 0 }
    servers.set(tool.serverName, { ...server, tools: server.tools + 1, tokens: server.tokens + tool.tokens })
  }

  return [...servers.values()].sort((a, b) => b.tokens - a.tokens)
}

// The engine's words for a skill's source, lowercased, as /context shows them.
const SKILL_SOURCES: Record<string, string> = { syncedskills: 'claude.ai sync', usersettings: 'user', projectsettings: 'project' }

// The skills by where they come from, heaviest first: a plugin's by its name, the rest by their source.
export function bySource(skills: Skill[]): { source: string; skills: number; tokens: number }[] {
  const sources = new Map<string, { source: string; skills: number; tokens: number }>()

  for (const skill of skills) {
    const source = skill.pluginName ?? SKILL_SOURCES[skill.source.toLowerCase()] ?? skill.source.toLowerCase()
    const was = sources.get(source) ?? { source, skills: 0, tokens: 0 }
    sources.set(source, { ...was, skills: was.skills + 1, tokens: was.tokens + skill.tokens })
  }

  return [...sources.values()].sort((a, b) => b.tokens - a.tokens)
}

// How many turns at the recent pace until the context reaches `target` tokens: the average of the last turns that
// grew it (a compaction's drop is left out), or null when it is not growing or is already there.
export function turnsUntil(target: number, total: number, deltas: number[]): number | null {
  const growing = deltas.filter(delta => delta > 0)
  const pace = growing.reduce((sum, delta) => sum + delta, 0) / Math.max(1, growing.length)

  return pace > 0 && target > total ? Math.ceil((target - total) / pace) : null
}

// The thresholds the figures stand past now, as the band's warning line says them. A threshold of 0 is off.
export function alerts(
  reading: { contextPercent: number; limits: { kind: string; percentUsed: number }[]; cost: number | null },
  thresholds: { context: number; limit: number; cost: number },
): string[] {
  const out: string[] = []

  if (thresholds.cost > 0 && reading.cost !== null && reading.cost >= thresholds.cost) {
    out.push(`Session cost ${dollars(reading.cost)}, past your ${amount(thresholds.cost)}`)
  }
  if (thresholds.context > 0 && reading.contextPercent >= thresholds.context) {
    out.push(`Context at ${reading.contextPercent}%: consider /compact`)
  }
  for (const limit of reading.limits) {
    if (thresholds.limit > 0 && limit.percentUsed >= thresholds.limit) {
      const label = limitLabel(limit.kind)
      out.push(`${label.charAt(0).toUpperCase()}${label.slice(1)} limit at ${limit.percentUsed}%`)
    }
  }

  return out
}
