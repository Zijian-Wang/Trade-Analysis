import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { exchangeCodeForTokens } from '../services/schwabAuth'
import { Loader } from '../components/ui/loader'
import { useLanguage } from '../context/LanguageContext'

interface SchwabCallbackPageProps {
  onComplete: () => void
}

/**
 * OAuth callback page for Schwab account linking
 * Handles the redirect from Schwab OAuth flow
 */
export function SchwabCallbackPage({ onComplete }: SchwabCallbackPageProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  )
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        setStatus('error')
        setErrorMessage(
          error === 'access_denied' ? 'Authorization was denied' : error,
        )
        return
      }

      if (!code) {
        setStatus('error')
        setErrorMessage('No authorization code received')
        return
      }

      if (!user?.uid) {
        setStatus('error')
        setErrorMessage('User not authenticated')
        return
      }

      // Get code verifier from sessionStorage
      const codeVerifier = sessionStorage.getItem('schwab_code_verifier')
      if (!codeVerifier) {
        setStatus('error')
        setErrorMessage('Code verifier not found. Please try linking again.')
        return
      }

      // Exchange code for tokens
      const result = await exchangeCodeForTokens(code, codeVerifier, user.uid)

      if (result.success) {
        setStatus('success')
        sessionStorage.removeItem('schwab_code_verifier')
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
        // Call onComplete callback after 2 seconds
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Failed to link account')
      }
    }

    handleCallback()
  }, [user, onComplete])

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Loader />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Linking your Schwab account...
        </p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
            Account Linked Successfully!
          </h2>
          <p className="text-green-700 dark:text-green-400">
            Your Schwab account has been linked. Redirecting to Active
            Positions...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">
          Linking Failed
        </h2>
        <p className="text-red-700 dark:text-red-400 mb-4">{errorMessage}</p>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
