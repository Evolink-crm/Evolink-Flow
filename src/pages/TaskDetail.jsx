import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronRight, Plus, Trash2, Send, Pencil, Check, X, Trash } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import TaskForm from '../components/tasks/TaskForm'

export default function TaskDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user, isAdmin, profile } = useAuth()
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [newComment, setNewComment] = useState('')
  const [newSub, setNewSub] = useState('')
  const [edit, setEdit] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('tasks').select(`
      *, module:modules(id,name,project:projects(id,name)),
      assignee:assigned_to(id,name,email,role),
      creator:created_by(id,name,email,role)`).eq('id', id).single()
    setTask(data)
    const { data: c } = await supabase.from('comments').select('*, author:created_by(id,name,role)').eq('task_id', id).order('created_at')
    setComments(c || [])
    const { data: s } = await supabase.from('subtasks').select('*').eq('task_id', id).order('created_at')
    setSubtasks(s || [])
  }
  useEffect(() => { load() }, [id])

  useEffect(() => {
    const ch = supabase.channel(`task-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks', filter: `task_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  if (!task) return <div>Chargement…</div>

  const addComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const { error } = await supabase.from('comments').insert({ task_id: id, content: newComment, created_by: user.id })
    if (error) toast.error(error.message); else setNewComment('')
  }
  const addSubtask = async (e) => {
    e.preventDefault()
    if (!newSub.trim()) return
    const { error } = await supabase.from('subtasks').insert({ task_id: id, title: newSub, completed: false })
    if (error) toast.error(error.message); else setNewSub('')
  }
  const toggleSub = async (s) => {
    await supabase.from('subtasks').update({ completed: !s.completed }).eq('id', s.id)
  }
  const removeSub = async (s) => { await supabase.from('subtasks').delete().eq('id', s.id) }
  const validate = async () => {
    await supabase.from('tasks').update({ is_validated: true, status: 'todo', badge: 'team' }).eq('id', id)
    toast.success('Tâche validée')
  }
  const reject = async () => {
    if (!confirm('Refuser et supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', id); toast.success('Tâche refusée'); nav('/tasks')
  }
  const deleteTask = async () => {
    if (!confirm(`Supprimer définitivement la tâche "${task.title}" ?\nCette action est irréversible (sous-tâches et commentaires seront supprimés).`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Tâche supprimée'); nav('/tasks')
  }

  const canEdit = isAdmin || (task.created_by === user.id && !task.is_validated)

  return (
    <div className="space-y-5">
      <div className="flex items-center text-sm text-slate-500">
        <Link to="/tasks" className="hover:text-brand-600">Tâches</Link>
        <ChevronRight size={14} className="mx-1" />
        <span className="text-slate-700 dark:text-slate-300 truncate">{task.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold">{task.title}</h1>
              <div className="flex gap-2">
                {task.status === 'pending_validation' && isAdmin && (
                  <>
                    <button onClick={validate} className="btn-primary"><Check size={14} /> Valider</button>
                    <button onClick={reject} className="btn-outline text-red-600"><X size={14} /> Refuser</button>
                  </>
                )}
                {canEdit && <button onClick={() => setEdit(true)} className="btn-outline"><Pencil size={14} /> Modifier</button>}
                {isAdmin && <button onClick={deleteTask} className="btn-outline text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash size={14} /> Supprimer</button>}
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap">{task.description || 'Aucune description.'}</p>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-3">Sous-tâches ({subtasks.filter(s => s.completed).length}/{subtasks.length})</h3>
            <div className="space-y-2 mb-3">
              {subtasks.map(s => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <input type="checkbox" checked={s.completed} onChange={() => toggleSub(s)} className="w-4 h-4 rounded" />
                  <span className={`flex-1 text-sm ${s.completed ? 'line-through text-slate-400' : ''}`}>{s.title}</span>
                  <button onClick={() => removeSub(s)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <form onSubmit={addSubtask} className="flex gap-2">
              <input className="input" placeholder="Ajouter une sous-tâche…" value={newSub} onChange={e => setNewSub(e.target.value)} />
              <button className="btn-primary"><Plus size={14} /></button>
            </form>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-3">Commentaires ({comments.length})</h3>
            <div className="space-y-3 mb-3 max-h-80 overflow-auto">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500 text-white grid place-items-center text-xs">{c.author?.name?.[0] || 'U'}</div>
                  <div className="flex-1">
                    <div className="text-sm"><span className="font-medium">{c.author?.name}</span> <span className="text-xs text-slate-400 ml-2">{format(new Date(c.created_at), 'dd MMM HH:mm')}</span></div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">{c.content}</div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <div className="text-sm text-slate-500">Aucun commentaire.</div>}
            </div>
            <form onSubmit={addComment} className="flex gap-2">
              <input className="input" placeholder="Écrire un commentaire…" value={newComment} onChange={e => setNewComment(e.target.value)} />
              <button className="btn-primary"><Send size={14} /></button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5 space-y-3 text-sm">
            <Field label="Statut"><span className="badge bg-slate-100 dark:bg-slate-800">{task.status}</span></Field>
            <Field label="Priorité"><span className="capitalize">{task.priority}</span></Field>
            <Field label="Validée">{task.is_validated ? '✅ Oui' : '⏳ En attente'}</Field>
            <Field label="Badge"><span className="badge bg-brand-100 text-brand-700">{task.badge}</span></Field>
            <Field label="Module">{task.module?.project?.name} / {task.module?.name}</Field>
            <Field label="Assignée à">{task.assignee?.name || '—'}</Field>
            <Field label="Créée par">{task.creator?.name || '—'}</Field>
            <Field label="Début">{task.start_date ? format(new Date(task.start_date), 'dd MMM yyyy') : '—'}</Field>
            <Field label="Échéance">{task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : '—'}</Field>
          </div>
        </div>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Modifier tâche" size="lg">
        <TaskForm initial={task} onClose={() => setEdit(false)} onSaved={load} />
      </Modal>
    </div>
  )
}

function Field({ label, children }) {
  return <div className="flex justify-between items-center"><span className="text-slate-500">{label}</span><span className="font-medium">{children}</span></div>
}
