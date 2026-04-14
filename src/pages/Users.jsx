import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, Shield, Trash2, KeyRound } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'

const ROLES = [
  { value: 'uiux', label: 'UI/UX', color: 'bg-purple-100 text-purple-700' },
  { value: 'developer', label: 'Développeur', color: 'bg-emerald-100 text-emerald-700' }
]

export default function Users() {
  const { isAdmin, profile } = useAuth()
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [pwdUser, setPwdUser] = useState(null)
  const [newPwd, setNewPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', role: 'developer' })

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
      const { data, error } = await supabase.rpc('create_team_user', {
        p_username: form.username,
        p_password: form.password,
        p_name: form.name,
        p_email: form.email || `${form.username}@evolink.local`,
        p_role: form.role
      })
      if (error) throw error
      toast.success(`Compte créé : ${form.username}`)
      setForm({ username: '', password: '', name: '', email: '', role: 'developer' })
      setOpen(false); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPwd.length < 4) return toast.error('Mot de passe trop court (min 4)')
    setBusy(true)
    const { error } = await supabase.rpc('set_team_user_password', {
      p_user_id: pwdUser.id, p_password: newPwd
    })
    setBusy(false)
    if (error) toast.error(error.message)
    else { toast.success('Mot de passe mis à jour'); setPwdUser(null); setNewPwd('') }
  }

  const updateRole = async (u, role) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', u.id)
    if (error) toast.error(error.message); else { toast.success('Rôle mis à jour'); load() }
  }

  const removeUser = async (u) => {
    if (u.id === profile.id) return toast.error('Impossible de vous supprimer vous-même')
    if (!confirm(`Supprimer ${u.name} ?`)) return
    const { error } = await supabase.from('users').delete().eq('id', u.id)
    if (error) toast.error(error.message); else { toast.success('Supprimé'); load() }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-slate-500">Créez des membres avec username/password ({users.length}).</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><UserPlus size={16} /> Ajouter un membre</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="p-3">Nom</th><th className="p-3">Username</th><th className="p-3">Rôle</th>
              <th className="p-3">Type</th><th className="p-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold">{u.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                    {u.id === profile.id && <span className="text-xs text-slate-400">(vous)</span>}
                  </div>
                </td>
                <td className="p-3 text-slate-500 font-mono text-xs">{u.username || '—'}</td>
                <td className="p-3">
                  {u.role === 'admin' ? (
                    <span className="badge bg-brand-100 text-brand-700"><Shield size={10} /> Admin</span>
                  ) : (
                    <select className="input py-1 text-xs" value={u.role}
                      disabled={u.id === profile.id}
                      onChange={e => updateRole(u, e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {u.is_auth_user ? '🔐 Supabase Auth' : '👤 Username/Password'}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {!u.is_auth_user && (
                      <button onClick={() => setPwdUser(u)} className="btn-ghost p-2" title="Changer mot de passe"><KeyRound size={14} /></button>
                    )}
                    <button onClick={() => removeUser(u)} disabled={u.id === profile.id}
                      className="btn-ghost p-2 text-red-600 disabled:opacity-30" title="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal création */}
      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un membre">
        <form onSubmit={create} className="space-y-3">
          <div><label className="label">Nom complet</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="label">Username</label>
            <input className="input" required pattern="[a-zA-Z0-9._-]+"
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })}
              placeholder="john.doe" />
            <p className="text-xs text-slate-500 mt-1">Lettres, chiffres, . _ - uniquement</p>
          </div>
          <div><label className="label">Email (optionnel)</label><input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={`${form.username || 'user'}@evolink.local`} /></div>
          <div><label className="label">Mot de passe</label><input type="text" className="input" required minLength={4} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Annuler</button><button disabled={busy} className="btn-primary">{busy ? '…' : 'Créer le compte'}</button></div>
        </form>
      </Modal>

      {/* Modal changement mot de passe */}
      <Modal open={!!pwdUser} onClose={() => { setPwdUser(null); setNewPwd('') }} title={`Changer mot de passe — ${pwdUser?.name}`}>
        <form onSubmit={changePassword} className="space-y-3">
          <div><label className="label">Nouveau mot de passe</label><input type="text" className="input" required minLength={4} value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => { setPwdUser(null); setNewPwd('') }}>Annuler</button><button disabled={busy} className="btn-primary">Mettre à jour</button></div>
        </form>
      </Modal>
    </div>
  )
}
