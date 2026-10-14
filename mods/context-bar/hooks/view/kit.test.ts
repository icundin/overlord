import { expect, test } from 'claude-code/testing'

import { DEFAULT_SETTINGS } from '../defaults'
import { filled } from './kit'
import type { View } from './kit'

const styled = (barStyle: 'shaded' | 'solid') => ({ view: { settings: { ...DEFAULT_SETTINGS, barStyle } } as View, shadeBehind: 'black' as const })

// The test kit cannot hover, so what a hover changes is checked here.
test('fills a shaded segment with its color on hover, and lightens a solid one', async () => {
  expect(filled(styled('shaded'), '#6A9BCC')).toEqual({
    glyph: '▓',
    style: { color: '#6A9BCC', backgroundColor: 'black' },
    hover: { backgroundColor: '#6A9BCC' },
  })
  expect(filled(styled('solid'), '#6A9BCC')).toEqual({ glyph: '█', style: { color: '#6A9BCC' }, hover: { color: '#9EBEDE' } })
  expect(filled(styled('solid'), 'inactive').hover).toEqual({ dimColor: true })
})
