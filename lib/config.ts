export type Profile = {
  id: string
  username: string
}

export function getUserName(profiles: Profile[], id: string): string {
  return profiles.find(p => p.id === id)?.username || 'Inconnu'
}

export function getPartnerId(profiles: Profile[], myId: string): string | null {
  return profiles.find(p => p.id !== myId)?.id || null
}