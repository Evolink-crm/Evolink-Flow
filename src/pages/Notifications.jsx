import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export default function Notifications() {
  const { user } = useAuth()
  const [items, setItems] = useState([])

  const load = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setItems(data || [])
  }
  useEffect(() => {
    if (!user) return
    load()
    const ch = supabase.channel('notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const markRead = async (n) => { await supabase.from('notifications').update({ read: true }).eq('id', n.id) }
  const markAll = async () => { await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Bell /> Notifications</h1>
        <button onClick={markAll} className="btn-outline"><Check size={14} /> Tout marquer lu</button>
      </div>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {items.map(n => (
          <Link key={n.id} to={n.link || '#'} onClick={() => markRead(n)} className={`flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
            {!n.read && <span className="w-2 h-2 mt-2 rounded-full bg-brand-500" />}
            <div className="flex-1">
              <div className="font-medium text-sm">{n.title}</div>
              <div className="text-sm text-slate-500">{n.message}</div>
              <div className="text-xs text-slate-400 mt-1">{format(new Date(n.created_at), 'dd MMM HH:mm')}</div>
            </div>
          </Link>
        ))}
        {items.length === 0 && <div className="p-10 text-center text-slate-500">Aucune notification.</div>}
      </div>
    </div>
  )
}
