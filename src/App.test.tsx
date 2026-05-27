import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  window.history.pushState({}, '', '/explore')
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('8257Kit app', () => {
  it('renders the explorer and filters indexed tools', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /ERC-8257 tool explorer/i })).toBeInTheDocument()
    expect(screen.getAllByText('Wallet Risk Scanner').length).toBeGreaterThan(0)

    await user.type(screen.getByLabelText(/Search tools/i), 'x402')

    expect(screen.getAllByText('x402 Invoice Helper').length).toBeGreaterThan(0)
    expect(screen.queryByText('Liquidity Sentinel')).not.toBeInTheDocument()
  })

  it('debugs failed and passing wallet access, then invokes successfully', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/debug')
    render(<App />)

    expect(screen.getByTestId('access-verdict')).toHaveTextContent('Access false')

    await user.click(screen.getByRole('button', { name: /Passing wallet/i }))
    expect(screen.getByTestId('access-verdict')).toHaveTextContent('Access true')

    await user.click(screen.getByRole('button', { name: /Invoke through gateway/i }))
    expect(screen.getByText(/"status": "success"/i)).toBeInTheDocument()
    expect(screen.getByText(/"normalized": true/i)).toBeInTheDocument()
  })

  it('validates a creator registration draft before staging', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/register')
    render(<App />)

    const endpoint = screen.getByLabelText(/Invocation endpoint/i)
    await user.clear(endpoint)
    await user.type(endpoint, 'http://localhost:8787/invoke')

    expect(screen.getByText('Invocation URL must use HTTPS.')).toBeInTheDocument()

    await user.clear(endpoint)
    await user.type(endpoint, 'https://api.example.com/8257/new-tool')
    await user.click(screen.getByRole('button', { name: /Stage registration/i }))

    expect(screen.getByRole('status')).toHaveTextContent('Registration payload is ready for Base.')
  })

  it('shows route tabs and dashboard metrics', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /Dashboard/i }))

    expect(screen.getByRole('heading', { name: /Gateway analytics/i })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: /Invocation logs/i })
    expect(within(table).getByText('gw_9bda1f82')).toBeInTheDocument()
  })
})
