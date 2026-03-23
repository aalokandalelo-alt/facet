'use client'

import Link from 'next/link'

// WorkspaceGrid — interactive card grid + "create new" CTA.
// This is a Client Component because the cards have hover effects.
// Workspace data is fetched in the parent Server Component and passed as props.
export default function WorkspaceGrid({ workspaces }) {
  if (workspaces.length === 0) return null

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {workspaces.map(ws => (
          <Link
            key={ws.id}
            href={`/dashboard/${ws.slug}`}
            style={{
              display: 'block', textDecoration: 'none',
              background: '#0F0F1A', border: '1px solid #1E1E35',
              borderRadius: 16, padding: '22px 24px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
              e.currentTarget.style.background = '#13132A'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1E1E35'
              e.currentTarget.style.background = '#0F0F1A'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,92,246,0.15))',
                border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
                color: '#00D4FF',
                fontFamily: 'var(--font-display, sans-serif)',
              }}>
                {ws.name?.[0]?.toUpperCase() ?? 'W'}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#4A4A6A',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: '#16162A', padding: '3px 8px', borderRadius: 6,
              }}>
                {ws.role}
              </span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display, sans-serif)',
              fontSize: 16, fontWeight: 700, color: '#F0F0F8',
              margin: '0 0 4px',
            }}>
              {ws.name}
            </h3>
            <p style={{ fontSize: 12, color: '#4A4A6A', margin: 0 }}>
              /{ws.slug}
            </p>
          </Link>
        ))}
      </div>

      {/* "Create new" CTA below the grid */}
      <Link
        href="/dashboard/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: '#8080A0', textDecoration: 'none', fontSize: 14,
          padding: '8px 0',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#00D4FF'}
        onMouseLeave={e => e.currentTarget.style.color = '#8080A0'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Create new workspace
      </Link>
    </>
  )
}
