import type { BarSettings, Section } from '../../types'
import { ordered } from '../layout'
import { parseAmount, parseColor, parsePercent } from '../parse'
import { CATEGORY_THEMES } from '../themes'
import type { ThemeName } from '../themes'
import { cycle, parts } from './kit'
import type { Kit } from './kit'

const DISPLAY_MODES = ['auto', 'dark', 'light'] as const
const THEME_CHOICES = ['default', ...(Object.keys(CATEGORY_THEMES) as ThemeName[]), 'custom'] as const

// One row per setting, the label and its value, in collapsible groups; a click moves a value on, a field takes what is
// typed.
export function settingsCard(kit: Kit) {
  const { Box, Button, Input, Text } = kit.ui
  const { section, chip } = parts(kit)
  const { view, act } = kit
  const current = view.settings
  const categories = ordered(view.usage.rows).filter(row => row.kind === 'used')
  // A row's value is a button that moves on when clicked, or a field that takes what is typed (`input`).
  type Row = {
    key: string
    label: string
    value: string
    swatch?: string
    change?: () => unknown
    input?: { placeholder: string; submit: (text: string) => unknown }
  }
  // Every save confirms itself: a value equal to the saved one changes nothing else on screen.
  const save = (change: Partial<BarSettings>, message: string) => {
    act.changeSetting(change)
    act.notify(message)
  }
  const percentField = (key: 'contextWarnPercent' | 'limitWarnPercent', what: string) => ({
    placeholder: '0–100, 0 is off',
    submit: (text: string) => {
      const value = parsePercent(text)

      return value === null
        ? act.notify('Type a whole number from 0 to 100; 0 turns the warning off.')
        : save({ [key]: value }, value === 0 ? `${what} warning turned off` : `${what} warning set to ${value}%`)
    },
  })
  const groups: { key: Section; heading: string; rows: Row[] }[] = [
    {
      key: 'general',
      heading: 'general',
      rows: [
        {
          key: 'showOnStart',
          label: 'Show the bar when a session starts',
          value: String(current.showOnStart),
          change: () => act.changeSetting({ showOnStart: !current.showOnStart }),
        },
      ],
    },
    {
      key: 'warnings',
      heading: 'warnings',
      rows: [
        {
          key: 'contextWarnPercent',
          label: 'When the context passes (%)',
          value: String(current.contextWarnPercent),
          input: percentField('contextWarnPercent', 'Context'),
        },
        {
          key: 'limitWarnPercent',
          label: 'When a plan limit passes (%)',
          value: String(current.limitWarnPercent),
          input: percentField('limitWarnPercent', 'Plan limit'),
        },
        {
          key: 'costWarnUsd',
          label: 'When the session cost passes ($)',
          value: String(current.costWarnUsd),
          input: {
            placeholder: 'dollars, 0 is off',
            submit: (text: string) => {
              const value = parseAmount(text)

              return value === null
                ? act.notify('Type an amount in dollars, like 50 or 12.50; 0 turns the warning off.')
                : save({ costWarnUsd: value }, value === 0 ? 'Cost warning turned off' : `Cost warning set to $${value}`)
            },
          },
        },
      ],
    },
    {
      key: 'appearance',
      heading: 'appearance',
      rows: [
        {
          key: 'displayMode',
          label: 'Display mode',
          value: `${current.displayMode} ›`,
          change: () => act.changeSetting({ displayMode: cycle(DISPLAY_MODES, current.displayMode) }),
        },
        {
          key: 'categoryTheme',
          label: 'Category theme',
          value: `${current.categoryTheme.replace('-', ' ')} ›`,
          change: () => act.changeSetting({ categoryTheme: cycle(THEME_CHOICES, current.categoryTheme) }),
        },
        // With the custom theme, one row per category, its color shown beside its name.
        ...(current.categoryTheme === 'custom' ? categories : []).map(row => {
          // The color the category has without a custom one: the default theme's.
          const fallback = view.defaultColors[row.name] ?? row.color

          return {
            key: `color-${row.name}`,
            label: `  ${row.name.toLowerCase()}`,
            // A theme key (a category the default theme does not know) has no hex to show.
            value: row.color.startsWith('#') ? row.color : '',
            swatch: row.color,
            input: {
              placeholder: '#RRGGBB',
              submit: (text: string) => {
                if (text.trim() === '') {
                  const { [row.name]: _, ...rest } = current.customColors

                  return save({ customColors: rest }, `${row.name} back to its default color (${fallback})`)
                }
                const color = parseColor(text)

                return color === null
                  ? act.notify('Type a hex color, like #FF6188 or #F68; an empty field goes back to the default.')
                  : save({ customColors: { ...current.customColors, [row.name]: color } }, `${row.name} set to ${color}`)
              },
            },
          }
        }),
      ],
    },
  ]
  // The swatch takes two cells ("■ ") ahead of a category's label.
  const labelWidth = Math.max(0, ...groups.flatMap(group => group.rows.map(row => row.label.length + (row.swatch ? 2 : 0))))

  return (
    <Box key="settings" flexDirection="column" rowGap={1}>
      {groups.map(group =>
        // The same collapsible sections as the other cards, open by default; the header is the name alone.
        section(group.key, group.heading, [], () =>
          group.rows.map(row => (
            <Box key={row.key} columnGap={4}>
              <Text>
                {row.swatch ? (
                  <Text>
                    {row.label.slice(0, 2)}
                    <Text color={row.swatch}>■</Text> {row.label.slice(2).padEnd(labelWidth - 4)}
                  </Text>
                ) : (
                  row.label.padEnd(labelWidth)
                )}
              </Text>
              {row.input ? (
                // A field empties on Enter and keeps what it shows until it is drawn anew; a key that changes with
                // every Enter draws it afresh, holding the saved value.
                <Input
                  key={`input-${row.key}-${view.fieldRevision}`}
                  value={row.value}
                  placeholder={row.input.placeholder}
                  submitLabel="save"
                  onSubmit={text => {
                    row.input?.submit(text)
                    act.submitted()
                  }}
                />
              ) : (
                <Button key={`setting-${row.key}`} plain label={row.value} onPress={() => row.change?.()}>
                  <Text color="inactive">{row.value}</Text>
                </Button>
              )}
            </Box>
          )),
        ),
      )}
      <Box key="actions" flexDirection="column">
        <Box key="buttons">
          {chip(
            'reset',
            view.confirming === 'reset' ? 'confirm reset to defaults' : 'reset to defaults',
            act.resetSettings,
            view.confirming === 'reset',
          )}
        </Box>
      </Box>
    </Box>
  )
}
