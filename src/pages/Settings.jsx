import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

export default function Settings() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('users').update({ name }).eq('id', profile.id)
    setBusy(false)
    if (error) toast.error(error.message); else { toast.success('Profil mis à jour'); refreshProfile() }
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <form onSubmit={save} className="card p-6 space-y-3">
        <div><label className="label">Email</label><input className="input" disabled value={profile?.email || ''} /></div>
        <div><label className="label">Nom</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Rôle</label><input className="input capitalize" disabled value={profile?.role || ''} /></div>
        <button disabled={busy} className="btn-primary">Enregistrer</button>
      </form>
    </div>
  )
}
