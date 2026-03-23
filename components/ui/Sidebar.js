'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Workspaces',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
]

export default function Sidebar({ user, workspaces = [], currentWorkspace = null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside style={{
      width: collapsed ? 60 : 240,
      minWidth: collapsed ? 60 : 240,
      height: '100vh',
      background: '#0A0A18',
      borderRight: '1px solid #1E1E35',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? '18px 12px' : '18px 16px',
        borderBottom: '1px solid #1E1E35',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        {!collapsed && (
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #00D4FF, #7B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C8.13 3 5 6.13 5 10v2c0 1.1-.9 2-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2c-1.1 0-2-.9-2-2v-2c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.9"/>
                <circle cx="12" cy="20" r="1.5" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
              fontSize: 17, fontWeight: 700, color: '#F0F0F8',
              letterSpacing: '-0.02em', whiteSpace: 'nowrap',
            }}>
              Cadence
            </span>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4A4A6A', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#8080A0'}
          onMouseLeave={e => e.currentTarget.style.color = '#4A4A6A'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>

      {/* Workspaces section */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '12px 10px' }}>
        {!collapsed && (
          <p style={{
            fontSize: 11, fontWeight: 600, color: '#4A4A6A',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0 6px', marginBottom: 6,
          }}>
            Workspaces
          </p>
        )}

        {workspaces.map(ws => {
          const isActive = pathname.startsWith(`/dashboard/${ws.slug}`)
          return (
            <Link
              key={ws.id}
              href={`/dashboard/${ws.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '8px' : '8px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                marginBottom: 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = '#16162A'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
              title={collapsed ? ws.name : undefined}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: isActive ? 'rgba(0,212,255,0.15)' : '#16162A',
                border: `1px solid ${isActive ? 'rgba(0,212,255,0.3)' : '#1E1E35'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 11, fontWeight: 700,
                color: isActive ? '#00D4FF' : '#8080A0',
              }}>
                {ws.name[0].toUpperCase()}
              </div>
              {!collapsed && (
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#F0F0F8' : '#8080A0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flex: 1,
                }}>
                  {ws.name}
                </span>
              )}
            </Link>
          )
        })}

        {/* Create workspace button */}
        <Link
          href="/dashboard/new"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px' : '8px 10px',
            borderRadius: 8, textDecoration: 'none', marginTop: 4,
            justifyContent: collapsed ? 'center' : 'flex-start',
            border: '1px dashed #1E1E35',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#00D4FF'
            e.currentTarget.style.background = 'rgba(0,212,255,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#1E1E35'
            e.currentTarget.style.background = 'transparent'
          }}
          title={collapsed ? 'New workspace' : undefined}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: '#4A4A6A',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <span style={{ fontSize: 13, color: '#4A4A6A' }}>New workspace</span>
          )}
        </Link>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #1E1E35', margin: '12px 0' }} />

        {/* Navigation items */}
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '8px' : '8px 10px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? '#16162A' : 'transparent',
                color: isActive ? '#F0F0F8' : '#8080A0',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#16162A'
                  e.currentTarget.style.color = '#F0F0F8'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#8080A0'
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span style={{ fontSize: 13, fontWeight: 400, whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          )
        })}

        {/* Profile link */}
        <Link
          href="/dashboard/profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '8px' : '8px 10px',
            borderRadius: 8, textDecoration: 'none', marginBottom: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: pathname === '/dashboard/profile' ? '#16162A' : 'transparent',
            color: pathname === '/dashboard/profile' ? '#F0F0F8' : '#8080A0',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (pathname !== '/dashboard/profile') {
              e.currentTarget.style.background = '#16162A'
              e.currentTarget.style.color = '#F0F0F8'
            }
          }}
          onMouseLeave={e => {
            if (pathname !== '/dashboard/profile') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#8080A0'
            }
          }}
          title={collapsed ? 'Profile' : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {!collapsed && <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Profile</span>}
        </Link>
      </div>

      {/* Footer / User */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 10px',
        borderTop: '1px solid #1E1E35',
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D4FF, #7B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#07070E',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#F0F0F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#4A4A6A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4A4A6A', padding: 4, borderRadius: 6,
                display: 'flex', flexShrink: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#FF4060'}
              onMouseLeave={e => e.currentTarget.style.color = '#4A4A6A'}
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4A4A6A', padding: 8, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF4060'}
            onMouseLeave={e => e.currentTarget.style.color = '#4A4A6A'}
            title="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </aside>
  )
}
