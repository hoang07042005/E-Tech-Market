import { create } from 'zustand'

export interface AuthState {
  userStr: string | null
  setUserStr: (userStr: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userStr: typeof window !== 'undefined' ? window.localStorage.getItem('user') : null,
  setUserStr: (userStr) => set({ userStr })
}))

if (typeof window !== 'undefined') {
  const syncAuth = () => {
    useAuthStore.getState().setUserStr(window.localStorage.getItem('user'))
  }
  window.addEventListener('storage', syncAuth)
  window.addEventListener('auth-change', syncAuth)
}
