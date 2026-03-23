'use client'

import Link from 'next/link'

export default function WorkspaceNavButtons() {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#8080A0', textDecoration: 'none', fontSize: 13,
          border: '1px solid #1E1E35', borderRadius: 10,
          padding: '9px 16px', transition: 'all 0.15s',
          background: '#0F0F1A',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
          e.currentTarget.style.color = '#F0F0F8'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#1E1E35'
          e.currentTarget.style.color = '#8080A0'
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        All workspaces
      </Link>
      <Link href="/dashboard/new" className="btn btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
        New workspace
      </Link>
    </div>
  )
}
