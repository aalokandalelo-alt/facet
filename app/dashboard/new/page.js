'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export default function NewWorkspacePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(val) {
    setName(val)
    if (!slugEdited) {
      setSlug(slugify(val))
    }
  }

  function handleSlugChange(val) {
    setSlugEdited(true)
    setSlug(slugify(val))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Workspace name is required.'); return }
    if (!slug.trim()) { setError('Workspace slug is required.'); return }

    setLoading(true)

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push(`/dashboard/${data.workspace.slug}`)
      router.refresh()
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '48px', flex: 1 }}>
      <div style={{ maxWidth: 520 }}>
        {/* Back */}
        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#8080A0', textDecoration: 'none', fontSize: 13, marginBottom: 32,
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'}
          onMouseLeave={e => e.currentTarget.style.color = '#8080A0'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All workspaces
        </Link>

        <h1 style={{
          fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
          fontSize: 28, fontWeight: 800, color: '#F0F0F8',
          letterSpacing: '-0.03em', marginBottom: 8,
        }}>
          New workspace
        </h1>
        <p style={{ color: '#8080A0', fontSize: 15, marginBottom: 36 }}>
          A workspace is a calendar for a brand, client, or project.
        </p>

        <div className="card" style={{ padding: 32 }}>
          {error && (
            <div style={{
              background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 24,
              color: '#FF4060', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                Workspace name
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. My Personal Brand"
                required
                autoFocus
                maxLength={80}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                URL slug
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{
                  background: '#16162A', border: '1px solid #1E1E35',
                  borderRight: 'none', borderRadius: '10px 0 0 10px',
                  padding: '10px 12px', fontSize: 13, color: '#4A4A6A',
                  whiteSpace: 'nowrap',
                }}>
                  /dashboard/
                </span>
                <input
                  className="input"
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  style={{ borderRadius: '0 10px 10px 0' }}
                  placeholder="my-personal-brand"
                  required
                  maxLength={60}
                />
              </div>
              <p style={{ fontSize: 12, color: '#4A4A6A', marginTop: 6 }}>
                This will be your workspace's URL. Only letters, numbers, and dashes.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link href="/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}>
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !name.trim() || !slug.trim()}
                style={{ flex: 2 }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin" style={{
                      width: 14, height: 14, border: '2px solid rgba(7,7,14,0.3)',
                      borderTopColor: '#07070E', borderRadius: '50%', display: 'inline-block',
                    }} />
                    Creating…
                  </>
                ) : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
