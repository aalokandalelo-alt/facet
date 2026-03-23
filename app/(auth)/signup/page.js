'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07070E' }}>
        <div style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
          position: 'fixed', inset: 0, pointerEvents: 'none',
        }} />
        <div className="card animate-slideUp" style={{ padding: 40, maxWidth: 420, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 20, fontWeight: 700, color: '#F0F0F8', marginBottom: 8 }}>
            Check your email
          </h2>
          <p style={{ color: '#8080A0', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            We've sent a confirmation link to <strong style={{ color: '#F0F0F8' }}>{email}</strong>.
            Click the link in the email to activate your account.
          </p>
          <Link href="/login" className="btn btn-secondary btn-full">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07070E' }}>
      <div style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,255,0.07) 0%, transparent 70%)',
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }} />

      <div className="animate-slideUp" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
            fontSize: 22, fontWeight: 700, color: '#F0F0F8',
            marginBottom: 6, letterSpacing: '-0.02em',
          }}>
            Create your account
          </h1>
          <p style={{ color: '#8080A0', fontSize: 14, marginBottom: 28, marginTop: 0 }}>
            Free to start, no credit card required
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

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                Full name
              </label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
                autoFocus
              />
            </div>

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
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8080A0', marginBottom: 6 }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
                minLength={8}
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
                  Creating account…
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: '#4A4A6A', marginTop: 16, marginBottom: 0, textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <span style={{ color: '#8080A0' }}>Terms of Service</span> and{' '}
            <span style={{ color: '#8080A0' }}>Privacy Policy</span>.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8080A0' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#00D4FF', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
