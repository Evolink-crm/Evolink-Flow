import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Layers, ChevronRight } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'

export default function ProjectDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [project, setProject] = useState(null)
  const [modules, setModules] = useState([])
  const [tasks, setTasks] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = async () => {
    const { data: p } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(p)
    const { data: m } = await supabase.from('modules').select('*').eq('project_id', id).order('created_at')
    setModules(m || [])
    const moduleIds = (m || []).map(x => x.id)
    if (moduleIds.length) {
      const { data: t } = await supabase.from('tasks').select('*').in('module_id', moduleIds)
      setTasks(t || [])
    } else setTasks([])
  }
  useEffect(() => { load() }, [id])

  const progress = useMemo(() => {
    if (!modules.length) return 0
    const perModule = modules.map(m => {
      const mt = tasks.filter(t => t.module_id === m.id)
      if (!mt.length) return 0
      const done = mt.filter(t => t.status === 'done').length
      return (done / mt.length) * 100
    })
    return Math.round(perModule.reduce((a,b) => a+b, 0) / modules.length)
  }, [modules, tasks])

  const openNew = () => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true) }
  const openEdit = (m) => { setEditing(m); setForm({ name: m.name, description: m.description || '' }); setOpen(true) }

  const submit = async (e) => {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase.from('modules').update(form).eq('id', editing.id)
      if (error) return toast.error(error.message)
    } else {
      const { error } = await supabase.from('modules').insert({ ...form, project_id: id })
      if (error) return toast.error(error.message)
    }
    toast.success('Module enregistré'); setOpen(false); load()
  }

  const onDelete = async (m) => {
    if (!confirm(`Supprimer le module "${m.name}" et toutes ses tâches ?`)) return
    const { error } = await supabase.from('modules').delete().eq('id', m.id)
    if (error) toast.error(error.message); else { toast.success('Supprimé'); load() }
  }

  if (!project) return <div>Chargement…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-slate-500">
        <Link to="/projects" className="hover:text-brand-600">Projets</Link>
        <ChevronRight size={14} className="mx-1" />
        <span className="text-slate-700 dark:text-slate-300">{project.name}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-slate-500 mt-1">{project.description || 'Aucune description.'}</p>
          </div>
          <Link to={`/tasks?project=${project.id}`} className="btn-outline">Voir les tâches</Link>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1"><span className="text-slate-500">Progression globale</span><span className="font-medium">{progress}%</span></div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-brand-600 h-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modules ({modules.length})</h2>
        {isAdmin && <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nouveau module</button>}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(m => {
          const mt = tasks.filter(t => t.module_id === m.id)
          const done = mt.filter(t => t.status === 'done').length
          const pct = mt.length ? Math.round((done / mt.length) * 100) : 0
          return (
            <div key={m.id} className="card p-5 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 grid place-items-center"><Layers size={16} /></div>
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-slate-500">{mt.length} tâches</div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button onClick={() => openEdit(m)} className="btn-ghost p-2"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(m)} className="btn-ghost p-2 text-red-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-2 min-h-[36px]">{m.description}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1"><span>Progression</span><span>{pct}%</span></div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <Link to={`/tasks?module=${m.id}`} className="btn-outline mt-4 w-full">Voir tâches →</Link>
            </div>
          )
        })}
        {modules.length === 0 && <div className="text-slate-500">Aucun module. Créez le premier module.</div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier module' : 'Nouveau module'}>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Nom</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}
