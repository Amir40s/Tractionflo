'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function redirectToAuthConfigError(pathname: '/login' | '/signup', error: unknown): never {
  const message = error instanceof Error ? error.message : 'Supabase is not configured'
  redirect(`${pathname}?error=${encodeURIComponent(message)}`)
}

export async function login(formData: FormData) {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/login', error))

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return redirect('/login?error=Email and password are required')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/signup', error))

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password || !name) {
    return redirect('/signup?error=Name, Email, and Password are required')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone || '',
      }
    }
  })

  if (error) {
    return redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to continue sign in process')
}

export async function signout() {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/login', error))
  await supabase.auth.signOut()
  redirect('/login')
}
