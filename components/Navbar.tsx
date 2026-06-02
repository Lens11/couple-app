'use client'

import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { href: '/dashboard', icon: '🏠', label: 'Accueil' },
  { href: '/chi-fou-mi', icon: '🤜', label: 'Chi Fou Mi' },
  { href: '/recettes', icon: '🍳', label: 'Recettes' },
  { href: '/profil', icon: '👤', label: 'Profil' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/') return null

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--navbar-height)',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '2px',
            background: 'none', border: 'none',
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '0.65rem', fontWeight: active ? '600' : '400',
            transition: 'color 0.2s'
          }}>
            <span style={{ fontSize: '1.3rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}