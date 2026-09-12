import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isValidSessionToken } from '@/lib/session'

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  return isValidSessionToken(token)
}

export async function GET() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const isAuthed = await checkAuth()
  if (!isAuthed) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const updates = await request.json()

  const { error } = await supabaseAdmin
    .from('site_settings')
    .update(updates)
    .eq('id', 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}