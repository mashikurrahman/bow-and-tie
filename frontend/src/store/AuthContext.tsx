import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { auth, type Address, type User } from '../services/db'
import { getToken } from '../services/api'

type AuthValue = {
  user: User | null
  isAuthed: boolean
  loading: boolean
  register: (input: { name: string; email: string; password: string }) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  oauth: (provider: 'google' | 'facebook', token: string) => Promise<void>
  logout: () => void
  updateProfile: (patch: { name?: string; phone?: string }) => Promise<void>
  saveAddress: (address: Address) => Promise<void>
  removeAddress: (addressId: string) => Promise<void>
  verifyEmail: (id: string, token: string) => Promise<void>
  resendVerification: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from a stored token on mount.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    auth
      .me()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    setUser(await auth.register(input))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setUser(await auth.login(email, password))
  }, [])

  const oauth = useCallback(async (provider: 'google' | 'facebook', token: string) => {
    setUser(await auth.oauth(provider, token))
  }, [])

  const logout = useCallback(() => {
    auth.logout()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (patch: { name?: string; phone?: string }) => {
    setUser(await auth.updateProfile(patch))
  }, [])

  const saveAddress = useCallback(async (address: Address) => {
    setUser(await auth.saveAddress(address))
  }, [])

  const removeAddress = useCallback(async (addressId: string) => {
    setUser(await auth.removeAddress(addressId))
  }, [])

  const verifyEmail = useCallback(async (id: string, token: string) => {
    setUser(await auth.verifyEmail(id, token))
  }, [])

  const resendVerification = useCallback(async () => {
    await auth.resendVerification()
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthed: !!user,
      loading,
      register,
      login,
      oauth,
      logout,
      updateProfile,
      saveAddress,
      removeAddress,
      verifyEmail,
      resendVerification,
    }),
    [user, loading, register, login, oauth, logout, updateProfile, saveAddress, removeAddress, verifyEmail, resendVerification],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
