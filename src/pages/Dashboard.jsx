import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { ListChecks, ShieldAlert, Clock3, FolderKanban, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

const STATUS_COLORS = {
  pending_validation: '#f59e0b',
  todo: '#64748b',
  in_progress: '#3b82f6',
  done: '#10b981'
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl grid place-items-center ${color}`}><Icon size={22} /></div>
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [activity, setActivity] = useState([])

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }, { data: u }, { data: a }] = await Promise.all([
        supabase.from('tasks').select('*, module:modules(id,name,project:projects(id,name)), assignee:assigned_to(id,name)'),
        supabase.from('projects').select('*'),
        supabase.from('users').select('*'),
        supabase.from('activity_logs').select('*, actor:users(id,name)').order('created_at', { ascending: false }).limit(8)
      ])
      setTasks(t || []); setProjects(p || []); setUsers(u || []); setActivity(a || [])
    })()
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending_validation').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      late: tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
    }
  }, [tasks])

  const byStatus = ['pending_validation','todo','in_progress','done'].map(s => ({
    name: s.replace('_', ' '),
    value: tasks.filter(t => t.status === s).length,
    key: s
  }))

  const byUser = users.map(u => ({
    name: u.name?.split(' ')[0] || u.email,
    tasks: tasks.filter(t => t.assigned_to === u.id).length
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour, {profile?.name} 👋</h1>
        <p className="text-slate-500">Voici l'état de vos projets aujourd'hui.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={ListChecks} label="Tâches totales" value={stats.total} color="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" />
        <Stat icon={ShieldAlert} label="En attente validation" value={stats.pending} color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" />
        <Stat icon={Clock3} label="En cours" value={stats.inProgress} color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" />
        <Stat icon={CheckCircle2} label="Terminées" value={stats.done} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" />
        <Stat icon={AlertTriangle} label="En retard" value={stats.late} color="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Tâches par utilisateur</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byUser}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#3a5cff" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Répartition par statut</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {byStatus.map(s => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Projets récents</h3>
            <Link to="/projects" className="text-sm text-brand-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {projects.slice(0,5).map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <FolderKanban className="text-brand-600" size={18} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 truncate">{p.description}</div>
                </div>
              </Link>
            ))}
            {projects.length === 0 && <div className="text-sm text-slate-500">Aucun projet pour le moment.</div>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Activité récente</h3>
          <div className="space-y-3">
            {activity.map(a => (
              <div key={a.id} className="text-sm">
                <span className="font-medium">{a.actor?.name || 'Système'}</span>
                <span className="text-slate-500"> — {a.action}</span>
                <div className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
            {activity.length === 0 && <div className="text-sm text-slate-500">Pas d'activité.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
