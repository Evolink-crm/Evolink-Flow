import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (!error) setProjects(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (payload) => {
    const { data, error } = await supabase.from('projects').insert(payload).select().single()
    if (!error) setProjects(p => [data, ...p])
    return { data, error }
  }
  const update = async (id, patch) => {
    const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
    if (!error) setProjects(p => p.map(x => x.id === id ? data : x))
    return { data, error }
  }
  const remove = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(p => p.filter(x => x.id !== id))
    return { error }
  }

  return { projects, loading, reload: load, create, update, remove }
}
