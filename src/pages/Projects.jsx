import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, FolderKanban, Trash2, Pencil } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'

export default function Projects() {
  const { projects, loading, create, update, remove } = useProjects()
  const { isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const openNew = () => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true) }
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, description: p.description || '' }); setOpen(true) }

  const submit = async (e) => {
    e.preventDefault()
    const fn = editing ? update(editing.id, form) : create(form)
    const { error } = await fn
    if (error) toast.error(error.message)
    else { toast.success(editing ? 'Projet mis à jour' : 'Projet créé'); setOpen(false) }
  }

  const onDelete = async (p) => {
    if (!confirm(`Supprimer le projet "${p.name}" ?`)) return
    const { error } = await remove(p.id)
    if (error) toast.error(error.message); else toast.success('Supprimé')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projets</h1>
          <p className="text-slate-500">Gérez tous vos projets ERP.</p>
        </div>
        {isAdmin && <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nouveau projet</button>}
      </div>

      {loading ? <div>Chargement…</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="card p-5 hover:shadow-lg transition group">
              <div className="flex items-start justify-between">
                <Link to={`/projects/${p.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 grid place-items-center"><FolderKanban size={18} /></div>
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </Link>
                {isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button onClick={() => openEdit(p)} className="btn-ghost p-2"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(p)} className="btn-ghost p-2 text-red-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-3 line-clamp-2 min-h-[40px]">{p.description || 'Aucune description.'}</p>
              <Link to={`/projects/${p.id}`} className="btn-outline mt-4 w-full">Ouvrir →</Link>
            </div>
          ))}
          {projects.length === 0 && <div className="text-slate-500">Aucun projet. Créez votre premier projet.</div>}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier projet' : 'Nouveau projet'}>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Nom</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[100px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}
