export type PredicateKind =
  | 'subscription'
  | 'nft'
  | 'allowlist'
  | 'usage-cap'
  | 'reputation'
  | 'attestation'
  | 'composite'

export type VerificationStatus = 'verified' | 'monitoring' | 'needs-review'

export type TrustTier = 'Core' | 'Verified' | 'Experimental'

export type RequirementRule =
  | {
      kind: 'subscription'
      contract: string
      plan: string
      priceUsd: number
      period: 'month' | 'call'
    }
  | {
      kind: 'nft'
      contract: string
      minBalance: number
      tokenStandard: 'ERC-721' | 'ERC-1155'
    }
  | {
      kind: 'allowlist'
      listId: string
    }
  | {
      kind: 'usage-cap'
      cap: number
      window: 'day' | 'month'
    }
  | {
      kind: 'reputation'
      minScore: number
      issuer: string
    }
  | {
      kind: 'attestation'
      schema: string
      issuer: string
    }
  | {
      kind: 'composite'
      operator: 'AND' | 'OR'
      children: PredicateKind[]
    }

export type AccessRequirement = {
  id: string
  predicate: string
  label: string
  description: string
  rule: RequirementRule
  unlockAction: string
}

export type ToolManifest = {
  name: string
  version: string
  description: string
  inputSchema: Record<string, string>
  outputSchema: Record<string, string>
  invoke: {
    method: 'POST'
    url: string
    auth: 'siwe' | 'agent-wallet' | 'api-key'
  }
}

export type ToolDefinition = {
  id: string
  slug: string
  name: string
  category: string
  description: string
  creator: string
  chain: 'Base' | 'Base Sepolia'
  endpoint: string
  manifestUri: string
  manifestHash: string
  version: string
  verificationStatus: VerificationStatus
  trustTier: TrustTier
  pricing: string
  access: AccessRequirement[]
  uptime: number
  lastSuccessfulInvocation: string
  calls24h: number
  failures24h: number
  avgLatencyMs: number
  revenue30d: number
  tags: string[]
  manifest: ToolManifest
}

export type WalletProfile = {
  address: string
  label: string
  nftBalances: Record<string, number>
  subscriptions: string[]
  allowlists: string[]
  usage: Record<string, number>
  reputationScore: number
  attestations: string[]
}

export const walletProfiles: WalletProfile[] = [
  {
    address: '0x8257A11CE000000000000000000000000000000',
    label: 'Agent operator with paid access',
    nftBalances: {
      '0x71c7c0000000000000000000000000000008257': 2,
      '0x9a7e00000000000000000000000000000000feed': 1,
    },
    subscriptions: [
      'sub-risk-pro',
      'sub-liquidity-pro',
      'sub-creator-starter',
    ],
    allowlists: ['beta-risk', 'dao-approved-tools'],
    usage: {
      'tool-wallet-risk-scanner': 418,
      'tool-liquidity-sentinel': 92,
      'tool-agent-reputation': 38,
    },
    reputationScore: 93,
    attestations: ['kyc-lite', 'agent-builder'],
  },
  {
    address: '0x8257B0B00000000000000000000000000000000',
    label: 'Builder with allowlist access',
    nftBalances: {
      '0x9a7e00000000000000000000000000000000feed': 1,
    },
    subscriptions: ['sub-creator-starter'],
    allowlists: ['dao-approved-tools'],
    usage: {
      'tool-wallet-risk-scanner': 32,
      'tool-abi-fetcher': 811,
    },
    reputationScore: 71,
    attestations: ['agent-builder'],
  },
  {
    address: '0x8257C0LD0000000000000000000000000000000',
    label: 'Cold wallet with no unlocks',
    nftBalances: {},
    subscriptions: [],
    allowlists: [],
    usage: {
      'tool-wallet-risk-scanner': 0,
    },
    reputationScore: 18,
    attestations: [],
  },
]

export const tools: ToolDefinition[] = [
  {
    id: 'tool-wallet-risk-scanner',
    slug: 'wallet-risk-scanner',
    name: 'Wallet Risk Scanner',
    category: 'Wallet safety',
    description:
      'Scores wallet exposure across approvals, counterparties, sanctions lists, and suspicious contract interactions.',
    creator: '0xCreatorRiskLabs',
    chain: 'Base',
    endpoint: 'https://api.8257kit.dev/tools/wallet-risk/invoke',
    manifestUri: 'ipfs://bafy8257wallet-risk-manifest',
    manifestHash: '0x9cf8...f8257',
    version: '1.4.2',
    verificationStatus: 'verified',
    trustTier: 'Core',
    pricing: '$0.012 / call after 1,000 free calls',
    access: [
      {
        id: 'risk-subscription',
        predicate: 'SubscriptionPredicate',
        label: 'Risk Pro subscription',
        description: 'Wallet must hold an active monthly Risk Pro subscription.',
        rule: {
          kind: 'subscription',
          contract: '0x0000000000000000000000000000subriskpro',
          plan: 'sub-risk-pro',
          priceUsd: 49,
          period: 'month',
        },
        unlockAction: 'Subscribe to Risk Pro for $49/month.',
      },
      {
        id: 'risk-usage-cap',
        predicate: 'UsageCapPredicate',
        label: 'Monthly usage below 1,000 calls',
        description: 'Agent wallet has remaining quota in the current billing window.',
        rule: {
          kind: 'usage-cap',
          cap: 1000,
          window: 'month',
        },
        unlockAction: 'Upgrade quota or wait for the next monthly window.',
      },
    ],
    uptime: 99.97,
    lastSuccessfulInvocation: '4 minutes ago',
    calls24h: 18422,
    failures24h: 31,
    avgLatencyMs: 284,
    revenue30d: 18420,
    tags: ['risk', 'wallet', 'approvals', 'sanctions'],
    manifest: {
      name: 'Wallet Risk Scanner',
      version: '1.4.2',
      description: 'Onchain wallet risk score and reason codes.',
      inputSchema: {
        chain: 'string',
        address: 'evm-address',
      },
      outputSchema: {
        riskScore: 'number',
        reasons: 'string[]',
        recommendedAction: 'string',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/wallet-risk/invoke',
        auth: 'agent-wallet',
      },
    },
  },
  {
    id: 'tool-liquidity-sentinel',
    slug: 'liquidity-sentinel',
    name: 'Liquidity Sentinel',
    category: 'Trading',
    description:
      'Checks route depth, MEV exposure, slippage risk, and stale quote probability before an agent signs a swap.',
    creator: '0xMarketMesh',
    chain: 'Base',
    endpoint: 'https://api.8257kit.dev/tools/liquidity/invoke',
    manifestUri: 'ipfs://bafy8257liquidity-manifest',
    manifestHash: '0xae12...8257',
    version: '0.9.8',
    verificationStatus: 'monitoring',
    trustTier: 'Verified',
    pricing: '$0.018 / quote audit',
    access: [
      {
        id: 'liquidity-subscription',
        predicate: 'SubscriptionPredicate',
        label: 'Liquidity Pro subscription',
        description: 'Agent must have an active Liquidity Pro subscription.',
        rule: {
          kind: 'subscription',
          contract: '0x0000000000000000000000000000liquidity',
          plan: 'sub-liquidity-pro',
          priceUsd: 79,
          period: 'month',
        },
        unlockAction: 'Subscribe to Liquidity Pro for $79/month.',
      },
      {
        id: 'liquidity-reputation',
        predicate: 'ReputationPredicate',
        label: 'Agent reputation over 70',
        description: 'The invoking wallet must clear a minimum agent reputation score.',
        rule: {
          kind: 'reputation',
          minScore: 70,
          issuer: '0xReputationOracle',
        },
        unlockAction: 'Build reputation through verified agent attestations.',
      },
    ],
    uptime: 99.82,
    lastSuccessfulInvocation: '11 minutes ago',
    calls24h: 7391,
    failures24h: 46,
    avgLatencyMs: 391,
    revenue30d: 12990,
    tags: ['trading', 'slippage', 'liquidity', 'mev'],
    manifest: {
      name: 'Liquidity Sentinel',
      version: '0.9.8',
      description: 'Pre-trade route risk and liquidity analysis.',
      inputSchema: {
        chain: 'string',
        sellToken: 'evm-address',
        buyToken: 'evm-address',
        amount: 'string',
      },
      outputSchema: {
        slippageRisk: 'low|medium|high',
        routeDepthUsd: 'number',
        warnings: 'string[]',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/liquidity/invoke',
        auth: 'siwe',
      },
    },
  },
  {
    id: 'tool-nft-appraiser',
    slug: 'nft-appraiser',
    name: 'NFT Appraiser',
    category: 'NFTs',
    description:
      'Returns collection health, trait rarity, floor depth, and suggested liquidation bands for NFT collateral.',
    creator: '0xVaultLens',
    chain: 'Base',
    endpoint: 'https://api.8257kit.dev/tools/nft-appraiser/invoke',
    manifestUri: 'ipfs://bafy8257nft-appraiser-manifest',
    manifestHash: '0x2d41...8257',
    version: '2.1.0',
    verificationStatus: 'verified',
    trustTier: 'Verified',
    pricing: '$0.03 / appraisal',
    access: [
      {
        id: 'nft-builder-pass',
        predicate: 'ERC721Predicate',
        label: 'Builder Pass NFT',
        description: 'Wallet must hold at least one 8257 Builder Pass.',
        rule: {
          kind: 'nft',
          contract: '0x71c7c0000000000000000000000000000008257',
          minBalance: 1,
          tokenStandard: 'ERC-721',
        },
        unlockAction: 'Mint or transfer an 8257 Builder Pass.',
      },
    ],
    uptime: 99.49,
    lastSuccessfulInvocation: '22 minutes ago',
    calls24h: 2190,
    failures24h: 18,
    avgLatencyMs: 448,
    revenue30d: 6120,
    tags: ['nft', 'appraisal', 'rarity', 'collateral'],
    manifest: {
      name: 'NFT Appraiser',
      version: '2.1.0',
      description: 'NFT collection and token-level appraisal.',
      inputSchema: {
        collection: 'evm-address',
        tokenId: 'string',
      },
      outputSchema: {
        estimatedValueEth: 'number',
        confidence: 'number',
        liquidityBand: 'string',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/nft-appraiser/invoke',
        auth: 'agent-wallet',
      },
    },
  },
  {
    id: 'tool-agent-reputation',
    slug: 'agent-reputation-lookup',
    name: 'Agent Reputation Lookup',
    category: 'Identity',
    description:
      'Looks up agent identity, signed capability attestations, prior tool behavior, and dispute history.',
    creator: '0xIdentityWorks',
    chain: 'Base',
    endpoint: 'https://api.8257kit.dev/tools/agent-reputation/invoke',
    manifestUri: 'ipfs://bafy8257agent-reputation-manifest',
    manifestHash: '0x7d19...8257',
    version: '1.0.5',
    verificationStatus: 'verified',
    trustTier: 'Core',
    pricing: 'Free for verified builders',
    access: [
      {
        id: 'agent-attestation',
        predicate: 'AttestationPredicate',
        label: 'Agent builder attestation',
        description: 'Wallet must present a valid agent-builder attestation.',
        rule: {
          kind: 'attestation',
          schema: 'agent-builder',
          issuer: '0xAttestationHub',
        },
        unlockAction: 'Request an agent-builder attestation from the issuer.',
      },
    ],
    uptime: 99.99,
    lastSuccessfulInvocation: '1 minute ago',
    calls24h: 39204,
    failures24h: 14,
    avgLatencyMs: 141,
    revenue30d: 4380,
    tags: ['identity', 'reputation', 'attestations', 'agents'],
    manifest: {
      name: 'Agent Reputation Lookup',
      version: '1.0.5',
      description: 'Agent identity and trust signal lookup.',
      inputSchema: {
        wallet: 'evm-address',
      },
      outputSchema: {
        reputationScore: 'number',
        attestations: 'string[]',
        disputes: 'number',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/agent-reputation/invoke',
        auth: 'siwe',
      },
    },
  },
  {
    id: 'tool-abi-fetcher',
    slug: 'contract-abi-fetcher',
    name: 'Contract ABI Fetcher',
    category: 'Devtools',
    description:
      'Fetches verified contract ABIs and source metadata with fallback explorers and cache freshness indicators.',
    creator: '0xBaseBuilds',
    chain: 'Base',
    endpoint: 'https://api.8257kit.dev/tools/abi-fetcher/invoke',
    manifestUri: 'ipfs://bafy8257abi-fetcher-manifest',
    manifestHash: '0x5c31...8257',
    version: '3.2.4',
    verificationStatus: 'verified',
    trustTier: 'Core',
    pricing: 'Free up to 10,000 calls/month',
    access: [
      {
        id: 'abi-usage-cap',
        predicate: 'UsageCapPredicate',
        label: 'Monthly usage below 10,000 calls',
        description: 'Agent wallet must stay under the free monthly cap.',
        rule: {
          kind: 'usage-cap',
          cap: 10000,
          window: 'month',
        },
        unlockAction: 'Upgrade to a paid quota for higher volume.',
      },
    ],
    uptime: 99.93,
    lastSuccessfulInvocation: '7 minutes ago',
    calls24h: 28902,
    failures24h: 22,
    avgLatencyMs: 176,
    revenue30d: 3180,
    tags: ['devtools', 'abi', 'source', 'contracts'],
    manifest: {
      name: 'Contract ABI Fetcher',
      version: '3.2.4',
      description: 'Verified ABI and source metadata resolver.',
      inputSchema: {
        chain: 'string',
        contract: 'evm-address',
      },
      outputSchema: {
        abi: 'json',
        sourceVerified: 'boolean',
        cacheAgeSeconds: 'number',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/abi-fetcher/invoke',
        auth: 'api-key',
      },
    },
  },
  {
    id: 'tool-x402-invoice',
    slug: 'x402-invoice-helper',
    name: 'x402 Invoice Helper',
    category: 'Payments',
    description:
      'Creates agent-readable invoices, payment intents, subscription status checks, and x402-compatible settlement metadata.',
    creator: '0xPayRail',
    chain: 'Base Sepolia',
    endpoint: 'https://api.8257kit.dev/tools/x402-invoice/invoke',
    manifestUri: 'ipfs://bafy8257x402-invoice-manifest',
    manifestHash: '0x4e02...8257',
    version: '0.7.1',
    verificationStatus: 'needs-review',
    trustTier: 'Experimental',
    pricing: '0.7% payment fee',
    access: [
      {
        id: 'payment-beta',
        predicate: 'AllowlistPredicate',
        label: 'Payment beta allowlist',
        description: 'Wallet must be allowlisted for payment rail beta access.',
        rule: {
          kind: 'allowlist',
          listId: 'dao-approved-tools',
        },
        unlockAction: 'Request access from the payment beta maintainers.',
      },
    ],
    uptime: 98.74,
    lastSuccessfulInvocation: '38 minutes ago',
    calls24h: 870,
    failures24h: 27,
    avgLatencyMs: 512,
    revenue30d: 2210,
    tags: ['payments', 'x402', 'invoices', 'subscriptions'],
    manifest: {
      name: 'x402 Invoice Helper',
      version: '0.7.1',
      description: 'Payment intent and subscription helper for agent tools.',
      inputSchema: {
        amountUsd: 'number',
        payer: 'evm-address',
        memo: 'string',
      },
      outputSchema: {
        invoiceId: 'string',
        paymentUrl: 'url',
        expiresAt: 'iso-date',
      },
      invoke: {
        method: 'POST',
        url: 'https://api.8257kit.dev/tools/x402-invoice/invoke',
        auth: 'agent-wallet',
      },
    },
  },
]
