import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Upload, Download, Trash2, FileText, Inbox, Send, Users as UsersIcon, X } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'

const SELECT = `*, sender:sender_id(id,name,role), recipient:recipient_id(id,name,role)`

function fileIcon(mime = '') {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.includes('pdf')) return '📄'
  if (mime.includes('zip') || mime.includes('rar')) return '🗜️'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  return '📎'
}
function fmtSize(b) {
  if (!b) return ''
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

export default function Documents() {
  const { user, profile, isAdmin } = useAuth()
  const [docs, setDocs] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('received')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ recipient_id: '', message: '', file: null })

  const load = async () => {
    const { data } = await supabase.from('documents').select(SELECT).order('created_at', { ascending: false })
    setDocs(data || [])
  }
  useEffect(() => {
    if (!user) return
    load()
    supabase.from('users').select('id,name,role').neq('id', user.id).then(({ data }) => setUsers(data || []))
    const ch = supabase.channel('docs-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const filtered = docs.filter(d => {
    if (tab === 'received') return d.recipient_id === user.id || (d.recipient_id === null && d.sender_id !== user.id)
    if (tab === 'sent') return d.sender_id === user.id
    if (tab === 'shared') return d.recipient_id === null
    return true
  })

  const upload = async (e) => {
    e.preventDefault()
    if (!form.file) return toast.error('Choisissez un fichier')
    setBusy(true)
    try {
      const file = form.file
      const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, {
        contentType: file.type, upsert: false
      })
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('documents').insert({
        name: file.name,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        sender_id: user.id,
        recipient_id: form.recipient_id || null,
        message: form.message || null
      })
      if (insErr) {
        await supabase.storage.from('documents').remove([path])
        throw insErr
      }
      toast.success('Document envoyé')
      setOpen(false); setForm({ recipient_id: '', message: '', file: null })
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const download = async (d) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 60)
    if (error) return toast.error(error.message)
    window.open(data.signedUrl, '_blank')
  }

  const remove = async (d) => {
    if (!confirm(`Supprimer "${d.name}" ?`)) return
    await supabase.storage.from('documents').remove([d.file_path])
    const { error } = await supabase.from('documents').delete().eq('id', d.id)
    if (error) toast.error(error.message); else toast.success('Supprimé')
  }

  const tabs = [
    { id: 'received', label: 'Reçus', icon: Inbox },
    { id: 'sent', label: 'Envoyés', icon: Send },
    { id: 'shared', label: 'Partagés équipe', icon: UsersIcon }
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-slate-500">Partagez des fichiers entre membres de l'équipe.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Upload size={16} /> Envoyer un document</button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t.id ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{fileIcon(d.mime_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" title={d.name}>{d.name}</div>
                <div className="text-xs text-slate-500">{fmtSize(d.size_bytes)} • {format(new Date(d.created_at), 'dd MMM HH:mm')}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 space-y-1">
              <div>De : <span className="font-medium text-slate-700 dark:text-slate-300">{d.sender?.name || '—'}</span></div>
              <div>À : <span className="font-medium text-slate-700 dark:text-slate-300">{d.recipient?.name || '👥 Toute l\'équipe'}</span></div>
              {d.message && <div className="italic text-slate-600 dark:text-slate-400 line-clamp-2">"{d.message}"</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => download(d)} className="btn-outline flex-1"><Download size={14} /> Télécharger</button>
              {(d.sender_id === user.id || isAdmin) && (
                <button onClick={() => remove(d)} className="btn-ghost p-2 text-red-600"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full card p-10 text-center text-slate-500">
            <FileText className="mx-auto mb-2" size={32} />
            Aucun document {tab === 'received' ? 'reçu' : tab === 'sent' ? 'envoyé' : 'partagé'}.
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Envoyer un document">
        <form onSubmit={upload} className="space-y-3">
          <div>
            <label className="label">Destinataire</label>
            <select className="input" value={form.recipient_id} onChange={e => setForm({ ...form, recipient_id: e.target.value })}>
              <option value="">👥 Toute l'équipe</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fichier</label>
            <input type="file" required onChange={e => setForm({ ...form, file: e.target.files[0] })}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white file:cursor-pointer" />
            {form.file && <div className="text-xs text-slate-500 mt-1">{form.file.name} — {fmtSize(form.file.size)}</div>}
          </div>
          <div>
            <label className="label">Message (optionnel)</label>
            <textarea className="input min-h-[70px]" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Ajouter un mot…" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Annuler</button>
            <button disabled={busy} className="btn-primary"><Upload size={14} /> {busy ? 'Envoi…' : 'Envoyer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
