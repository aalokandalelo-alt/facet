'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase inserts the recovery token into the URL hash
    // The client library picks it up automatically when initialized
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07070E' }}>
      <div style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }} />

      <div className="animate-slideUp" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 22, fontWeight: 700, color: '#F0F0F8',
            marginBottom: 6, letterSpacing: '-0.02em',
          }}>
            Set new password
          </h1>
          <p style={{ color: '#8080A0', fontSize: 14, marginBottom: 28, marginTop: 0 }}>
            Choose a strong password for your account.
          </p>

          {error && (
            <div style={{
              background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              color: '#FF4060', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                New password
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                Confirm password
              </label>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span className="animate-spin" style={{
                    width: 16, height: 16, border: '2px solid rgba(7,7,14,0.3)',
                    borderTopColor: '#07070E', borderRadius: '50%', display: 'inline-block',
                  }} />
                  Saving…
                </>
              ) : 'Update password'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8080A0' }}>
          <Link href="/login" style={{ color: '#00D4FF', textDecoration: 'none', fontWeight: 500 }}>
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
