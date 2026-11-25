import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AuthContext from './AuthContextInstance.js'
import {
  getCurrentUser,
  loginCurator,
  loginWorker as authenticateWorker,
  registerCurator,
} from '../services/authService.js'

const sessionStorageKey = 'leviosa.session'
const legacySessionStorageKey = 'leviosa.curatorSession'

function readStoredSession() {
  const storedValue =
    sessionStorage.getItem(sessionStorageKey) ??
    sessionStorage.getItem(legacySessionStorageKey)
  if (!storedValue) {
    return null
  }

  try {
    const storedSession = JSON.parse(storedValue)
    if (
      typeof storedSession.accessToken !== 'string' ||
      typeof storedSession.user?.id !== 'string'
    ) {
      sessionStorage.removeItem(sessionStorageKey)
      sessionStorage.removeItem(legacySessionStorageKey)
      return null
    }
    return storedSession
  } catch {
    sessionStorage.removeItem(sessionStorageKey)
    sessionStorage.removeItem(legacySessionStorageKey)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    let active = true
    const storedSession = readStoredSession()

    if (!storedSession) {
      setIsRestoring(false)
      return () => {
        active = false
      }
    }

    getCurrentUser(storedSession.accessToken)
      .then(({ user }) => {
        if (active) {
          const restoredSession = { ...storedSession, user }
          setSession(restoredSession)
          sessionStorage.setItem(
            sessionStorageKey,
            JSON.stringify(restoredSession),
          )
          sessionStorage.removeItem(legacySessionStorageKey)
        }
      })
      .catch((error) => {
        if (!active) {
          return
        }
        if (error.status === 401) {
          sessionStorage.removeItem(sessionStorageKey)
        }
        setRestoreError(
          error.status === 401
            ? 'Your sign-in has expired. Please sign in again.'
            : error.message,
        )
      })
      .finally(() => {
        if (active) {
          setIsRestoring(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const establishSession = useCallback(async (authenticate) => {
    const nextSession = await authenticate()
    try {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))
    } catch {
      throw new Error(
        'Sign-in succeeded, but this browser could not save the session. Enable session storage and try again.',
      )
    }
    setSession(nextSession)
    setRestoreError('')
    return nextSession.user
  }, [])

  const register = useCallback(
    (details) => establishSession(() => registerCurator(details)),
    [establishSession],
  )
  const login = useCallback(
    (credentials) => establishSession(() => loginCurator(credentials)),
    [establishSession],
  )
  const loginWorker = useCallback(
    (credentials) => establishSession(() => authenticateWorker(credentials)),
    [establishSession],
  )
  const signOut = useCallback(() => {
    sessionStorage.removeItem(sessionStorageKey)
    sessionStorage.removeItem(legacySessionStorageKey)
    setSession(null)
    setRestoreError('')
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isRestoring,
      restoreError,
      register,
      login,
      loginWorker,
      signOut,
    }),
    [session, isRestoring, restoreError, register, login, loginWorker, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
