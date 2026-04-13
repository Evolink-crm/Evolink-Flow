import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, ListChecks, ShieldCheck, Bell, Settings, Workflow, Users as UsersIcon, FileText, MessageCircle, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projets', icon: FolderKanban },
  { to: '/tasks', label: 'Tâches', icon: ListChecks },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/validation', label: 'Validation', icon: ShieldCheck, adminOnly: true },
  { to: '/users', label: 'Utilisateurs', icon: UsersIcon, adminOnly: true },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Paramètres', icon: Settings }
]

export default function Sidebar({ open, onClose }) {
  const { isAdmin, profile } = useAuth()

  const content = (
    <>
      <div className="h-16 flex items-center justify-between gap-2 px-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white">
            <Workflow size={18} />
          </div>
          <div>
            <div className="font-semibold leading-tight">Evolink Flow</div>
            <div className="text-[11px] text-slate-500">ERP Platform</div>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden btn-ghost p-1"><X size={18} /></button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.filter(i => !i.adminOnly || isAdmin).map(i => (
          <NavLink key={i.to} to={i.to} end={i.end} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }>
            <i.icon size={18} />
            <span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-sm font-semibold">
            {profile?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{profile?.name}</div>
            <div className="text-xs text-slate-500 capitalize">{profile?.role}</div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {content}
      </aside>
    </>
  )
}
