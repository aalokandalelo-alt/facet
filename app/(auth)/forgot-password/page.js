'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      setError('Configuration error: NEXT_PUBLIC_APP_URL is not set. Please contact support.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07070E' }}>
      <div style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }} />

      <div className="animate-slideUp" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #00D4FF, #7B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C8.13 3 5 6.13 5 10v2c0 1.1-.9 2-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2c-1.1 0-2-.9-2-2v-2c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.9"/>
                <circle cx="12" cy="20" r="2" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
              fontSize: 24, fontWeight: 700, color: '#F0F0F8', letterSpacing: '-0.02em',
            }}>
              Cadence
            </span>
          </Link>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 20, fontWeight: 700, color: '#F0F0F8', marginBottom: 10 }}>
                Check your inbox
              </h2>
              <p style={{ color: '#8080A0', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                We sent a password reset link to <strong style={{ color: '#F0F0F8' }}>{email}</strong>.
              </p>
              <Link href="/login" className="btn btn-secondary btn-full">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: 22, fontWeight: 700, color: '#F0F0F8',
                marginBottom: 6, letterSpacing: '-0.02em',
              }}>
                Reset your password
              </h1>
              <p style={{ color: '#8080A0', fontSize: 14, marginBottom: 28, marginTop: 0 }}>
                Enter your email and we'll send you a reset link.
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
                    Email address
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
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
                      Sending…
                    </>
                  ) : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8080A0' }}>
            <Link href="/login" style={{ color: '#00D4FF', textDecoration: 'none', fontWeight: 500 }}>
              ← Back to login
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
