import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  const { data, error } = await supabase.from('daily_briefing').select('*').eq('id', 1).maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? { briefing_date: null, content: [] })
}
