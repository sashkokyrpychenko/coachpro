import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Повертає id поточного залогіненого користувача (або null, якщо немає сесії)
export const getUserId = async () => {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}
