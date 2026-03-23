'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07070E' }}>
      {/* Background glow */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="animate-slideUp" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginBottom: 8,
          }}>
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
          </div>
          <p style={{ color: '#8080A0', fontSize: 14, margin: 0 }}>Your team's content rhythm, in one place.</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
            fontSize: 22, fontWeight: 700, color: '#F0F0F8',
            marginBottom: 6, letterSpacing: '-0.02em',
          }}>
            Welcome back
          </h1>
          <p style={{ color: '#8080A0', fontSize: 14, marginBottom: 28, marginTop: 0 }}>
            Sign in to your account
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#8080A0' }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: 13, color: '#00D4FF', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <span className="animate-spin" style={{
                    width: 16, height: 16, border: '2px solid rgba(7,7,14,0.3)',
                    borderTopColor: '#07070E', borderRadius: '50%', display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8080A0' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#00D4FF', textDecoration: 'none', fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
