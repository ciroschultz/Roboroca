/**
 * Smoke tests for Roboroca frontend components.
 * Goal: verify each component renders without crashing.
 * Complex components that require canvas/Leaflet (MapView, PerimeterEditor)
 * are intentionally excluded from this suite.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
  loadAuthToken: jest.fn().mockReturnValue(null),
  getCurrentUser: jest.fn().mockResolvedValue(null),
  getProjects: jest.fn().mockResolvedValue({ projects: [], total: 0 }),
  getDashboardStats: jest.fn().mockResolvedValue({
    total_projects: 0,
    total_images: 0,
    total_analyses: 0,
    total_area_ha: 0,
  }),
}))

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/', query: {} }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// ---------------------------------------------------------------------------
// AuthScreen
// ---------------------------------------------------------------------------

import AuthScreen from '@/components/AuthScreen'

describe('AuthScreen', () => {
  const noop = jest.fn()

  it('renders without crashing', () => {
    const { container } = render(<AuthScreen onAuthSuccess={noop} />)
    expect(container).toBeTruthy()
  })

  it('shows the email input field', () => {
    render(<AuthScreen onAuthSuccess={noop} />)
    const emailInput = screen.getByPlaceholderText(/email/i)
    expect(emailInput).toBeInTheDocument()
  })

  it('shows the password input field', () => {
    render(<AuthScreen onAuthSuccess={noop} />)
    // Password placeholder is bullet characters "••••••••"
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('shows login/submit buttons', () => {
    render(<AuthScreen onAuthSuccess={noop} />)
    const loginButtons = screen.getAllByRole('button', { name: /entrar/i })
    expect(loginButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the register tab so the user can switch to sign-up', () => {
    render(<AuthScreen onAuthSuccess={noop} />)
    const registerButtons = screen.getAllByRole('button', { name: /cadastrar/i })
    expect(registerButtons.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

import StatCard from '@/components/StatCard'
import { Leaf } from 'lucide-react'

describe('StatCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <StatCard title="Projetos" value={42} icon={<Leaf size={20} />} />
    )
    expect(container).toBeTruthy()
  })

  it('displays the title text', () => {
    render(<StatCard title="Projetos" value={42} icon={<Leaf size={20} />} />)
    expect(screen.getByText('Projetos')).toBeInTheDocument()
  })

  it('displays an optional unit', () => {
    render(
      <StatCard title="Area" value={10} unit="ha" icon={<Leaf size={20} />} />
    )
    expect(screen.getByText('ha')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

import EmptyState from '@/components/EmptyState'

describe('EmptyState', () => {
  it('renders dashboard empty state without crashing', () => {
    const { container } = render(<EmptyState type="dashboard" />)
    expect(container).toBeTruthy()
  })

  it('renders projects empty state without crashing', () => {
    const { container } = render(<EmptyState type="projects" />)
    expect(container).toBeTruthy()
  })

  it('shows a call-to-action button when onUploadClick is provided', () => {
    render(<EmptyState type="projects" onUploadClick={jest.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})
