import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()

  // Verify session — middleware also does this, but double-check server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || userError) {
    redirect('/login')
  }

  // Fetch workspaces the user belongs to
  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('role, workspaces(id, name, slug)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const workspaces = (memberRows || []).map(row => ({
    ...row.workspaces,
    role: row.role,
  })).filter(Boolean)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#07070E' }}>
      <Sidebar user={user} workspaces={workspaces} />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
