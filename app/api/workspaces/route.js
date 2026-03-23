import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/workspaces — create a new workspace + owner membership + default pillars
// Uses admin client for DB writes so RLS bypass is intentional and controlled.
// Auth is validated server-side via the session cookie before any writes.
export async function POST(request) {
  // 1. Authenticate the caller
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse and validate input
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const slug = (body.slug || '').trim()

  if (!name) return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'Workspace slug is required.' }, { status: 400 })
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug may only contain lowercase letters, numbers, and hyphens.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Ensure the user has a profile row (FK requirement for owner_id)
  const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!profile) {
    // Auto-create the profile if the trigger somehow missed it
    await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
    })
  }

  // 4. Check slug uniqueness
  const { data: existing } = await admin.from('workspaces').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'That URL is already taken. Try a different name or slug.' }, { status: 409 })
  }

  // 5. Insert the workspace
  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({ name, slug, owner_id: user.id })
    .select()
    .single()

  if (wsError) {
    if (wsError.code === '23505') {
      return NextResponse.json({ error: 'That URL is already taken. Try a different name or slug.' }, { status: 409 })
    }
    console.error('Workspace insert error:', wsError)
    return NextResponse.json({ error: 'Failed to create workspace. Please try again.' }, { status: 500 })
  }

  // 6. Add owner as workspace member
  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    // Roll back the workspace to keep data consistent
    await admin.from('workspaces').delete().eq('id', workspace.id)
    console.error('Member insert error:', memberError)
    return NextResponse.json({ error: 'Failed to set up workspace membership. Please try again.' }, { status: 500 })
  }

  // 7. Create default content pillars (non-critical)
  const defaultPillars = [
    { name: 'Educational',        color: '#3B82F6', sort_order: 0 },
    { name: 'Promotional',        color: '#F59E0B', sort_order: 1 },
    { name: 'Behind the Scenes',  color: '#8B5CF6', sort_order: 2 },
    { name: 'Repurposed',         color: '#10B981', sort_order: 3 },
    { name: 'Trending / Reactive',color: '#EF4444', sort_order: 4 },
    { name: 'UGC',                color: '#F97316', sort_order: 5 },
    { name: 'Entertainment',      color: '#EC4899', sort_order: 6 },
  ]

  const { error: pillarsError } = await admin.from('workspace_pillars').insert(
    defaultPillars.map(p => ({ ...p, workspace_id: workspace.id, is_default: true }))
  )
  if (pillarsError) {
    console.warn('Default pillars failed — workspace still usable:', pillarsError.message)
  }

  return NextResponse.json({ workspace }, { status: 201 })
}
