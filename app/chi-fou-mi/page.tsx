'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getUserName, getPartnerId, type Profile } from '@/lib/config'

type Game = {
  id: string
  created_at: string
  winner_id: string
}

type EditingGame = {
  id: string
  winner_id: string
  created_at: string
}

export default function ChiFouMi() {
  const [user, setUser] = useState<any>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingGame | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: profilesData } = await supabase.from('profiles').select('*')
      setProfiles(profilesData || [])
      await fetchGames()
      setLoading(false)
    }
    init()
  }, [])

  async function fetchGames() {
    const { data } = await supabase
      .from('chi_fou_mi')
      .select('*')
      .order('created_at', { ascending: false })
    setGames(data || [])
  }

  async function addPoint(winnerId: string) {
    setError(null)
    const today = new Date()
    today.setHours(23, 59, 59)
    const picked = new Date(selectedDate + 'T12:00:00')
    if (picked > today) {
      setError('Impossible d\'enregistrer une partie dans le futur !')
      return
    }
    const alreadyExists = games.some(g =>
      new Date(g.created_at).toLocaleDateString('fr-FR') ===
      picked.toLocaleDateString('fr-FR')
    )
    if (alreadyExists) {
      setError('Il y a déjà une partie enregistrée pour cette date !')
      return
    }
    const { error } = await supabase.from('chi_fou_mi').insert({
      winner_id: winnerId,
      created_at: picked.toISOString()
    })
    if (error) { setError('Erreur : ' + error.message); return }
    await fetchGames()
  }

  async function deleteGame(id: string) {
    const { error } = await supabase.from('chi_fou_mi').delete().eq('id', id)
    if (error) { setError('Erreur suppression : ' + error.message); return }
    setEditing(null)
    await fetchGames()
  }

  async function saveEdit() {
    if (!editing) return
    const { error } = await supabase
      .from('chi_fou_mi')
      .update({
        winner_id: editing.winner_id,
        created_at: new Date(editing.created_at + 'T12:00:00').toISOString()
      })
      .eq('id', editing.id)
    if (error) { setError('Erreur modification : ' + error.message); return }
    setEditing(null)
    await fetchGames()
  }

  function getScore(userId: string) {
    return games.filter(g => g.winner_id === userId).length
  }

  function getCurrentStreak() {
    if (games.length === 0) return { id: null, count: 0 }
    const sorted = [...games].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastWinner = sorted[0].winner_id
    let count = 0
    for (const game of sorted) {
      if (game.winner_id === lastWinner) count++
      else break
    }
    return { id: lastWinner, count }
  }

  function getLongestStreak() {
    if (games.length === 0) return { id: null, count: 0 }
    const sorted = [...games].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    let best = { id: null as string | null, count: 0 }
    let current = { id: sorted[0].winner_id, count: 1 }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].winner_id === current.id) {
        current.count++
      } else {
        if (current.count > best.count) best = { ...current }
        current = { id: sorted[i].winner_id, count: 1 }
      }
    }
    if (current.count > best.count) best = { ...current }
    return best
  }

  function getMonthWinner(monthGames: Game[]) {
    if (monthGames.length === 0) return null
    const scores: Record<string, number> = {}
    monthGames.forEach(g => { scores[g.winner_id] = (scores[g.winner_id] || 0) + 1 })
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  }

  function getGamesByMonth() {
    const months: Record<string, Game[]> = {}
    games.forEach(game => {
      const date = new Date(game.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = []
      months[key].push(game)
    })
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]))
  }

  function formatMonthKey(key: string) {
    const [year, month] = key.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  const partnerId = user ? getPartnerId(profiles, user.id) : null
  const myScore = user ? getScore(user.id) : 0
  const partnerScore = partnerId ? getScore(partnerId) : 0
  const total = myScore + partnerScore
  const allTimeLeader = myScore > partnerScore ? user?.id : myScore < partnerScore ? partnerId : null
  const currentStreak = getCurrentStreak()
  const longestStreak = getLongestStreak()
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const currentMonthGames = games.filter(g => {
    const d = new Date(g.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return key === currentMonthKey
  })
  const monthWinner = getMonthWinner(currentMonthGames)
  const gamesByMonth = getGamesByMonth()

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Chargement...</div>

  return (
    <main style={{ padding: '1.5rem', maxWidth: '500px', margin: '0 auto' }}>

      <button onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', padding: 0, cursor: 'pointer' }}>
        ← Retour
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>Chi Fou Mi 🤜</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Qui domine le couple ?</p>

      {/* Mini dashboard stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>👑 Gagnant du mois</p>
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent)' }}>
            {monthWinner ? getUserName(profiles, monthWinner) : '—'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {currentMonthGames.length} partie{currentMonthGames.length > 1 ? 's' : ''} ce mois
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🏆 Gagnant all-time</p>
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent)' }}>
            {allTimeLeader ? getUserName(profiles, allTimeLeader) : 'Égalité'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {total} parties au total
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🔥 Streak actuelle</p>
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent)' }}>
            {currentStreak.count > 0 ? `${currentStreak.count}x ${getUserName(profiles, currentStreak.id!)}` : '—'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            consécutives
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>⚡ Record streak</p>
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent)' }}>
            {longestStreak.count > 0 ? `${longestStreak.count}x ${getUserName(profiles, longestStreak.id!)}` : '—'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            all-time
          </p>
        </div>
      </div>

      {/* Scores globaux */}
      {total > 0 && user && partnerId && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Scores globaux</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[user.id, partnerId].map((id, i) => {
              const score = getScore(id)
              const pct = total > 0 ? (score / total) * 100 : 50
              const isLeader = allTimeLeader === id
              return (
                <div key={id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                      {isLeader ? '👑' : '💩'} {getUserName(profiles, id)}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {score} pts ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: i === 0 ? 'var(--accent)' : '#FCD34D',
                      borderRadius: '99px', transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dernières parties */}
      {games.slice(0, 3).length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Dernières parties</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {games.slice(0, 3).map(game => (
              <p key={game.id} style={{ fontSize: '0.9rem', margin: 0 }}>
                🏆 <strong>{getUserName(profiles, game.winner_id)}</strong> a gagné le{' '}
                {new Date(game.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter une partie */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Ajouter une partie</p>
        <input
          type="date"
          value={selectedDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => { setSelectedDate(e.target.value); setError(null) }}
          style={{
            width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--bg)',
            fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)'
          }}
        />
        {error && (
          <p style={{ color: '#DC2626', fontSize: '0.8rem', background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', border: '1px solid #FECACA' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {user && partnerId && [user.id, partnerId].map((id, i) => (
            <button key={id} onClick={() => addPoint(id)} style={{
              padding: '0.8rem', borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--accent)',
              background: i === 0 ? 'var(--accent)' : 'transparent',
              color: i === 0 ? 'white' : 'var(--accent)',
              fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
            }}>
              {getUserName(profiles, id)} gagne 🏆
            </button>
          ))}
        </div>
      </div>

      {/* Bouton historique */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        style={{
          width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer',
          marginBottom: showHistory ? '1rem' : '0'
        }}>
        {showHistory ? '▲ Masquer l\'historique' : '▼ Voir l\'historique complet'}
      </button>

      {/* Historique par mois */}
      {showHistory && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {gamesByMonth.map(([monthKey, monthGames]) => {
            const winner = getMonthWinner(monthGames)
            const myMonthScore = user ? monthGames.filter(g => g.winner_id === user.id).length : 0
            const partnerMonthScore = partnerId ? monthGames.filter(g => g.winner_id === partnerId).length : 0
            return (
              <div key={monthKey} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {/* Header mois */}
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize' }}>
                    {formatMonthKey(monthKey)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {winner ? `👑 ${getUserName(profiles, winner)}` : 'Égalité'} — {user ? getUserName(profiles, user.id) : ''} {myMonthScore} / {partnerMonthScore} {partnerId ? getUserName(profiles, partnerId) : ''}
                  </span>
                </div>
                {/* Parties du mois */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {monthGames.map(game => (
                    <div key={game.id}>
                      {editing?.id === game.id ? (
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg)' }}>
                          <input
                            type="date"
                            value={editing.created_at.split('T')[0]}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => setEditing({ ...editing, created_at: e.target.value })}
                            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {user && partnerId && [user.id, partnerId].map(id => (
                              <button key={id} onClick={() => setEditing({ ...editing, winner_id: id })} style={{
                                flex: 1, padding: '5px', borderRadius: '6px',
                                border: '1.5px solid var(--accent)',
                                background: editing.winner_id === id ? 'var(--accent)' : 'transparent',
                                color: editing.winner_id === id ? 'white' : 'var(--accent)',
                                fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                              }}>
                                {getUserName(profiles, id)}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={saveEdit} style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                              Sauvegarder
                            </button>
                            <button onClick={() => deleteGame(game.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#DC2626', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>
                              🗑
                            </button>
                            <button onClick={() => setEditing(null)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {new Date(game.created_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                            🏆 {getUserName(profiles, game.winner_id)}
                          </span>
                          <button onClick={() => setEditing({
                            id: game.id,
                            winner_id: game.winner_id,
                            created_at: game.created_at.split('T')[0]
                          })} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0 4px'
                          }}>✏️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </main>
  )
}