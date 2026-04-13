import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Workflow } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'developer' })
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        toast.success('Connecté')
        nav('/')
      } else {
        const { error } = await signUp(form.email, form.password, { name: form.name, role: form.role })
        if (error) throw error
        toast.success('Compte créé. Connectez-vous.')
        setMode('signin')
      }
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
          <p className="mt-4 text-white/80 max-w-md">Workflow de validation, Kanban temps réel, modules, sous-tâches & notifications — tout au même endroit.</p>
        </div>
        <div className="text-white/70 text-sm">© {new Date().getFullYear()} Evolink</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md card p-8">
          <h2 className="text-2xl font-semibold">{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h2>
          <p className="text-sm text-slate-500 mb-6">Accédez à votre espace projet.</p>

          {mode === 'signup' && (
            <>
              <label className="label">Nom</label>
              <input className="input mb-3" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <label className="label">Rôle</label>
              <select className="input mb-3" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin (Chef de projet)</option>
                <option value="uiux">UI/UX Designer</option>
                <option value="developer">Développeur</option>
              </select>
            </>
          )}
          <label className="label">Email</label>
          <input type="email" className="input mb-3" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <label className="label">Mot de passe</label>
          <input type="password" className="input mb-5" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />

          <button disabled={busy} className="btn-primary w-full">{busy ? '…' : (mode === 'signin' ? 'Se connecter' : 'Créer le compte')}</button>

          <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-4 text-sm text-brand-600 hover:underline w-full text-center">
            {mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
