'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getUserName, getPartnerId, type Profile } from '@/lib/config'

type Game = { id: string; created_at: string; winner_id: string }
type Message = { id: string; content: string; sender_id: string; created_at: string }

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [latestMessage, setLatestMessage] = useState<Message | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [recettesCount, setRecettesCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: p } = await supabase.from('profiles').select('*')
      setProfiles(p || [])
      const { data: g } = await supabase.from('chi_fou_mi').select('*').order('created_at', { ascending: false })
      setGames(g || [])
      const { data: m } = await supabase.from('messages').select('*')
        .eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(1)
      setLatestMessage(m?.[0] || null)
      const { count } = await supabase.from('recettes').select('*', { count: 'exact', head: true })
      setRecettesCount(count || 0)
    }
    init()
  }, [])

  async function sendMessage() {
    if (!newMessage.trim() || !user) return
    const partnerId = getPartnerId(profiles, user.id)
    if (!partnerId) return
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: newMessage.trim()
    })
    setNewMessage('')
    setShowMessageInput(false)
  }

  function getScore(userId: string) {
    return games.filter(g => g.winner_id === userId).length
  }

  function getCurrentStreak() {
    if (games.length === 0) return { id: null, count: 0 }
    const sorted = [...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const lastWinner = sorted[0].winner_id
    let count = 0
    for (const game of sorted) {
      if (game.winner_id === lastWinner) count++
      else break
    }
    return { id: lastWinner, count }
  }

  const partnerId = user ? getPartnerId(profiles, user.id) : null
  const myScore = user ? getScore(user.id) : 0
  const partnerScore = partnerId ? getScore(partnerId) : 0
  const leader = myScore > partnerScore ? user?.id : myScore < partnerScore ? partnerId : null
  const streak = getCurrentStreak()
  const myProfile = profiles.find(p => p.id === user?.id)
  const partnerProfile = profiles.find(p => p.id === partnerId)

  const greetings = ['Bonjour', 'Coucou', 'Salut', 'Hey']
  const greeting = greetings[new Date().getHours() < 12 ? 0 : new Date().getHours() < 18 ? 2 : 1]

  return (
    <main style={{ padding: '1.25rem', maxWidth: '500px', margin: '0 auto', paddingBottom: 'calc(var(--navbar-height) + 1rem)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '600' }}>
            {greeting} {myProfile?.username || ''} 👋
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => router.push('/profil')} style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'var(--accent)', border: 'none',
          color: 'white', fontSize: '1.1rem', fontWeight: '600'
        }}>
          {myProfile?.username?.[0]?.toUpperCase() || '?'}
        </button>
      </div>

      {/* Message du partenaire */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem', marginBottom: '1rem',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
            💌 Message de {partnerProfile?.username || 'ton partenaire'}
          </p>
          <button onClick={() => setShowMessageInput(!showMessageInput)} style={{
            background: 'var(--accent-subtle)', border: 'none', borderRadius: '20px',
            padding: '4px 12px', fontSize: '0.75rem', color: 'var(--accent)',
            fontWeight: '500', cursor: 'pointer'
          }}>
            Répondre ✏️
          </button>
        </div>
        {latestMessage ? (
          <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{latestMessage.content}"
          </p>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Aucun message pour l'instant... 🌸
          </p>
        )}
        {showMessageInput && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '8px' }}>
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Envoie un message doux..."
              style={{
                flex: 1, padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)', background: 'var(--bg)',
                fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none'
              }}
            />
            <button onClick={sendMessage} style={{
              padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent)', color: 'white',
              fontWeight: '600', fontSize: '0.9rem'
            }}>
              ✉️
            </button>
          </div>
        )}
      </div>

      {/* Widget Chi Fou Mi */}
      <button onClick={() => router.push('/chi-fou-mi')} style={{
        width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem', marginBottom: '1rem', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', textAlign: 'left', cursor: 'pointer'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>🤜 Chi Fou Mi</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Voir →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {user && partnerId && [user.id, partnerId].map(id => {
            const score = getScore(id)
            const isLeader = leader === id
            return (
              <div key={id} style={{
                background: isLeader ? 'var(--accent-subtle)' : 'var(--bg)',
                borderRadius: 'var(--radius-sm)', padding: '0.75rem',
                border: isLeader ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem' }}>{isLeader ? '👑' : '💩'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>{score}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getUserName(profiles, id)}</div>
              </div>
            )
          })}
        </div>
        {streak.count > 1 && streak.id && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            🔥 {getUserName(profiles, streak.id)} sur une série de {streak.count} !
          </p>
        )}
      </button>

      {/* Widget Recettes */}
      <button onClick={() => router.push('/recettes')} style={{
        width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem', marginBottom: '1rem', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', textAlign: 'left', cursor: 'pointer'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>🍳 Nos recettes</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Voir →</span>
        </div>
        <p style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent)' }}>{recettesCount}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {recettesCount === 0 ? 'Aucune recette encore — ajoutez-en une !' : `recette${recettesCount > 1 ? 's' : ''} sauvegardée${recettesCount > 1 ? 's' : ''}`}
        </p>
      </button>

      {/* Widgets à venir */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { icon: '🎯', label: 'Bucket list', href: '/bucket-list' },
          { icon: '🎬', label: 'Films & Jeux', href: '/films' },
          { icon: '📅', label: 'Calendrier', href: '/calendrier' },
          { icon: '💭', label: 'Questions', href: '/questions' },
        ].map(w => (
          <div key={w.href} style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            padding: '1rem', border: '1px dashed var(--border)',
            textAlign: 'center', opacity: 0.6
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{w.icon}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{w.label}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Bientôt</p>
          </div>
        ))}
      </div>

    </main>
  )
}