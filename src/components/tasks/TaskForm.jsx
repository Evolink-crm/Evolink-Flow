import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TaskForm({ initial, onClose, onSaved }) {
  const { user, isAdmin } = useAuth()
  const [modules, setModules] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    module_id: initial?.module_id || '',
    priority: initial?.priority || 'medium',
    assigned_to: initial?.assigned_to || '',
    start_date: initial?.start_date?.slice(0,10) || '',
    due_date: initial?.due_date?.slice(0,10) || '',
    status: initial?.status || 'todo'
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase.from('modules').select('id,name,project:projects(name)').order('name')
      setModules(m || [])
      const { data: u } = await supabase.from('users').select('id,name,email,role').order('name')
      setUsers(u || [])
    })()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null
      }
      if (initial) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const data = {
          ...payload,
          created_by: user.id,
          is_validated: !!isAdmin,
          status: isAdmin ? (payload.status || 'todo') : 'pending_validation',
          badge: isAdmin ? 'admin' : 'team'
        }
        const { error } = await supabase.from('tasks').insert(data)
        if (error) throw error
      }
      toast.success(initial ? 'Tâche mise à jour' : (isAdmin ? 'Tâche créée' : 'Tâche envoyée pour validation'))
      onSaved?.(); onClose?.()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Titre</label><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Module</label>
          <select className="input" required value={form.module_id} onChange={e => setForm({ ...form, module_id: e.target.value })}>
            <option value="">— Choisir —</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.project?.name} / {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priorité</label>
          <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option>
          </select>
        </div>
        {isAdmin && (
          <>
            <div>
              <label className="label">Assigné à</label>
              <select className="input" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">— Personne —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">À faire</option><option value="in_progress">En cours</option><option value="done">Terminée</option>
              </select>
            </div>
          </>
        )}
        <div><label className="label">Date début</label><input type="date" className="input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
        <div><label className="label">Échéance</label><input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
      </div>
      {!isAdmin && !initial && <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-2">Cette tâche sera envoyée à l'admin pour validation avant d'être active.</p>}
      <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>Annuler</button><button disabled={busy} className="btn-primary">{busy ? '…' : 'Enregistrer'}</button></div>
    </form>
  )
}
