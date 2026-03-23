import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardHomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch workspaces
  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('role, joined_at, workspaces(id, name, slug, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const workspaces = (memberRows || []).map(row => ({
    ...row.workspaces,
    role: row.role,
    joinedAt: row.joined_at,
  })).filter(Boolean)

  // If they only have one workspace, redirect directly to it
  if (workspaces.length === 1) {
    redirect(`/dashboard/${workspaces[0].slug}`)
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const firstName = displayName.split(' ')[0]

  return (
    <div style={{ padding: '40px 48px', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
          fontSize: 30, fontWeight: 800, color: '#F0F0F8',
          letterSpacing: '-0.03em', marginBottom: 6,
        }}>
          Hey, {firstName} 👋
        </h1>
        <p style={{ color: '#8080A0', fontSize: 15, margin: 0 }}>
          {workspaces.length > 0
            ? 'Pick a workspace to open, or create a new one.'
            : 'Create your first workspace to get started.'}
        </p>
      </div>

      {/* Workspace grid */}
      {workspaces.length > 0 && (
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
                  {ws.name[0].toUpperCase()}
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
      )}

      {/* Empty state */}
      {workspaces.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" stroke="#00D4FF" strokeWidth="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="2" stroke="#00D4FF" strokeWidth="1.5" strokeDasharray="3 2"/>
              <rect x="3" y="13" width="8" height="8" rx="2" stroke="#00D4FF" strokeWidth="1.5" strokeDasharray="3 2"/>
              <path d="M17 13v8M13 17h8" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 22, fontWeight: 700, color: '#F0F0F8',
            marginBottom: 8, letterSpacing: '-0.02em',
          }}>
            Create your first workspace
          </h2>
          <p style={{ color: '#8080A0', fontSize: 15, maxWidth: 380, lineHeight: 1.6, marginBottom: 28 }}>
            A workspace is a content calendar for a brand, client, or project.
            You can have as many as you need.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 24px' }}>
            Create workspace
          </Link>
        </div>
      )}

      {/* "Create new" CTA at the bottom of list */}
      {workspaces.length > 0 && (
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
      )}
    </div>
  )
}
