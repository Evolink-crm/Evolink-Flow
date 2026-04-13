import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function Topbar({ onMenu }) {
  const { signOut, user } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { count } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('read', false)
      setUnread(count || 0)
    }
    load()
    const ch = supabase.channel('notif-topbar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  return (
    <header className="h-16 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button onClick={onMenu} className="md:hidden btn-ghost p-2"><Menu size={20} /></button>

      <div className="flex-1 max-w-xl relative hidden sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Rechercher…" />
      </div>
      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1">
        <button onClick={toggle} className="btn-ghost p-2" title="Thème">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={() => nav('/notifications')} className="btn-ghost p-2 relative" title="Notifications">
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 grid place-items-center">{unread}</span>}
        </button>
        <button onClick={async () => { await signOut(); nav('/login') }} className="btn-ghost p-2" title="Déconnexion">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
