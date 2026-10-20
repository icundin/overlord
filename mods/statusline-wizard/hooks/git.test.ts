import { expect, test } from 'claude-code/testing'

import { parsePullRequest, parseStatus, repoName } from './git'

const CLEAN = { ahead: 0, behind: 0, isDirty: false, staged: 0, modified: 0, untracked: 0 }

test('reads the branch, the commits ahead and the changes from porcelain v2', async () => {
  const status = ['# branch.oid 70c9af3e', '# branch.head main', '# branch.upstream origin/main', '# branch.ab +2 -1', '1 .M N... 100644 100644 100644 a b CHANGELOG.md', ''].join('\n')
  expect(parseStatus(status)).toEqual({ branch: 'main', ahead: 2, behind: 1, isDirty: true, staged: 0, modified: 1, untracked: 0 })
})

test('reads a clean branch with no upstream', async () => {
  expect(parseStatus('# branch.oid 70c9af3e\n# branch.head feat/x\n')).toEqual({ branch: 'feat/x', ...CLEAN })
})

test('names a detached head by its short commit', async () => {
  expect(parseStatus('# branch.oid 70c9af3e1234\n# branch.head (detached)\n')).toEqual({ branch: '70c9af3', ...CLEAN })
})

test('counts the files staged, modified and untracked, a file changed on both sides in both', async () => {
  const status = [
    '# branch.head main',
    '1 M. N... 100644 100644 100644 a b staged.ts',
    '1 .M N... 100644 100644 100644 a b modified.ts',
    '1 MM N... 100644 100644 100644 a b both.ts',
    '2 R. N... 100644 100644 100644 a b R100 new.ts\told.ts',
    'u UU N... 100644 100644 100644 100644 a b c conflict.ts',
    '? notes.txt',
    '? draft.md',
  ].join('\n')
  expect(parseStatus(status)).toMatchObject({ isDirty: true, staged: 3, modified: 3, untracked: 2 })
})

test('counts an untracked file as a change', async () => {
  expect(parseStatus('# branch.head main\n? notes.txt\n')?.isDirty).toBe(true)
})

test('reads a repository with no commit yet', async () => {
  expect(parseStatus('# branch.oid (initial)\n# branch.head main\n')).toEqual({ branch: 'main', ...CLEAN })
})

test('reads nothing from output that is not a status', async () => {
  expect(parseStatus('')).toBeNull()
})

test('names the repository from its remote, in every form git writes', async () => {
  const remotes = [
    'git@github.com:icundin/overlord.git',
    'https://github.com/icundin/overlord.git',
    'https://github.com/icundin/overlord',
    'ssh://git@bitbucket.org/icundin/overlord.git',
    'https://inigo@bitbucket.org/icundin/overlord.git/',
  ]
  for (const remote of remotes) {
    expect(repoName(remote)).toBe('icundin/overlord')
  }
  expect(repoName(null)).toBeNull()
  expect(repoName('/srv/git/overlord.git')).toBeNull()
})

test('reads the open pull request and its review', async () => {
  const pr = (fields: object) => JSON.stringify({ number: 26, state: 'OPEN', isDraft: false, reviewDecision: '', ...fields })
  expect(parsePullRequest(pr({ reviewDecision: 'APPROVED' }))).toEqual({ number: 26, review: 'approved' })
  expect(parsePullRequest(pr({ reviewDecision: 'CHANGES_REQUESTED' }))).toEqual({ number: 26, review: 'changes requested' })
  expect(parsePullRequest(pr({ reviewDecision: 'REVIEW_REQUIRED' }))).toEqual({ number: 26, review: 'review required' })
  expect(parsePullRequest(pr({ isDraft: true, reviewDecision: 'APPROVED' }))).toEqual({ number: 26, review: 'draft' })
  expect(parsePullRequest(pr({}))).toEqual({ number: 26, review: null })
})

test('reads no pull request once it is merged or closed, or from what is not one', async () => {
  expect(parsePullRequest(JSON.stringify({ number: 26, state: 'MERGED', isDraft: false, reviewDecision: 'APPROVED' }))).toBeNull()
  expect(parsePullRequest('no pull requests found for branch "main"')).toBeNull()
})
