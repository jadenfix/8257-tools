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
