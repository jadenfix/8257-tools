import { describe, expect, it } from 'vitest'
import { tools, walletProfiles } from '../data/tools'
import { checkAccess, discoverTools, invokeTool, validateManifest } from './gateway'

describe('gateway discovery', () => {
  it('filters indexed tools by intent query', () => {
    const results = discoverTools({ query: 'slippage' })

    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe('liquidity-sentinel')
  })

  it('filters by chain and trust tier together', () => {
    const results = discoverTools({ chain: 'Base Sepolia', trustTier: 'Experimental' })

    expect(results.map((tool) => tool.slug)).toEqual(['x402-invoice-helper'])
  })
})

describe('access debugger', () => {
  it('explains failed subscription access with an unlock action', () => {
    const access = checkAccess('wallet-risk-scanner', walletProfiles[2].address)

    expect(access.access).toBe(false)
    expect(access.failed[0].reason).toContain('does not have')
    expect(access.unlockActions).toContain('Subscribe to Risk Pro for $49/month.')
  })

  it('allows a wallet that satisfies every predicate', () => {
    const access = checkAccess('wallet-risk-scanner', walletProfiles[0].address)

    expect(access.access).toBe(true)
    expect(access.failed).toHaveLength(0)
    expect(access.passed).toHaveLength(2)
  })
})

describe('manifest validation', () => {
  it('accepts a known indexed manifest', () => {
    const validation = validateManifest(tools[0].manifest)

    expect(validation.valid).toBe(true)
    expect(validation.score).toBeGreaterThanOrEqual(90)
  })

  it('blocks non-HTTPS invoke URLs', () => {
    const validation = validateManifest({
      ...tools[0].manifest,
      invoke: {
        ...tools[0].manifest.invoke,
        url: 'http://localhost:8787/invoke',
      },
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Invocation URL must use HTTPS.')
  })
})

describe('invocation proxy simulation', () => {
  it('normalizes a successful invocation', () => {
    const result = invokeTool({
      toolId: 'wallet-risk-scanner',
      wallet: walletProfiles[0].address,
      input: { chain: 'base', address: '0xabc' },
    })

    expect(result.ok).toBe(true)
    expect(result.status).toBe('success')
    expect(result.result).toMatchObject({
      tool: 'wallet-risk-scanner',
      normalized: true,
    })
  })

  it('returns unlock actions when access is denied', () => {
    const result = invokeTool({
      toolId: 'wallet-risk-scanner',
      wallet: walletProfiles[2].address,
      input: { chain: 'base', address: '0xabc' },
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe('access_denied')
    expect(result.error?.unlockActions).toContain('Subscribe to Risk Pro for $49/month.')
  })
})


describe('composite authorization', () => {
  it('evaluates OR and AND against actual wallet predicates, and fails closed on missing children', () => {
    const fixture = { ...tools[0], id: 'composite-test', slug: 'composite-test', access: [
      { ...tools[0].access[0], id: 'subscription', rule: { kind: 'subscription' as const, contract: 'test', plan: 'absent', priceUsd: 0, period: 'month' as const } },
      { ...tools[0].access[0], id: 'allowlist', rule: { kind: 'allowlist' as const, listId: 'dao-approved-tools' } },
      { ...tools[0].access[0], id: 'gate', rule: { kind: 'composite' as const, operator: 'OR' as 'OR' | 'AND', children: ['subscription', 'allowlist'] as Array<'subscription' | 'allowlist' | 'nft'> } },
    ] }
    tools.push(fixture)
    try {
      expect(checkAccess('composite-test', walletProfiles[0].address).access).toBe(true)
      expect(checkAccess('composite-test', walletProfiles[2].address).access).toBe(false)
      const gate = fixture.access[2].rule
      if (gate.kind !== 'composite') throw new Error('Expected composite')
      gate.operator = 'AND'
      expect(checkAccess('composite-test', walletProfiles[0].address).access).toBe(false)
      gate.operator = 'OR'
      gate.children = ['nft']
      expect(checkAccess('composite-test', walletProfiles[0].address).access).toBe(false)
      gate.children = []
      expect(checkAccess('composite-test', walletProfiles[0].address).access).toBe(false)
    } finally { tools.pop() }
  })

  it('rejects invalid endpoint and semantic version drafts', () => {
    expect(validateManifest({ ...tools[0].manifest, version: 'latest' }).valid).toBe(false)
    expect(validateManifest({ ...tools[0].manifest, invoke: { ...tools[0].manifest.invoke, url: 'https://' } }).valid).toBe(false)
  })

  it('does not claim that simulated calls are cryptographically signed', () => {
    expect(invokeTool({ toolId: tools[0].id, wallet: walletProfiles[0].address, input: {} }).result?.gateway).toMatchObject({ simulated: true, signedRequest: false })
  })
})
