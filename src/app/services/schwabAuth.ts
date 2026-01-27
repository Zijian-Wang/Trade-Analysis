/**
 * Schwab OAuth PKCE utilities
 */

/**
 * Generate a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

/**
 * Generate code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(digest))
}

/**
 * Base64 URL encode
 */
function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Get OAuth authorization URL
 */
export async function getSchwabAuthUrl(): Promise<{
  url: string
  codeVerifier: string
}> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Must match exactly what the backend uses for token exchange
  const redirectUri =
    import.meta.env.VITE_SCHWAB_REDIRECT_URI ||
    `${window.location.origin}/auth/schwab/callback`

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SCHWAB_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'readonly',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://api.schwabapi.com/v1/oauth/authorize?${params.toString()}`

  // Store code verifier in sessionStorage for callback
  sessionStorage.setItem('schwab_code_verifier', codeVerifier)
  sessionStorage.setItem('schwab_redirect_uri', redirectUri)

  return { url: authUrl, codeVerifier }
}

/**
 * Exchange authorization code for tokens (via backend)
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  userId: string,
  redirectUri?: string,
): Promise<{ success: boolean; accountHash?: string; error?: string }> {
  try {
    const response = await fetch('/api/auth/schwab/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        codeVerifier,
        userId,
        redirectUri,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Token exchange error:', error)
    return { success: false, error: 'Failed to exchange authorization code' }
  }
}

/**
 * Sync Schwab account (fetch positions and orders)
 */
export async function syncSchwabAccount(userId: string): Promise<{
  success: boolean
  positions?: any[]
  portfolioRisk?: number
  portfolioValue?: number
  accountEquity?: number
  cashBalance?: number
  syncedAt?: number
  savedCount?: number
  error?: string
}> {
  try {
    const response = await fetch('/api/schwab/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, error: 'Failed to sync account' }
  }
}
