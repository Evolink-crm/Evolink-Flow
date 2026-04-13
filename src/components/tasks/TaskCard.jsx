import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { Calendar, Flag, Shield, Users } from 'lucide-react'
import { format } from 'date-fns'

const PRIO = { low: 'text-slate-500', medium: 'text-amber-600', high: 'text-red-600' }
const PRIO_BG = { low: 'bg-slate-100 dark:bg-slate-800', medium: 'bg-amber-100 dark:bg-amber-900/30', high: 'bg-red-100 dark:bg-red-900/30' }

export default function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const subDone = task.subtasks?.filter(s => s.completed).length || 0
  const subTotal = task.subtasks?.length || 0
  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="card p-3 hover:shadow-md cursor-grab active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link to={`/tasks/${task.id}`} onClick={e => e.stopPropagation()} className="font-medium text-sm hover:text-brand-600 line-clamp-2">{task.title}</Link>
        <span className={`badge ${task.badge === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-purple-100 text-purple-700'}`}>
          {task.badge === 'admin' ? <Shield size={10} /> : <Users size={10} />}{task.badge}
        </span>
      </div>
      {task.module && <div className="text-xs text-slate-500 mb-2">{task.module.project?.name} • {task.module.name}</div>}
      <div className="flex items-center justify-between text-xs">
        <span className={`badge ${PRIO_BG[task.priority]} ${PRIO[task.priority]}`}><Flag size={10} />{task.priority}</span>
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
            <Calendar size={11} />{format(new Date(task.due_date), 'dd MMM')}
          </span>
        )}
      </div>
      {subTotal > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>Sous-tâches</span><span>{subDone}/{subTotal}</span></div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded h-1"><div className="bg-emerald-500 h-full rounded" style={{ width: `${(subDone/subTotal)*100}%` }} /></div>
        </div>
      )}
      {task.assignee && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] grid place-items-center">{task.assignee.name?.[0]}</div>
          <span className="text-xs text-slate-600 dark:text-slate-300">{task.assignee.name}</span>
        </div>
      )}
    </div>
  )
}
