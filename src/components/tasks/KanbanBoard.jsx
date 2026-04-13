import { DndContext, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { supabase } from '../../services/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { id: 'pending_validation', label: 'Pending Validation', color: 'border-amber-400' },
  { id: 'todo', label: 'To Do', color: 'border-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' }
]

function Column({ id, label, color, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`flex-1 min-w-[260px] rounded-xl bg-slate-100/60 dark:bg-slate-900/60 p-3 border-t-4 ${color} ${isOver ? 'ring-2 ring-brand-400' : ''}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[80px]">
          {tasks.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({ tasks, reload }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const { isAdmin, user } = useAuth()

  const onDragEnd = async (event) => {
    const { active, over } = event
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return
    const overTask = tasks.find(t => t.id === over.id)
    const newStatus = COLUMNS.find(c => c.id === over.id)?.id || overTask?.status
    if (!newStatus || newStatus === task.status) return

    if (newStatus === 'pending_validation' && !isAdmin) return toast.error('Action réservée à l\'admin')
    if (task.status === 'pending_validation' && !isAdmin) return toast.error('Tâche en attente de validation')

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) toast.error(error.message); else { toast.success('Statut mis à jour'); reload?.() }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map(c => (
          <Column key={c.id} {...c} tasks={tasks.filter(t => t.status === c.id)} />
        ))}
      </div>
    </DndContext>
  )
}
