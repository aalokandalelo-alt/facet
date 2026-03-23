import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/profile — deletes the authenticated user's account
export async function DELETE(request) {
  // CSRF protection: only allow requests from our own app
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!origin || !appUrl || origin !== appUrl) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to delete the auth user (which cascades via RLS)
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
