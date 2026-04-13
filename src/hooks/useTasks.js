import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

const SELECT = `
  *,
  module:modules(id,name,project:projects(id,name)),
  assignee:assigned_to(id,name,email,role),
  creator:created_by(id,name,email,role),
  subtasks(*)
`

export function useTasks(filters = {}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('tasks').select(SELECT).order('created_at', { ascending: false })
    if (filters.module_id) q = q.eq('module_id', filters.module_id)
    if (filters.project_id) q = q.eq('module.project_id', filters.project_id)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.priority) q = q.eq('priority', filters.priority)
    if (filters.assigned_to) q = q.eq('assigned_to', filters.assigned_to)
    if (filters.pending) q = q.eq('is_validated', false)
    const { data, error } = await q
    if (!error) setTasks(data || [])
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const create = async (payload, { isAdmin }) => {
    const base = {
      ...payload,
      created_by: user.id,
      is_validated: !!isAdmin,
      status: isAdmin ? (payload.status || 'todo') : 'pending_validation',
      badge: isAdmin ? 'admin' : 'team'
    }
    const { data, error } = await supabase.from('tasks').insert(base).select(SELECT).single()
    return { data, error }
  }

  const update = async (id, patch) => {
    const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select(SELECT).single()
    return { data, error }
  }
  const remove = async (id) => supabase.from('tasks').delete().eq('id', id)

  return { tasks, loading, reload: load, create, update, remove }
}
