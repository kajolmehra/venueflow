import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/crm', label: 'CRM' },
  { to: '/admin', label: 'Organizer' },
  { to: '/events', label: 'Booking' },
]

export function PortalShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  showHero = true,
  variant = 'standard',
  sidebarItems = [],
}) {
  const { user, logout, isLoggingOut } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  if (variant === 'dashboard') {
    return (
      <div className={`dashboard-shell${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar-brand">
            <Link className="dashboard-brand-mark" to="/">
              VenueFlow
            </Link>
            <p className="dashboard-brand-subline">{title}</p>
          </div>

          {sidebarItems.length ? (
            <div className="dashboard-sidebar-block">
              <span className="dashboard-sidebar-heading">Workspace</span>
              <nav className="dashboard-side-nav">
                {sidebarItems.map((item) =>
                  item.to ? (
                    <NavLink
                      key={item.to}
                      className={({ isActive }) => `dashboard-side-link${isActive ? ' is-active' : ''}`}
                      end={item.end}
                      to={item.to}
                    >
                      {item.label}
                    </NavLink>
                  ) : (
                    <a className="dashboard-anchor-link" href={item.href} key={item.href}>
                      {item.label}
                    </a>
                  ),
                )}
              </nav>
            </div>
          ) : null}
        </aside>

        <div className="dashboard-workspace">
          <header className="dashboard-topbar">
            <div className="dashboard-toolbar-main">
              <button
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="dashboard-toggle-button"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>

              <div className="dashboard-topbar-copy">
                <span className="dashboard-topbar-eyebrow">{eyebrow}</span>
                <h1>{title}</h1>
              </div>
            </div>

            <div className="dashboard-topbar-actions">
              {actions ? <div className="dashboard-header-actions">{actions}</div> : null}
              <div className="dashboard-session-card">
                {user ? (
                  <>
                    <strong>{user.name}</strong>
                    <button
                      className="ghost-button dashboard-logout-button"
                      disabled={isLoggingOut}
                      onClick={logout}
                      type="button"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </>
                ) : (
                  <span className="dashboard-chip neutral">Guest mode</span>
                )}
              </div>
            </div>
          </header>

          <main className="dashboard-main">{children}</main>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <div>
          <Link className="brand-mark" to="/">
            VenueFlow
          </Link>
          <p className="brand-subline">Event posting and ticket booking assessment</p>
        </div>

        <nav className="shell-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `shell-link${isActive ? ' is-active' : ''}`}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell-user">
          {user ? (
            <>
              <div>
                <strong>{user.name}</strong>
                <span>{user.role.replace('_', ' ')}</span>
              </div>
              <button className="ghost-button shell-logout" disabled={isLoggingOut} onClick={logout} type="button">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <span className="status-badge">Guest mode</span>
          )}
        </div>
      </header>

      <main className="shell-main">
        {showHero ? (
          <section className="hero-panel">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero-copy">{subtitle}</p>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </section>
        ) : null}

        {children}
      </main>
    </div>
  )
}
