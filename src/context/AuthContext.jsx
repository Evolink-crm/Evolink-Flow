import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data, error } = await supabase.from('users').select('*').eq('id', uid).single()
    if (error && error.code === 'PGRST116') {
      // create profile if missing
      const u = (await supabase.auth.getUser()).data.user
      const { data: created } = await supabase.from('users').insert({
        id: uid,
        email: u.email,
        name: u.user_metadata?.name || u.email.split('@')[0],
        role: u.user_metadata?.role || 'developer'
      }).select().single()
      setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, meta) => supabase.auth.signUp({ email, password, options: { data: meta } })
  const signOut = () => supabase.auth.signOut()

  const value = {
    session, profile, loading,
    user: session?.user || null,
    role: profile?.role,
    isAdmin: profile?.role === 'admin',
    signIn, signUp, signOut,
    refreshProfile: () => session && loadProfile(session.user.id)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
