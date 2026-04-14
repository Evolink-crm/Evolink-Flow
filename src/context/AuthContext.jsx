import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext()
const CUSTOM_KEY = 'evf_custom_user'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)      // Supabase session (admin)
  const [customUser, setCustomUser] = useState(null) // Team user (username/password)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load custom session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (raw) {
      try { setCustomUser(JSON.parse(raw)) } catch {}
    }
  }, [])

  // Supabase session (admin)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      else if (!localStorage.getItem(CUSTOM_KEY)) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else if (!localStorage.getItem(CUSTOM_KEY)) { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Custom user profile
  useEffect(() => {
    if (customUser && !session) {
      setProfile(customUser)
      setLoading(false)
    }
  }, [customUser, session])

  async function loadProfile(uid) {
    const { data, error } = await supabase.from('users').select('*').eq('id', uid).single()
    if (error && error.code === 'PGRST116') {
      const u = (await supabase.auth.getUser()).data.user
      const { data: created } = await supabase.from('users').insert({
        id: uid, email: u.email,
        name: u.user_metadata?.name || u.email.split('@')[0],
        role: u.user_metadata?.role || 'admin',
        is_auth_user: true
      }).select().single()
      setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  // Admin login (email + password via Supabase Auth)
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  // Team member login (username + password via RPC)
  const signInTeam = async (username, password) => {
    const { data, error } = await supabase.rpc('authenticate_team_user', {
      p_username: username, p_password: password
    })
    if (error) return { error }
    // La RPC peut retourner un objet avec tous les champs null quand
    // aucune ligne ne correspond — il faut vérifier l'id.
    const user = Array.isArray(data) ? data[0] : data
    if (!user || !user.id) return { error: { message: 'Identifiants invalides' } }
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(user))
    setCustomUser(user)
    setProfile(user)
    return { data: user }
  }

  const signUp = (email, password, meta) => supabase.auth.signUp({ email, password, options: { data: meta } })

  const signOut = async () => {
    localStorage.removeItem(CUSTOM_KEY)
    setCustomUser(null)
    setProfile(null)
    if (session) await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (session) return loadProfile(session.user.id)
    if (customUser) {
      const { data } = await supabase.from('users').select('*').eq('id', customUser.id).single()
      if (data) { setCustomUser(data); setProfile(data); localStorage.setItem(CUSTOM_KEY, JSON.stringify(data)) }
    }
  }

  const isLogged = !!session || !!customUser
  const user = session?.user || (customUser ? { id: customUser.id, email: customUser.email } : null)

  const value = {
    session, profile, loading,
    user,
    role: profile?.role,
    isAdmin: profile?.role === 'admin',
    isLogged,
    isCustomUser: !session && !!customUser,
    signIn, signInTeam, signUp, signOut, refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
