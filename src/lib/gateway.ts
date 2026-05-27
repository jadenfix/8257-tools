import { tools, walletProfiles } from '../data/tools'
import type {
  AccessRequirement,
  PredicateKind,
  ToolDefinition,
  ToolManifest,
  WalletProfile,
} from '../data/tools'

export type AccessRequirementResult = {
  requirement: AccessRequirement
  passed: boolean
  reason: string
  current: string
}

export type AccessCheck = {
  access: boolean
  tool: ToolDefinition
  wallet: WalletProfile
  passed: AccessRequirementResult[]
  failed: AccessRequirementResult[]
  unlockActions: string[]
  summary: string
}

export type DiscoverFilters = {
  query?: string
  category?: string
  trustTier?: ToolDefinition['trustTier'] | 'All'
  chain?: ToolDefinition['chain'] | 'All'
}

export type ManifestValidation = {
  valid: boolean
  score: number
  errors: string[]
  warnings: string[]
}

export type InvocationResult = {
  ok: boolean
  status: 'success' | 'access_denied' | 'tool_not_found'
  requestId: string
  latencyMs: number
  result?: Record<string, unknown>
  error?: {
    code: string
    message: string
    unlockActions?: string[]
  }
}

const unknownWallet = (address: string): WalletProfile => ({
  address,
  label: 'Unknown wallet',
  nftBalances: {},
  subscriptions: [],
  allowlists: [],
  usage: {},
  reputationScore: 0,
  attestations: [],
})

export const normalizeAddress = (address: string) => address.trim().toLowerCase()

export const getWalletProfile = (address: string): WalletProfile => {
  const normalized = normalizeAddress(address)

  return (
    walletProfiles.find((wallet) => normalizeAddress(wallet.address) === normalized) ??
    unknownWallet(address.trim())
  )
}

export const getTool = (toolIdOrSlug: string): ToolDefinition | undefined => {
  const lookup = toolIdOrSlug.trim().toLowerCase()

  return tools.find(
    (tool) =>
      tool.id.toLowerCase() === lookup ||
      tool.slug.toLowerCase() === lookup ||
      tool.name.toLowerCase() === lookup,
  )
}

export const discoverTools = ({
  query = '',
  category = 'All',
  trustTier = 'All',
  chain = 'All',
}: DiscoverFilters = {}) => {
  const normalizedQuery = query.trim().toLowerCase()

  return tools.filter((tool) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        tool.name,
        tool.slug,
        tool.description,
        tool.creator,
        tool.category,
        ...tool.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

    const matchesCategory = category === 'All' || tool.category === category
    const matchesTrust = trustTier === 'All' || tool.trustTier === trustTier
    const matchesChain = chain === 'All' || tool.chain === chain

    return matchesQuery && matchesCategory && matchesTrust && matchesChain
  })
}

const usageText = (used: number, cap: number, window: string) =>
  `${used.toLocaleString()} / ${cap.toLocaleString()} calls this ${window}`

const evaluateRequirement = (
  tool: ToolDefinition,
  wallet: WalletProfile,
  requirement: AccessRequirement,
): AccessRequirementResult => {
  const rule = requirement.rule

  switch (rule.kind) {
    case 'subscription': {
      const passed = wallet.subscriptions.includes(rule.plan)
      return {
        requirement,
        passed,
        reason: passed
          ? `Active ${rule.plan} subscription found.`
          : `Wallet does not have the ${rule.plan} subscription.`,
        current: passed ? 'active' : 'missing',
      }
    }
    case 'nft': {
      const balance = wallet.nftBalances[rule.contract] ?? 0
      const passed = balance >= rule.minBalance
      return {
        requirement,
        passed,
        reason: passed
          ? `Wallet holds ${balance} ${rule.tokenStandard} token(s).`
          : `Wallet must hold ${rule.minBalance} token from ${rule.contract}.`,
        current: `${balance} held`,
      }
    }
    case 'allowlist': {
      const passed = wallet.allowlists.includes(rule.listId)
      return {
        requirement,
        passed,
        reason: passed
          ? `Wallet is present on ${rule.listId}.`
          : `Wallet is not present on ${rule.listId}.`,
        current: passed ? 'allowlisted' : 'not allowlisted',
      }
    }
    case 'usage-cap': {
      const used = wallet.usage[tool.id] ?? 0
      const passed = used < rule.cap
      return {
        requirement,
        passed,
        reason: passed
          ? `${(rule.cap - used).toLocaleString()} calls remaining.`
          : `Wallet exceeded the ${rule.cap.toLocaleString()} call cap.`,
        current: usageText(used, rule.cap, rule.window),
      }
    }
    case 'reputation': {
      const passed = wallet.reputationScore >= rule.minScore
      return {
        requirement,
        passed,
        reason: passed
          ? `Reputation score ${wallet.reputationScore} clears ${rule.minScore}.`
          : `Reputation score ${wallet.reputationScore} is below ${rule.minScore}.`,
        current: `${wallet.reputationScore} reputation`,
      }
    }
    case 'attestation': {
      const passed = wallet.attestations.includes(rule.schema)
      return {
        requirement,
        passed,
        reason: passed
          ? `${rule.schema} attestation issued by ${rule.issuer}.`
          : `Missing ${rule.schema} attestation from ${rule.issuer}.`,
        current: passed ? 'attested' : 'missing',
      }
    }
    case 'composite': {
      const passed = rule.operator === 'AND'
      return {
        requirement,
        passed,
        reason: `Composite ${rule.operator} gate references ${rule.children.join(', ')}.`,
        current: passed ? 'composable' : 'requires simulation',
      }
    }
    default:
      return exhaustiveRequirement(rule)
  }
}

const exhaustiveRequirement = (rule: never): never => {
  throw new Error(`Unsupported requirement rule: ${JSON.stringify(rule)}`)
}

export const checkAccess = (toolIdOrSlug: string, walletAddress: string): AccessCheck => {
  const tool = getTool(toolIdOrSlug)

  if (!tool) {
    throw new Error(`Unknown ERC-8257 tool: ${toolIdOrSlug}`)
  }

  const wallet = getWalletProfile(walletAddress)
  const results = tool.access.map((requirement) => evaluateRequirement(tool, wallet, requirement))
  const passed = results.filter((result) => result.passed)
  const failed = results.filter((result) => !result.passed)
  const access = failed.length === 0

  return {
    access,
    tool,
    wallet,
    passed,
    failed,
    unlockActions: failed.map((result) => result.requirement.unlockAction),
    summary: access
      ? `${wallet.label} can invoke ${tool.name}.`
      : `${wallet.label} cannot invoke ${tool.name}: ${failed[0]?.reason ?? 'access denied'}`,
  }
}

export const validateManifest = (manifest: ToolManifest): ManifestValidation => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!manifest.name.trim()) {
    errors.push('Manifest name is required.')
  }

  if (!manifest.version.trim()) {
    errors.push('Semantic version is required.')
  }

  if (!manifest.description.trim()) {
    errors.push('Description is required.')
  }

  if (!manifest.invoke.url.startsWith('https://')) {
    errors.push('Invocation URL must use HTTPS.')
  }

  if (Object.keys(manifest.inputSchema).length === 0) {
    warnings.push('Input schema is empty, which makes agent planning unreliable.')
  }

  if (Object.keys(manifest.outputSchema).length === 0) {
    warnings.push('Output schema is empty, which makes response normalization unreliable.')
  }

  if (manifest.invoke.auth === 'api-key') {
    warnings.push('API-key auth works, but SIWE or agent-wallet auth is preferred for ERC-8257 tools.')
  }

  const score = Math.max(0, 100 - errors.length * 30 - warnings.length * 10)

  return {
    valid: errors.length === 0,
    score,
    errors,
    warnings,
  }
}

export const getAccessRequirements = (toolIdOrSlug: string) => {
  const tool = getTool(toolIdOrSlug)

  if (!tool) {
    return []
  }

  return tool.access
}

const stableRequestId = (tool: ToolDefinition, walletAddress: string) => {
  const input = `${tool.id}:${normalizeAddress(walletAddress)}:${tool.calls24h}`
  let hash = 0

  for (const char of input) {
    hash = (hash << 5) - hash + char.charCodeAt(0)
    hash |= 0
  }

  return `gw_${Math.abs(hash).toString(16).padStart(8, '0')}`
}

export const invokeTool = ({
  toolId,
  wallet,
  input,
}: {
  toolId: string
  wallet: string
  input: Record<string, unknown>
}): InvocationResult => {
  const tool = getTool(toolId)

  if (!tool) {
    return {
      ok: false,
      status: 'tool_not_found',
      requestId: 'gw_missing_tool',
      latencyMs: 0,
      error: {
        code: 'TOOL_NOT_FOUND',
        message: `No indexed ERC-8257 tool matches ${toolId}.`,
      },
    }
  }

  const access = checkAccess(tool.id, wallet)
  const latencyMs = tool.avgLatencyMs + access.failed.length * 37
  const requestId = stableRequestId(tool, wallet)

  if (!access.access) {
    return {
      ok: false,
      status: 'access_denied',
      requestId,
      latencyMs,
      error: {
        code: 'ACCESS_DENIED',
        message: access.summary,
        unlockActions: access.unlockActions,
      },
    }
  }

  return {
    ok: true,
    status: 'success',
    requestId,
    latencyMs,
    result: {
      tool: tool.slug,
      normalized: true,
      wallet: normalizeAddress(wallet),
      input,
      trustTier: tool.trustTier,
      observedUptime: tool.uptime,
      gateway: {
        retries: 0,
        signedRequest: true,
        predicateChecks: access.passed.length,
      },
    },
  }
}

export const categories = ['All', ...Array.from(new Set(tools.map((tool) => tool.category)))]

export const chains = ['All', ...Array.from(new Set(tools.map((tool) => tool.chain)))]

export const trustTiers: Array<ToolDefinition['trustTier'] | 'All'> = [
  'All',
  'Core',
  'Verified',
  'Experimental',
]

export const predicateKinds: PredicateKind[] = [
  'subscription',
  'nft',
  'allowlist',
  'usage-cap',
  'reputation',
  'attestation',
  'composite',
]

export const dashboardMetrics = {
  indexedTools: tools.length,
  uptimeAverage:
    Math.round((tools.reduce((sum, tool) => sum + tool.uptime, 0) / tools.length) * 100) / 100,
  invocations24h: tools.reduce((sum, tool) => sum + tool.calls24h, 0),
  failures24h: tools.reduce((sum, tool) => sum + tool.failures24h, 0),
  revenue30d: tools.reduce((sum, tool) => sum + tool.revenue30d, 0),
}
