import { bySource } from '../figures'
import { compact, share } from '../format'
import { grid, ordered, shortPaths } from '../layout'
import { parts, swatchOf } from './kit'
import type { Kit } from './kit'

// The categories, then the MCP tools by server, the memory files and the skills by source, and /context.
export function breakdownCard(kit: Kit) {
  const { Box, Text } = kit.ui
  const { section, chip, tip } = parts(kit)
  const current = kit.view.usage
  const isAutoCompact = current.autoCompactThreshold !== null
  const entries = ordered(current.rows)
    .filter(row => row.tokens > 0)
    .map(row => ({
      row,
      name: row.name.toLowerCase(),
      tokens: compact(row.tokens),
      // Deferred tool schemas sit outside the window, so they take no share of it.
      share: row.kind === 'deferred' ? '—' : share(row.tokens, current.maxTokens),
    }))
  const nameWidth = Math.max(0, ...entries.map(entry => entry.name.length))
  const tokensWidth = Math.max(0, ...entries.map(entry => entry.tokens.length))
  const shareWidth = Math.max(0, ...entries.map(entry => entry.share.length))
  // "■ " + name + " " + tokens + " " + share
  const entryWidth = 2 + nameWidth + 1 + tokensWidth + 1 + shareWidth
  const GAP = 3
  // A section body's indent.
  const width = kit.card - 2
  const servers = current.mcpServers
  const files = current.memoryFiles
  const fileNames = shortPaths(files.map(file => file.path))
  const skillSources = bySource(current.skills)
  const lists = [
    servers.length > 0 && {
      key: 'mcp' as const,
      title: 'mcp tools',
      tokens: servers.reduce((sum, one) => sum + one.tokens, 0),
      count: servers.reduce((sum, one) => sum + one.tools, 0),
      items: servers.map(one => ({ key: one.server, name: one.server, detail: `${one.tools} tools`, tokens: one.tokens })),
    },
    files.length > 0 && {
      key: 'memory' as const,
      title: 'memory files',
      tokens: files.reduce((sum, one) => sum + one.tokens, 0),
      count: files.length,
      items: files.map((one, i) => ({
        key: one.path,
        name: fileNames[i] ?? one.path,
        detail: one.type ? `· ${one.type.toLowerCase()}` : '',
        tokens: one.tokens,
      })),
    },
    // By source, as MCP tools go by server: one row per source, the full list being /skills' to show.
    skillSources.length > 0 && {
      key: 'skills' as const,
      title: 'skills',
      tokens: skillSources.reduce((sum, one) => sum + one.tokens, 0),
      count: skillSources.reduce((sum, one) => sum + one.skills, 0),
      items: skillSources.map(one => ({
        key: one.source,
        name: one.source,
        detail: `${one.skills} skill${one.skills === 1 ? '' : 's'}`,
        tokens: one.tokens,
      })),
    },
  ].filter(list => list !== false)

  return (
    <Box key="legend" flexDirection="column" rowGap={1}>
      {section('categories', 'categories', [compact(current.totalTokens), `${current.percentage}%`], () =>
        grid(entries, entryWidth, GAP, width).map((line, row) => (
          <Box key={`row-${row}`} columnGap={GAP}>
            {line.map(entry => (
              <Text key={entry.row.name}>
                <Text color={swatchOf(entry.row, isAutoCompact)}>■</Text> {entry.name.padEnd(nameWidth)}{' '}
                <Text bold={entry.row.kind !== 'deferred'} dimColor={entry.row.kind === 'deferred'}>
                  {entry.tokens.padStart(tokensWidth)}
                </Text>{' '}
                <Text dimColor>{entry.share.padStart(shareWidth)}</Text>
              </Text>
            ))}
          </Box>
        )),
      )}
      {lists.map(list => {
        const itemWidth = Math.max(0, ...list.items.map(item => item.name.length + item.detail.length + 1))

        return section(list.key, list.title, [compact(list.tokens), String(list.count)], () =>
          list.items.map(item => (
            <Text key={item.key}>
              {item.name}
              <Text dimColor>{item.detail ? ` ${item.detail}` : ''}</Text>
              {' '.repeat(itemWidth - item.name.length - (item.detail ? item.detail.length + 1 : 0))}{'  '}
              <Text bold>{compact(item.tokens).padStart(6)}</Text>
            </Text>
          )),
        )
      })}
      <Box key="actions" flexDirection="column">
        {tip('Runs /context: every tool, file and skill with its tokens, printed in the conversation above.')}
        <Box key="buttons">{chip('context', 'see detailed breakdown', kit.act.showContext)}</Box>
      </Box>
    </Box>
  )
}
