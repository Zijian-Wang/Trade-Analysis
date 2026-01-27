import type { VercelRequest, VercelResponse } from '@vercel/node'

function summarizeSchwabTokenError(raw: string): string {
  // Schwab typically returns JSON like:
  // {"error":"invalid_grant","error_description":"..."}
  try {
    const parsed = JSON.parse(raw) as {
      error?: string
      error_description?: string
      message?: string
    }

    const code = parsed.error || parsed.message
    const desc = parsed.error_description

    if (!code) return 'Failed to exchange authorization code'

    if (code === 'invalid_grant') {
      return [
        'Failed to exchange authorization code (invalid_grant).',
        'Most common causes: redirect URI mismatch, expired/used code, or PKCE verifier mismatch.',
      ].join(' ')
    }

    return desc
      ? `Failed to exchange authorization code (${code}): ${desc}`
      : `Failed to exchange authorization code (${code})`
  } catch {
    const trimmed = raw.trim()
    if (!trimmed) return 'Failed to exchange authorization code'
    return `Failed to exchange authorization code: ${trimmed.slice(0, 180)}`
  }
}

/**
 * OAuth callback handler for Schwab account linking
 * Exchanges authorization code for access/refresh tokens
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Top-level error boundary to catch ANY error and return JSON
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
    const { code, codeVerifier, userId, redirectUri } = req.body

    if (!code || !codeVerifier || !userId) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required parameters' })
    }

    if (!process.env.SCHWAB_CLIENT_ID || !process.env.SCHWAB_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        error:
          'Server misconfiguration: missing SCHWAB_CLIENT_ID and/or SCHWAB_CLIENT_SECRET.',
      })
    }

    const redirect_uri = (process.env.SCHWAB_REDIRECT_URI || redirectUri) as
      | string
      | undefined

    if (!redirect_uri) {
      return res.status(500).json({
        success: false,
        error:
          'Server misconfiguration: missing SCHWAB_REDIRECT_URI (and no redirectUri provided).',
      })
    }

    // Initialize Firebase (lazy, with proper error handling)
    let firestore: import('firebase-admin/firestore').Firestore
    try {
      const { getDb } = await import('../../lib/firebase-admin')
      firestore = getDb()
    } catch (e) {
      console.error('Firebase init error:', e)
      return res.status(500).json({
        success: false,
        error: e instanceof Error ? e.message : 'Firebase initialization failed',
      })
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      'https://api.schwabapi.com/v1/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          code_verifier: codeVerifier,
        }),
      },
    )

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token exchange failed:', error)
      return res
        .status(400)
        .json({ success: false, error: summarizeSchwabTokenError(error) })
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    const { access_token, refresh_token, expires_in } = tokens

    // Calculate expiration time (expires_in is in seconds)
    const expiresAt = Date.now() + expires_in * 1000

    // Get account numbers/hashes
    const accountsResponse = await fetch(
      'https://api.schwabapi.com/v1/accounts/accountNumbers',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )

    if (!accountsResponse.ok) {
      return res
        .status(400)
        .json({ success: false, error: 'Failed to fetch account numbers' })
    }

    const accounts = (await accountsResponse.json()) as Array<{
      hashValue: string
      accountNumber: string
    }>
    const primaryAccount = accounts[0] // Use first account as primary

    // Store tokens securely in Firestore
    const userRef = firestore.collection('users').doc(userId)
    await userRef.set(
      {
        schwabAccounts: [
          {
            accountHash: primaryAccount.hashValue,
            accountNumber: primaryAccount.accountNumber,
            accessToken: access_token, // TODO: Encrypt this
            refreshToken: refresh_token, // TODO: Encrypt this
            expiresAt,
            linkedAt: Date.now(),
          },
        ],
      },
      { merge: true },
    )

    return res.status(200).json({
      success: true,
      accountHash: primaryAccount.hashValue,
    })
  } catch (error) {
    // Global error handler - catches ANYTHING including import failures
    console.error('OAuth callback error:', error)
    try {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? `Server error: ${error.message}`
            : `Server error: ${String(error)}`,
      })
    } catch {
      // Last resort if even res.json fails
      return res.status(500).end('Internal server error')
    }
  }
}
