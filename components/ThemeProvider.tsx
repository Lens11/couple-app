'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function loadTheme() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()
      const theme = data?.theme || 'terracotta'
      document.documentElement.setAttribute('data-theme', theme)
    }
    loadTheme()
  }, [])

  return <>{children}</>
}