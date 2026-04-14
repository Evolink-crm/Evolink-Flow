import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Workflow, Shield, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { isLogged, signIn, signInTeam } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('team') // 'team' (username) | 'admin' (email)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [busy, setBusy] = useState(false)

  if (isLogged) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'admin') {
        const { error } = await signIn(form.identifier, form.password)
        if (error) throw error
      } else {
        const { error } = await signInTeam(form.identifier, form.password)
        if (error) throw error
      }
      toast.success('Connecté')
      nav('/')
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center"><Workflow /></div>
          <span className="font-semibold text-lg">Evolink Flow</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Pilotez vos projets ERP en toute fluidité.</h1>
          <p className="mt-4 text-white/80 max-w-md">Workflow de validation, Kanban temps réel, modules, sous-tâches & notifications.</p>
        </div>
        <div className="text-white/70 text-sm">© {new Date().getFullYear()} Evolink</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md card p-8">
          <h2 className="text-2xl font-semibold">Connexion</h2>
          <p className="text-sm text-slate-500 mb-5">Accédez à votre espace projet.</p>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-5">
            <button type="button" onClick={() => setMode('team')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${mode === 'team' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500'}`}>
              <Users size={14} /> Équipe
            </button>
            <button type="button" onClick={() => setMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${mode === 'admin' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500'}`}>
              <Shield size={14} /> Admin
            </button>
          </div>

          <label className="label">{mode === 'admin' ? 'Email' : "Nom d'utilisateur"}</label>
          <input
            type={mode === 'admin' ? 'email' : 'text'}
            className="input mb-3" required
            value={form.identifier}
            onChange={e => setForm({ ...form, identifier: e.target.value })}
            placeholder={mode === 'admin' ? 'admin@evolink.io' : 'john.doe'} />

          <label className="label">Mot de passe</label>
          <input type="password" className="input mb-5" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required minLength={4} />

          <button disabled={busy} className="btn-primary w-full">{busy ? '…' : 'Se connecter'}</button>

          <p className="text-xs text-slate-500 text-center mt-4">
            {mode === 'admin'
              ? 'Connexion sécurisée via Supabase Auth.'
              : 'Votre compte équipe a été créé par un administrateur.'}
          </p>
        </form>
      </div>
    </div>
  )
}
