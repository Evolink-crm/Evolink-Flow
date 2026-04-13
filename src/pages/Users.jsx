import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@supabase/supabase-js'
import { UserPlus, Shield, Trash2 } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'

// Client secondaire SANS persistance : utilisé pour créer un compte
// sans écraser la session de l'admin connecté.
const adminSignupClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-brand-100 text-brand-700' },
  { value: 'uiux', label: 'UI/UX', color: 'bg-purple-100 text-purple-700' },
  { value: 'developer', label: 'Développeur', color: 'bg-emerald-100 text-emerald-700' }
]

export default function Users() {
  const { isAdmin, profile } = useAuth()
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'developer' })

  const load = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }
  useEffect(() => { load() }, [])

  if (!isAdmin) return <div className="card p-6">Accès réservé aux administrateurs.</div>

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data, error } = await adminSignupClient.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, role: form.role } }
      })
      if (error) throw error
      // Créer / forcer la ligne profil avec le bon rôle
      if (data.user) {
        const { error: upErr } = await supabase.from('users').upsert({
          id: data.user.id,
          email: form.email,
          name: form.name,
          role: form.role
        }, { onConflict: 'id' })
        if (upErr) throw upErr
      }
      toast.success(`Compte créé pour ${form.email}`)
      setForm({ name: '', email: '', password: '', role: 'developer' })
      setOpen(false)
      load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const updateRole = async (u, role) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', u.id)
    if (error) toast.error(error.message); else { toast.success('Rôle mis à jour'); load() }
  }

  const removeProfile = async (u) => {
    if (u.id === profile.id) return toast.error('Impossible de vous supprimer vous-même')
    if (!confirm(`Retirer ${u.name} de l'application ?\n(Le compte auth reste, mais le profil et accès sont supprimés)`)) return
    const { error } = await supabase.from('users').delete().eq('id', u.id)
    if (error) toast.error(error.message); else { toast.success('Profil supprimé'); load() }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-slate-500">Créez et gérez les membres de l'équipe ({users.length}).</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><UserPlus size={16} /> Ajouter un utilisateur</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Rôle</th>
              <th className="p-3">Créé le</th><th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = ROLES.find(r => r.value === u.role)
              return (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold">{u.name?.[0]?.toUpperCase()}</div>
                      <span className="font-medium">{u.name}</span>
                      {u.id === profile.id && <span className="text-xs text-slate-400">(vous)</span>}
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{u.email}</td>
                  <td className="p-3">
                    <select
                      className={`badge ${role?.color || 'bg-slate-100'} cursor-pointer`}
                      value={u.role}
                      disabled={u.id === profile.id}
                      onChange={e => updateRole(u, e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button onClick={() => removeProfile(u)} disabled={u.id === profile.id}
                      className="btn-ghost p-2 text-red-600 disabled:opacity-30"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un utilisateur">
        <form onSubmit={create} className="space-y-3">
          <div><label className="label">Nom complet</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Mot de passe initial</label><input type="text" className="input" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">L'utilisateur pourra le changer après connexion.</p>
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Annuler</button><button disabled={busy} className="btn-primary"><Shield size={14} /> {busy ? '…' : 'Créer le compte'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
