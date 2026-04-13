import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, LayoutGrid, List as ListIcon } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useTasks } from '../hooks/useTasks'
import { useAuth } from '../context/AuthContext'
import KanbanBoard from '../components/tasks/KanbanBoard'
import TaskForm from '../components/tasks/TaskForm'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'

export default function Tasks() {
  const [params] = useSearchParams()
  const moduleParam = params.get('module') || ''
  const projectParam = params.get('project') || ''

  const [filters, setFilters] = useState({
    module_id: moduleParam, status: '', priority: '', assigned_to: ''
  })
  useEffect(() => { setFilters(f => ({ ...f, module_id: moduleParam })) }, [moduleParam])

  const { tasks, loading, reload } = useTasks(filters)
  const { isAdmin } = useAuth()
  const [view, setView] = useState('kanban')
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [modules, setModules] = useState([])

  useEffect(() => {
    supabase.from('users').select('id,name,role').then(({ data }) => setUsers(data || []))
    supabase.from('modules').select('id,name,project_id,project:projects(name)').then(({ data }) => setModules(data || []))
  }, [])

  const filteredTasks = useMemo(() => {
    if (!projectParam) return tasks
    return tasks.filter(t => t.module?.project?.id === projectParam)
  }, [tasks, projectParam])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tâches</h1>
          <p className="text-slate-500">Vue Kanban & Liste avec filtres avancés.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setView('kanban')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'kanban' ? 'bg-brand-600 text-white' : ''}`}><LayoutGrid size={14} /> Kanban</button>
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'list' ? 'bg-brand-600 text-white' : ''}`}><ListIcon size={14} /> Liste</button>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Nouvelle tâche</button>
        </div>
      </div>

      <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="label">Module</label>
          <select className="input" value={filters.module_id} onChange={e => setFilters({ ...filters, module_id: e.target.value })}>
            <option value="">Tous</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.project?.name} / {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tous</option>
            <option value="pending_validation">Pending Validation</option>
            <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="label">Priorité</label>
          <select className="input" value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">Toutes</option><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option>
          </select>
        </div>
        <div>
          <label className="label">Utilisateur</label>
          <select className="input" value={filters.assigned_to} onChange={e => setFilters({ ...filters, assigned_to: e.target.value })}>
            <option value="">Tous</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div>Chargement…</div> : view === 'kanban' ? (
        <KanbanBoard tasks={filteredTasks} reload={reload} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
              <tr>
                <th className="p-3">Tâche</th><th className="p-3">Module</th><th className="p-3">Statut</th>
                <th className="p-3">Priorité</th><th className="p-3">Assigné</th><th className="p-3">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(t => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3"><Link to={`/tasks/${t.id}`} className="font-medium hover:text-brand-600">{t.title}</Link></td>
                  <td className="p-3 text-slate-500">{t.module?.project?.name} / {t.module?.name}</td>
                  <td className="p-3"><span className="badge bg-slate-100 dark:bg-slate-800">{t.status}</span></td>
                  <td className="p-3 capitalize">{t.priority}</td>
                  <td className="p-3">{t.assignee?.name || '—'}</td>
                  <td className="p-3">{t.due_date ? format(new Date(t.due_date), 'dd MMM yyyy') : '—'}</td>
                </tr>
              ))}
              {filteredTasks.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Aucune tâche.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle tâche" size="lg">
        <TaskForm onClose={() => setOpen(false)} onSaved={reload} />
      </Modal>
    </div>
  )
}
