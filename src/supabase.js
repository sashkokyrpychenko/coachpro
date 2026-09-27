import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Повертає id поточного користувача — читає сесію локально (без мережі)
export const getUserId = async () => {
  // getSession() читає з localStorage, не робить мережевий запит
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.id || null
}
