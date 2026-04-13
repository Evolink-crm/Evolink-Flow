import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { format, isToday, isYesterday } from 'date-fns'
import { Send, Search, Trash2, Lock, Check, CheckCheck } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

function dayLabel(d) {
  const dt = new Date(d)
  if (isToday(dt)) return "Aujourd'hui"
  if (isYesterday(dt)) return 'Hier'
  return format(dt, 'dd MMM yyyy')
}

export default function Chat() {
  const { user, profile, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [active, setActive] = useState(null)
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [unreadMap, setUnreadMap] = useState({})
  const [lastMap, setLastMap] = useState({})
  const bottomRef = useRef(null)

  // Load all users + all my messages on mount
  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('id,name,email,role').neq('id', user.id).order('name')
    setUsers(data || [])
  }
  const loadAllMessages = async () => {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })
    const all = data || []
    // compute unread & last per contact
    const unread = {}, last = {}
    for (const m of all) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id
      last[other] = m
      if (m.recipient_id === user.id && !m.read_at) unread[other] = (unread[other] || 0) + 1
    }
    setUnreadMap(unread); setLastMap(last)
    if (active) {
      setMessages(all.filter(m =>
        (m.sender_id === user.id && m.recipient_id === active.id) ||
        (m.sender_id === active.id && m.recipient_id === user.id)
      ))
    }
  }

  useEffect(() => { if (user) { loadUsers(); loadAllMessages() } }, [user])

  // Realtime
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('chat-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadAllMessages)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, active?.id])

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, active?.id])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (!active) return
    const toMark = messages.filter(m => m.recipient_id === user.id && m.sender_id === active.id && !m.read_at).map(m => m.id)
    if (toMark.length) {
      supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', toMark).then(loadAllMessages)
    }
  }, [active?.id, messages.length])

  const openChat = (u) => setActive(u)

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !active) return
    const content = text.trim()
    setText('')
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id, recipient_id: active.id, content
    })
    if (error) { toast.error(error.message); setText(content) }
  }

  const remove = async (m) => {
    if (!isAdmin) return
    if (!confirm('Supprimer ce message ?')) return
    const { error } = await supabase.from('messages').delete().eq('id', m.id)
    if (error) toast.error(error.message); else toast.success('Message supprimé')
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    const sorted = [...users].sort((a, b) => {
      const la = lastMap[a.id]?.created_at || 0
      const lb = lastMap[b.id]?.created_at || 0
      return new Date(lb) - new Date(la)
    })
    return sorted.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }, [users, search, lastMap])

  // group messages by day
  const grouped = useMemo(() => {
    const g = []
    let lastDay = null
    for (const m of messages) {
      const d = format(new Date(m.created_at), 'yyyy-MM-dd')
      if (d !== lastDay) { g.push({ type: 'day', date: m.created_at, id: d }); lastDay = d }
      g.push({ type: 'msg', ...m })
    }
    return g
  }, [messages])

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4">
      {/* Contacts */}
      <div className="w-72 card p-0 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-8" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(u => {
            const last = lastMap[u.id]
            const unread = unreadMap[u.id] || 0
            return (
              <button key={u.id} onClick={() => openChat(u)}
                className={`w-full text-left flex items-center gap-3 p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${active?.id === u.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-semibold">
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{u.name}</span>
                    {last && <span className="text-[10px] text-slate-400">{format(new Date(last.created_at), 'HH:mm')}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate">{last ? (last.sender_id === user.id ? 'Vous : ' : '') + last.content : u.role}</span>
                    {unread > 0 && <span className="bg-brand-600 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">{unread}</span>}
                  </div>
                </div>
              </button>
            )
          })}
          {filteredUsers.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">Aucun contact</div>}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 card p-0 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 grid place-items-center text-slate-500 text-sm p-6 text-center">
            <div>
              <div className="text-4xl mb-2">💬</div>
              Sélectionnez un contact pour commencer à discuter.
              <div className="text-xs mt-2 flex items-center justify-center gap-1"><Lock size={11} /> Chiffré par RLS — seuls vous deux voyez les messages.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-semibold">{active.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className="font-semibold">{active.name}</div>
                <div className="text-xs text-slate-500 capitalize">{active.role} • {active.email}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950/40">
              {grouped.map(it => it.type === 'day' ? (
                <div key={it.id} className="flex justify-center my-3">
                  <span className="text-[11px] bg-white dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">{dayLabel(it.date)}</span>
                </div>
              ) : (
                <Bubble key={it.id} m={it} me={user.id} isAdmin={isAdmin} onDelete={remove} />
              ))}
              {messages.length === 0 && <div className="text-center text-sm text-slate-400 mt-10">Pas encore de messages. Dites bonjour 👋</div>}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input className="input" placeholder="Écrire un message…" value={text} onChange={e => setText(e.target.value)} />
              <button className="btn-primary" disabled={!text.trim()}><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Bubble({ m, me, isAdmin, onDelete }) {
  const mine = m.sender_id === me
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm relative ${
        mine ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 rounded-bl-sm'
      }`}>
        <div className="whitespace-pre-wrap break-words">{m.content}</div>
        <div className={`flex items-center gap-1 justify-end text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-slate-400'}`}>
          <span>{format(new Date(m.created_at), 'HH:mm')}</span>
          {mine && (m.read_at ? <CheckCheck size={12} /> : <Check size={12} />)}
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(m)}
            className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 transition">
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  )
}
