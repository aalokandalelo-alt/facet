import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkspaceNavButtons from './_components/workspace-nav-buttons'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: `${slug} — Cadence`,
  }
}

export default async function WorkspacePage({ params }) {
  const { slug } = await params

  const supabase = await createClient()

  // Auth check (middleware already handles redirect, but double-check server-side)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Step 1: Load workspace by slug
  // Step 2: Verify the current user is a member (security: non-members get 404)
  // NOTE: .eq() on a foreign table relation does not work in PostgREST — use two
  // separate queries instead. This is the correct pattern for this case.
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!workspace) notFound()

  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('role, joined_at')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!memberRow) notFound()

  const role = memberRow.role

  const createdDate = new Date(workspace.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ padding: '48px', flex: 1 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {/* Workspace avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,92,246,0.2))',
              border: '1px solid rgba(0,212,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#00D4FF',
              fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
              flexShrink: 0,
            }}>
              {workspace.name?.[0]?.toUpperCase() ?? 'W'}
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
                fontSize: 26, fontWeight: 800, color: '#F0F0F8',
                letterSpacing: '-0.03em', margin: 0,
              }}>
                {workspace.name}
              </h1>
              <p style={{ color: '#4A4A6A', fontSize: 13, margin: 0 }}>
                /{workspace.slug} · Created {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#8080A0',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          background: '#16162A', border: '1px solid #1E1E35',
          padding: '4px 10px', borderRadius: 6,
        }}>
          {role}
        </span>
      </div>

      {/* Coming soon placeholder */}
      <div className="card" style={{ padding: '64px 48px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Calendar icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="#00D4FF" strokeWidth="1.5"/>
            <path d="M3 9h18" stroke="#00D4FF" strokeWidth="1.5"/>
            <path d="M8 2v4M16 2v4" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.6"/>
            <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.4"/>
            <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.2"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
          fontSize: 22, fontWeight: 700, color: '#F0F0F8',
          letterSpacing: '-0.02em', marginBottom: 10,
        }}>
          Calendar coming soon
        </h2>
        <p style={{
          color: '#8080A0', fontSize: 15, lineHeight: 1.65,
          maxWidth: 400, margin: '0 auto 32px',
        }}>
          Your workspace is set up and ready. The content calendar, post scheduling,
          and pillar management features are being built for Phase 2.
        </p>

        <WorkspaceNavButtons />
      </div>
    </div>
  )
}
