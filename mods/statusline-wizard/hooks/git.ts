import type { Git, PullRequest } from '../types'

// What `git status --porcelain=v2 --branch` says of the working copy; null for output that is not a status.
export function parseStatus(output: string): Git | null {
  const lines = output.split('\n').filter(Boolean)
  const header = (name: string) => lines.find(one => one.startsWith(`# branch.${name} `))?.slice(`# branch.${name} `.length)
  const head = header('head')
  if (head === undefined) {
    return null
  }
  const oid = header('oid')
  const branch = head === '(detached)' && oid !== undefined ? oid.slice(0, 7) : head
  const ahead = Number(/^\+(\d+)/.exec(header('ab') ?? '')?.[1] ?? 0)

  return { branch, ahead, isDirty: lines.some(one => !one.startsWith('#')) }
}

// `owner/name` from the origin remote's URL, in its scp, https or ssh form; null for a local path or none.
export function repoName(remote: string | null): string | null {
  if (remote === null) {
    return null
  }
  const match = /^(?:[a-z+]+:\/\/[^/]+\/|[^@/:]+@[^:/]+:)(.+?)(?:\.git)?\/?$/.exec(remote)
  const parts = match?.[1]?.split('/') ?? []

  return parts.length >= 2 ? parts.slice(-2).join('/') : null
}

const REVIEWS: Record<string, PullRequest['review']> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes requested',
  REVIEW_REQUIRED: 'review required',
}

// The branch's open pull request from `gh pr view --json number,state,isDraft,reviewDecision`; null for any other.
export function parsePullRequest(output: string): PullRequest | null {
  let pr: { number?: unknown; state?: unknown; isDraft?: unknown; reviewDecision?: unknown }
  try {
    pr = JSON.parse(output)
  } catch {
    return null
  }
  if (typeof pr.number !== 'number' || pr.state !== 'OPEN') {
    return null
  }

  return { number: pr.number, review: pr.isDraft === true ? 'draft' : (REVIEWS[String(pr.reviewDecision)] ?? null) }
}
