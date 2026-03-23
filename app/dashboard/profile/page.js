'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      setFullName(user.user_metadata?.full_name || '')
    })
  }, [router])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    })

    if (!error) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    }

    setProfileMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Profile updated.' })
    setSavingProfile(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setPasswordMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Password updated successfully.' }
    )
    if (!error) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/profile', { method: 'DELETE' })
    if (res.ok) {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      setDeleting(false)
      alert('Failed to delete account. Please try again.')
    }
  }

  if (!user) return null

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const MsgBox = ({ msg }) => msg ? (
    <div style={{
      background: msg.type === 'error' ? 'rgba(255,64,96,0.1)' : 'rgba(0,200,150,0.1)',
      border: `1px solid ${msg.type === 'error' ? 'rgba(255,64,96,0.25)' : 'rgba(0,200,150,0.25)'}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 13,
      color: msg.type === 'error' ? '#FF4060' : '#00C896',
      marginTop: 12,
    }}>
      {msg.text}
    </div>
  ) : null

  return (
    <div style={{ padding: '40px 48px', maxWidth: 600 }}>
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
        Back to workspaces
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00D4FF, #7B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#07070E',
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 24, fontWeight: 800, color: '#F0F0F8',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            Profile
          </h1>
          <p style={{ color: '#8080A0', fontSize: 14, margin: '2px 0 0' }}>{user.email}</p>
        </div>
      </div>

      {/* Profile section */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F8', marginBottom: 20, marginTop: 0 }}>
          Display name
        </h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#8080A0', marginBottom: 6 }}>
              Full name
            </label>
            <input
              className="input"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <MsgBox msg={profileMsg} />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={savingProfile}
              style={{ marginLeft: 'auto' }}
            >
              {savingProfile ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </div>

      {/* Password section */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F8', marginBottom: 20, marginTop: 0 }}>
          Change password
        </h2>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#8080A0', marginBottom: 6 }}>
              New password
            </label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#8080A0', marginBottom: 6 }}>
              Confirm new password
            </label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {passwordMsg && <MsgBox msg={passwordMsg} />}
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={savingPassword || !newPassword || !confirmPassword}
              style={{ marginLeft: 'auto' }}
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: 28, borderColor: 'rgba(255,64,96,0.15)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#FF4060', marginBottom: 8, marginTop: 0 }}>
          Danger zone
        </h2>
        <p style={{ fontSize: 13, color: '#8080A0', marginBottom: 16 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,64,96,0.08)', border: '1px solid rgba(255,64,96,0.2)',
            borderRadius: 10, padding: 16,
          }}>
            <p style={{ fontSize: 14, color: '#F0F0F8', marginBottom: 16, marginTop: 0 }}>
              Are you sure? This will permanently delete your account and remove you from all workspaces.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
