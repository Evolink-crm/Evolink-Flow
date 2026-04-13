import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, X, ShieldCheck, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export default function ValidationCenter() {
  const { isAdmin } = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])

  const load = async () => {
    const { data } = await supabase.from('tasks')
      .select('*, module:modules(name,project:projects(name)), creator:created_by(id,name,role)')
      .eq('is_validated', false).eq('status', 'pending_validation')
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }
  useEffect(() => {
    load()
    supabase.from('users').select('id,name,role').then(({ data }) => setUsers(data || []))
    const ch = supabase.channel('validation').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  if (!isAdmin) return <div className="card p-6">Accès réservé aux administrateurs.</div>

  const validate = async (t, assignTo) => {
    const patch = { is_validated: true, status: 'todo', badge: 'team' }
    if (assignTo) patch.assigned_to = assignTo
    const { error } = await supabase.from('tasks').update(patch).eq('id', t.id)
    if (error) toast.error(error.message); else toast.success('Tâche validée')
  }
  const reject = async (t) => {
    if (!confirm(`Refuser et supprimer "${t.title}" ?`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', t.id)
    if (error) toast.error(error.message); else toast.success('Tâche refusée')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 grid place-items-center"><ShieldCheck /></div>
        <div>
          <h1 className="text-2xl font-semibold">Validation Center</h1>
          <p className="text-slate-500">Tâches soumises par l'équipe en attente de validation ({tasks.length}).</p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link to={`/tasks/${t.id}`} className="font-semibold hover:text-brand-600">{t.title}</Link>
                <div className="text-xs text-slate-500 mt-1">{t.module?.project?.name} / {t.module?.name} • Créée par <strong>{t.creator?.name}</strong> ({t.creator?.role}) • {format(new Date(t.created_at), 'dd MMM HH:mm')}</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{t.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="input min-w-[160px]" defaultValue="" onChange={e => e.target.value && validate(t, e.target.value)}>
                  <option value="">Assigner & valider</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button onClick={() => validate(t)} className="btn-primary"><Check size={14} /> Valider</button>
                <button onClick={() => reject(t)} className="btn-outline text-red-600"><X size={14} /> Refuser</button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <div className="card p-10 text-center text-slate-500">Tout est à jour ✨</div>}
      </div>
    </div>
  )
}
