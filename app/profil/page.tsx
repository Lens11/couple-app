'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const THEMES = [
  { id: 'terracotta', label: 'Terracotta', color: '#D97706', bg: '#FAFAF7' },
  { id: 'corail', label: 'Corail doux', color: '#F87171', bg: '#FFF5F5' },
  { id: 'menthe', label: 'Menthe', color: '#0D9488', bg: '#F0FDFB' },
  { id: 'pastel', label: 'Pastel', color: '#A855F7', bg: '#FDF4FF' },
  { id: 'sombre', label: 'Sombre', color: '#F97316', bg: '#0F0F0F' },
  { id: 'auto', label: 'Auto (système)', color: '#888', bg: '#F5F5F5' },
]

export default function Profil() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState('terracotta')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setUsername(data.username || ''); setTheme(data.theme || 'terracotta') }
    }
    init()
  }, [])

  async function save() {
    if (!user) return
    await supabase.from('profiles').update({ username, theme }).eq('id', user.id)
    document.documentElement.setAttribute('data-theme', theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main style={{ padding: '1.25rem', maxWidth: '500px', margin: '0 auto', paddingBottom: 'calc(var(--navbar-height) + 1rem)' }}>

      <h1 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '1.5rem' }}>Mon profil</h1>

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: '600'
        }}>
          {username?.[0]?.toUpperCase() || '?'}
        </div>
      </div>

      {/* Nom */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
          Ton prénom
        </label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--bg)',
            fontSize: '1rem', color: 'var(--text-primary)', outline: 'none'
          }}
        />
      </div>

      {/* Thème */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Thème de couleur
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => {
              setTheme(t.id)
              document.documentElement.setAttribute('data-theme', t.id)
            }} style={{
              padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)',
              border: theme === t.id ? `2px solid ${t.color}` : '1px solid var(--border)',
              background: t.bg, cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.color }} />
              <span style={{ fontSize: '0.7rem', color: '#444', fontWeight: theme === t.id ? '600' : '400' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sauvegarder */}
      <button onClick={save} style={{
        width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-sm)',
        border: 'none', background: 'var(--accent)', color: 'white',
        fontWeight: '600', fontSize: '1rem', marginBottom: '0.75rem'
      }}>
        {saved ? '✅ Sauvegardé !' : 'Sauvegarder'}
      </button>

      <button onClick={logout} style={{
        width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)', background: 'transparent',
        color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem'
      }}>
        Se déconnecter
      </button>

    </main>
  )
}