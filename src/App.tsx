import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  ExternalLink,
  Filter,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, MouseEvent, ReactElement } from 'react'
import './App.css'
import { tools, walletProfiles } from './data/tools'
import type { PredicateKind, ToolDefinition } from './data/tools'
import {
  categories,
  chains,
  checkAccess,
  dashboardMetrics,
  discoverTools,
  invokeTool,
  predicateKinds,
  trustTiers,
  validateManifest,
} from './lib/gateway'

type RouteKey = 'explore' | 'debug' | 'register' | 'docs' | 'dashboard'

type Route = {
  key: RouteKey
  label: string
  path: string
}

type RegisterDraft = {
  name: string
  endpoint: string
  category: string
  price: string
  predicate: PredicateKind
}

const routes: Route[] = [
  { key: 'explore', label: 'Explore', path: '/explore' },
  { key: 'debug', label: 'Debug', path: '/debug' },
  { key: 'register', label: 'Register', path: '/register' },
  { key: 'docs', label: 'Docs', path: '/docs' },
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
]

const sampleInput = {
  chain: 'base',
  address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
}

const routeFromPath = (pathname: string): RouteKey => {
  const cleanPath = pathname.replace(/^\/+/, '').split('/')[0]
  const matched = routes.find((route) => route.key === cleanPath)

  return matched?.key ?? 'explore'
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const parseInvocationInput = (inputText: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(inputText) as unknown

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }

    return { value: parsed }
  } catch {
    return { raw: inputText }
  }
}

function App() {
  const [route, setRoute] = useState<RouteKey>(() => routeFromPath(window.location.pathname))

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextRoute: RouteKey) => {
    const next = routes.find((item) => item.key === nextRoute)

    if (!next) {
      return
    }

    window.history.pushState({}, '', next.path)
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="/explore" onClick={(event) => handleNav(event, 'explore', navigate)}>
          <span className="brand-mark" aria-hidden="true">
            82
          </span>
          <span>
            <strong>8257Kit</strong>
            <small>Local gateway playground</small>
          </span>
        </a>

        <nav className="nav-list">
          {routes.map((item) => (
            <a
              aria-current={route === item.key ? 'page' : undefined}
              href={item.path}
              key={item.key}
              onClick={(event) => handleNav(event, item.key, navigate)}
            >
              {navIcon(item.key)}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>Index, unlock, invoke, and monetize ERC-8257 tools through one SDK.</p>
        </div>
      </aside>

      <main className="main">
        <TopBar navigate={navigate} />
        {route === 'explore' && <ExplorePage navigate={navigate} />}
        {route === 'debug' && <DebugPage />}
        {route === 'register' && <RegisterPage />}
        {route === 'docs' && <DocsPage />}
        {route === 'dashboard' && <DashboardPage />}
      </main>
    </div>
  )
}

const handleNav = (
  event: MouseEvent<HTMLAnchorElement>,
  route: RouteKey,
  navigate: (route: RouteKey) => void,
) => {
  event.preventDefault()
  navigate(route)
}

const navIcon = (route: RouteKey) => {
  const props = { size: 18, 'aria-hidden': true }

  switch (route) {
    case 'explore':
      return <Search {...props} />
    case 'debug':
      return <LockKeyhole {...props} />
    case 'register':
      return <Plus {...props} />
    case 'docs':
      return <BookOpen {...props} />
    case 'dashboard':
      return <BarChart3 {...props} />
  }
}

function TopBar({ navigate }: { navigate: (route: RouteKey) => void }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Composio-style infrastructure for ERC-8257</p>
        <h1>Explore, gate, and debug agent tools.</h1>
        <p>Local simulation · fixture wallets · sample analytics</p>
      </div>
      <div className="topbar-actions">
        <button className="secondary-button" type="button" onClick={() => navigate('docs')}>
          <Code2 size={17} aria-hidden="true" />
          SDK
        </button>
        <button className="primary-button" type="button" onClick={() => navigate('debug')}>
          <Play size={17} aria-hidden="true" />
          Debug access
        </button>
      </div>
    </header>
  )
}

function ExplorePage({ navigate }: { navigate: (route: RouteKey) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [chain, setChain] = useState('All')
  const [trustTier, setTrustTier] = useState<ToolDefinition['trustTier'] | 'All'>('All')
  const [selectedToolId, setSelectedToolId] = useState(tools[0].id)

  const filteredTools = useMemo(
    () => discoverTools({ query, category, chain: chain as ToolDefinition['chain'] | 'All', trustTier }),
    [category, chain, query, trustTier],
  )

  const selectedTool = filteredTools.find((tool) => tool.id === selectedToolId) ?? filteredTools[0] ?? tools[0]
  const validation = validateManifest(selectedTool.manifest)

  return (
    <section className="page-grid explore-layout" aria-labelledby="explore-title">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Registry indexer</p>
          <h2 id="explore-title">ERC-8257 tool explorer</h2>
          <p>
            Search indexed tools, inspect manifests, compare predicates, and see invocation health
            before an agent spends money or signs a request.
          </p>
        </div>
        <div className="quick-metrics" aria-label="Registry metrics">
          <Metric label="Indexed tools" value={dashboardMetrics.indexedTools.toString()} />
          <Metric label="24h calls" value={formatNumber(dashboardMetrics.invocations24h)} />
          <Metric label="Avg uptime" value={`${dashboardMetrics.uptimeAverage}%`} />
        </div>
      </div>

      <div className="toolbar" role="search">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search tools</span>
          <input
            aria-label="Search tools"
            placeholder="Search risk, payments, ABI..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Select label="Category" value={category} options={categories} onChange={setCategory} />
        <Select label="Chain" value={chain} options={chains} onChange={setChain} />
        <Select
          label="Trust"
          value={trustTier}
          options={trustTiers}
          onChange={(value) => setTrustTier(value as ToolDefinition['trustTier'] | 'All')}
        />
      </div>

      <div className="tool-browser">
        <div className="tool-list" aria-label="Indexed tools">
          {filteredTools.map((tool) => (
            <button
              className={`tool-row ${selectedTool.id === tool.id ? 'is-selected' : ''}`}
              key={tool.id}
              onClick={() => setSelectedToolId(tool.id)}
              type="button"
            >
              <span className="tool-row-main">
                <strong>{tool.name}</strong>
                <small>{tool.description}</small>
              </span>
              <span className={`status-pill ${tool.verificationStatus}`}>{tool.verificationStatus}</span>
            </button>
          ))}
          {filteredTools.length === 0 && (
            <div className="empty-state">
              <Filter size={22} aria-hidden="true" />
              No indexed tools match those filters.
            </div>
          )}
        </div>

        <article className="detail-panel">
          <div className="detail-header">
            <div>
              <p className="eyebrow">{selectedTool.category}</p>
              <h3>{selectedTool.name}</h3>
              <p>{selectedTool.description}</p>
            </div>
            <span className={`tier-badge ${selectedTool.trustTier.toLowerCase()}`}>
              {selectedTool.trustTier}
            </span>
          </div>

          <div className="facts-grid">
            <Fact label="Creator" value={selectedTool.creator} />
            <Fact label="Chain" value={selectedTool.chain} />
            <Fact label="Endpoint" value={selectedTool.endpoint} />
            <Fact label="Pricing" value={selectedTool.pricing} />
            <Fact label="Manifest" value={selectedTool.manifestUri} />
            <Fact label="Hash" value={selectedTool.manifestHash} />
          </div>

          <div className="health-strip">
            <Metric label="Uptime" value={`${selectedTool.uptime}%`} />
            <Metric label="Latency" value={`${selectedTool.avgLatencyMs} ms`} />
            <Metric label="24h failures" value={formatNumber(selectedTool.failures24h)} />
            <Metric label="Last success" value={selectedTool.lastSuccessfulInvocation} />
          </div>

          <div className="section-title">
            <h4>Access predicates</h4>
            <span>{selectedTool.access.length} checks</span>
          </div>
          <div className="predicate-list">
            {selectedTool.access.map((requirement) => (
              <div className="predicate-row" key={requirement.id}>
                <KeyRound size={18} aria-hidden="true" />
                <div>
                  <strong>{requirement.label}</strong>
                  <p>{requirement.description}</p>
                </div>
                <code>{requirement.predicate}</code>
              </div>
            ))}
          </div>

          <div className="section-title">
            <h4>Manifest validator</h4>
            <span className={validation.valid ? 'pass-text' : 'fail-text'}>
              {validation.valid ? 'valid' : 'invalid'} / {validation.score}
            </span>
          </div>
          <pre className="code-block">
            {JSON.stringify(
              {
                name: selectedTool.manifest.name,
                version: selectedTool.manifest.version,
                inputSchema: selectedTool.manifest.inputSchema,
                outputSchema: selectedTool.manifest.outputSchema,
                invoke: selectedTool.manifest.invoke,
              },
              null,
              2,
            )}
          </pre>

          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={() => navigate('debug')}>
              <LockKeyhole size={17} aria-hidden="true" />
              Check wallet access
            </button>
            <button className="secondary-button" type="button" onClick={() => navigate('docs')}>
              <ExternalLink size={17} aria-hidden="true" />
              SDK example
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}

function DebugPage() {
  const [toolId, setToolId] = useState(tools[0].id)
  const [wallet, setWallet] = useState(walletProfiles[2].address)
  const [inputText, setInputText] = useState(JSON.stringify(sampleInput, null, 2))
  const [invocation, setInvocation] = useState<ReturnType<typeof invokeTool> | null>(null)

  const access = useMemo(() => checkAccess(toolId, wallet), [toolId, wallet])
  const tool = access.tool

  const invoke = () => {
    setInvocation(invokeTool({ toolId, wallet, input: parseInvocationInput(inputText) }))
  }

  return (
    <section className="page-grid debug-layout" aria-labelledby="debug-title">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Access debugger</p>
          <h2 id="debug-title">Explain exactly why a wallet can or cannot call a tool.</h2>
          <p>
            Paste a tool ID and wallet address to simulate ERC-8257 predicate checks, show failed
            requirements, and suggest the next unlock action.
          </p>
        </div>
        <div className={`access-verdict ${access.access ? 'pass' : 'fail'}`} data-testid="access-verdict">
          {access.access ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          <span>{access.access ? 'Access true' : 'Access false'}</span>
        </div>
      </div>

      <div className="debug-workbench">
        <form className="control-panel" onSubmit={(event) => event.preventDefault()}>
          <label>
            Tool
            <select aria-label="Tool" value={toolId} onChange={(event) => setToolId(event.target.value)}>
              {tools.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Agent wallet
            <input
              aria-label="Agent wallet"
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setWallet(walletProfiles[0].address)}
            >
              <Wallet size={17} aria-hidden="true" />
              Passing wallet
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setWallet(walletProfiles[2].address)}
            >
              <RefreshCw size={17} aria-hidden="true" />
              Failing wallet
            </button>
          </div>
          <label>
            Invocation input
            <textarea
              aria-label="Invocation input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
            />
          </label>
          <button className="primary-button wide" type="button" onClick={invoke}>
            <Play size={17} aria-hidden="true" />
            Invoke through gateway
          </button>
        </form>

        <article className="result-panel">
          <div className="detail-header">
            <div>
              <p className="eyebrow">{tool.slug}</p>
              <h3>{access.summary}</h3>
              <p>{tool.description}</p>
            </div>
          </div>

          <div className="requirements">
            {[...access.passed, ...access.failed].map((result) => (
              <div className={`requirement ${result.passed ? 'passed' : 'failed'}`} key={result.requirement.id}>
                <span className="requirement-icon" aria-hidden="true">
                  {result.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </span>
                <div>
                  <strong>{result.requirement.label}</strong>
                  <p>{result.reason}</p>
                  <small>{result.current}</small>
                </div>
              </div>
            ))}
          </div>

          {!access.access && (
            <div className="unlock-box">
              <h4>Unlock actions</h4>
              {access.unlockActions.map((action) => (
                <p key={action}>
                  <ChevronRight size={15} aria-hidden="true" />
                  {action}
                </p>
              ))}
            </div>
          )}

          {invocation && (
            <div className="section-title">
              <h4>Invocation result</h4>
              <span className={invocation.ok ? 'pass-text' : 'fail-text'}>{invocation.status}</span>
            </div>
          )}
          {invocation && <pre className="code-block">{JSON.stringify(invocation, null, 2)}</pre>}
        </article>
      </div>
    </section>
  )
}

function RegisterPage() {
  const [draft, setDraft] = useState<RegisterDraft>({
    name: 'Invoice Settlement Agent',
    endpoint: 'https://api.example.com/8257/invoice-settlement',
    category: 'Payments',
    price: '$0.02 / call',
    predicate: 'subscription',
  })
  const [registered, setRegistered] = useState(false)

  const manifest = useMemo(
    () => ({
      name: draft.name,
      version: '0.1.0',
      description: `${draft.name} registered through 8257Kit.`,
      inputSchema: {
        chain: 'string',
        payload: 'json',
      },
      outputSchema: {
        status: 'string',
        receipt: 'json',
      },
      invoke: {
        method: 'POST' as const,
        url: draft.endpoint,
        auth: 'agent-wallet' as const,
      },
    }),
    [draft.endpoint, draft.name],
  )
  const validation = validateManifest(manifest)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegistered(validation.valid)
  }

  const updateDraft = (key: keyof RegisterDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setRegistered(false)
  }

  return (
    <section className="page-grid register-layout" aria-labelledby="register-title">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Creator workflow</p>
          <h2 id="register-title">Register any API as a gated ERC-8257 tool.</h2>
          <p>
            Generate a manifest, choose a predicate template, validate the endpoint shape, and stage
            the onchain registration payload.
          </p>
        </div>
        <div className={`access-verdict ${validation.valid ? 'pass' : 'fail'}`}>
          {validation.valid ? <BadgeCheck aria-hidden="true" /> : <XCircle aria-hidden="true" />}
          <span>Manifest score {validation.score}</span>
        </div>
      </div>

      <div className="register-workbench">
        <form className="control-panel" onSubmit={submit}>
          <label>
            Tool name
            <input
              aria-label="Tool name"
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
            />
          </label>
          <label>
            Invocation endpoint
            <input
              aria-label="Invocation endpoint"
              value={draft.endpoint}
              onChange={(event) => updateDraft('endpoint', event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              aria-label="Register category"
              value={draft.category}
              onChange={(event) => updateDraft('category', event.target.value)}
            >
              {categories
                .filter((item) => item !== 'All')
                .map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </select>
          </label>
          <label>
            Pricing
            <input
              aria-label="Pricing"
              value={draft.price}
              onChange={(event) => updateDraft('price', event.target.value)}
            />
          </label>
          <label>
            Predicate template
            <select
              aria-label="Predicate template"
              value={draft.predicate}
              onChange={(event) => updateDraft('predicate', event.target.value)}
            >
              {predicateKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {predicateLabel(kind)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button wide" type="submit">
            <ShieldCheck size={17} aria-hidden="true" />
            Stage registration
          </button>
          {registered && (
            <p className="success-message" role="status">
              Registration payload is ready for Base.
            </p>
          )}
        </form>

        <article className="detail-panel">
          <div className="section-title">
            <h4>Generated manifest</h4>
            <span className={validation.valid ? 'pass-text' : 'fail-text'}>
              {validation.valid ? 'ready' : 'blocked'}
            </span>
          </div>
          <pre className="code-block">{JSON.stringify(manifest, null, 2)}</pre>

          <div className="section-title">
            <h4>Predicate template</h4>
            <span>{predicateLabel(draft.predicate)}</span>
          </div>
          <div className="predicate-row no-button">
            <Layers3 size={18} aria-hidden="true" />
            <div>
              <strong>{predicateCopy[draft.predicate].title}</strong>
              <p>{predicateCopy[draft.predicate].body}</p>
            </div>
          </div>

          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="validation-list">
              {[...validation.errors, ...validation.warnings].map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

function DocsPage() {
  const [tab, setTab] = useState<'agent' | 'creator' | 'mcp'>('agent')

  return (
    <section className="page-grid docs-layout" aria-labelledby="docs-title">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Developer experience</p>
          <h2 id="docs-title">One SDK for discovery, access, unlocks, and invocation.</h2>
          <p>
            The hosted gateway hides registry reads, manifest validation, predicate checks,
            payments, retries, logs, and normalized errors behind one agent-friendly surface.
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Documentation examples">
        <button
          aria-selected={tab === 'agent'}
          className={tab === 'agent' ? 'is-active' : ''}
          onClick={() => setTab('agent')}
          role="tab"
          type="button"
        >
          <TerminalSquare size={17} aria-hidden="true" />
          Agent SDK
        </button>
        <button
          aria-selected={tab === 'creator'}
          className={tab === 'creator' ? 'is-active' : ''}
          onClick={() => setTab('creator')}
          role="tab"
          type="button"
        >
          <Code2 size={17} aria-hidden="true" />
          Creator CLI
        </button>
        <button
          aria-selected={tab === 'mcp'}
          className={tab === 'mcp' ? 'is-active' : ''}
          onClick={() => setTab('mcp')}
          role="tab"
          type="button"
        >
          <Sparkles size={17} aria-hidden="true" />
          MCP bridge
        </button>
      </div>

      <div className="docs-grid">
        <article className="detail-panel">
          <h3>{docsContent[tab].title}</h3>
          <p>{docsContent[tab].body}</p>
          <pre className="code-block">{docsContent[tab].code}</pre>
        </article>
        <article className="detail-panel">
          <h3>Gateway API surface</h3>
          <div className="api-list">
            {[
              ['gateway.discover()', 'Search indexed ERC-8257 tools by intent, category, chain, or trust.'],
              ['gateway.checkAccess()', 'Simulate predicates and return exact pass/fail reasons.'],
              ['gateway.getRequirements()', 'Return unlock requirements for wallet UX and wallets.'],
              ['gateway.invoke()', 'Authenticate, check access, pay, retry, log, and normalize responses.'],
              ['gateway.registerTool()', 'Generate and submit registry registration payloads.'],
              ['gateway.createSubscriptionGate()', 'Deploy battle-tested subscription predicates.'],
            ].map(([name, body]) => (
              <div className="api-row" key={name}>
                <code>{name}</code>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function DashboardPage() {
  const failureRate =
    Math.round((dashboardMetrics.failures24h / dashboardMetrics.invocations24h) * 10000) / 100
  const logs = [
    {
      request: 'gw_9bda1f82',
      tool: 'Wallet Risk Scanner',
      wallet: walletProfiles[0].address,
      status: 'success',
      latency: '284 ms',
    },
    {
      request: 'gw_31ca8e10',
      tool: 'Liquidity Sentinel',
      wallet: walletProfiles[2].address,
      status: 'access_denied',
      latency: '428 ms',
    },
    {
      request: 'gw_725e0a11',
      tool: 'Contract ABI Fetcher',
      wallet: walletProfiles[1].address,
      status: 'success',
      latency: '176 ms',
    },
  ]

  return (
    <section className="page-grid dashboard-layout" aria-labelledby="dashboard-title">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Creator dashboard</p>
          <h2 id="dashboard-title">Gateway analytics for tool builders.</h2>
          <p>
            Monitor invocation quality, failed access attempts, revenue, and agent usage patterns
            across the indexed tool network.
          </p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard icon={<Activity />} label="24h invocations" value={formatNumber(dashboardMetrics.invocations24h)} />
        <MetricCard icon={<Gauge />} label="Average uptime" value={`${dashboardMetrics.uptimeAverage}%`} />
        <MetricCard icon={<XCircle />} label="Failure rate" value={`${failureRate}%`} />
        <MetricCard icon={<Wallet />} label="30d creator revenue" value={formatCurrency(dashboardMetrics.revenue30d)} />
      </div>

      <div className="dashboard-grid">
        <article className="detail-panel">
          <div className="section-title">
            <h4>Revenue by tool</h4>
            <span>30 days</span>
          </div>
          <div className="bar-list">
            {tools.map((tool) => (
              <div className="bar-row" key={tool.id}>
                <span>{tool.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(8, (tool.revenue30d / 18420) * 100)}%` }}
                  />
                </div>
                <strong>{formatCurrency(tool.revenue30d)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <div className="section-title">
            <h4>Invocation logs</h4>
            <span>live sample</span>
          </div>
          <div className="log-table" role="table" aria-label="Invocation logs">
            <div role="row">
              <span role="columnheader">Request</span>
              <span role="columnheader">Tool</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Latency</span>
            </div>
            {logs.map((log) => (
              <div role="row" key={log.request}>
                <span role="cell">{log.request}</span>
                <span role="cell">{log.tool}</span>
                <span className={log.status === 'success' ? 'pass-text' : 'fail-text'} role="cell">
                  {log.status}
                </span>
                <span role="cell">{log.latency}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="select-field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <article className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

const predicateLabel = (kind: PredicateKind) =>
  kind
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ')

const predicateCopy: Record<PredicateKind, { title: string; body: string }> = {
  subscription: {
    title: 'SubscriptionPredicate',
    body: 'Charge recurring access for agents while keeping the tool callable through a simple gateway unlock flow.',
  },
  nft: {
    title: 'NFT gate',
    body: 'Require an ERC-721 or ERC-1155 token before the gateway signs and forwards the invocation.',
  },
  allowlist: {
    title: 'AllowlistPredicate',
    body: 'Run private betas, enterprise registries, and partner-only tools through a maintained wallet list.',
  },
  'usage-cap': {
    title: 'UsageCapPredicate',
    body: 'Limit calls by wallet across daily or monthly windows before overage pricing begins.',
  },
  reputation: {
    title: 'ReputationPredicate',
    body: 'Require agent trust scores so sensitive tools only run for known, high-quality operators.',
  },
  attestation: {
    title: 'AttestationPredicate',
    body: 'Gate access on verifiable credentials issued to builders, agents, teams, or customers.',
  },
  composite: {
    title: 'CompositePredicate',
    body: 'Combine subscription, NFT, allowlist, and reputation predicates with AND/OR policies.',
  },
}

const docsContent = {
  agent: {
    title: 'Invoke an onchain-registered tool',
    body: 'Agent builders get one call path for discovery, predicate debugging, unlocks, and execution.',
    code: `import { Gateway } from "@8257kit/sdk"

const gateway = new Gateway({ apiKey })

const result = await gateway.invoke({
  agentWallet: "0x8257A11CE000000000000000000000000000000",
  tool: "wallet-risk-scanner",
  input: {
    chain: "base",
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  }
})`,
  },
  creator: {
    title: 'Register and monetize a tool',
    body: 'Tool builders get a guided CLI for manifest validation, predicate deployment, and registration.',
    code: `npx 8257kit init
npx 8257kit validate ./8257.manifest.json
npx 8257kit deploy-predicate subscription --price 49
npx 8257kit register --chain base`,
  },
  mcp: {
    title: 'Wrap an MCP server',
    body: 'MCP servers can become discoverable, gated, and payable ERC-8257 tools without rewriting the server.',
    code: `npx 8257kit wrap-mcp ./my-server

# Generates manifests, maps MCP tools to endpoints,
# attaches predicates, and exposes a hosted invocation URL.`,
  },
} as const

export default App
