import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

/**
 * OAuth callback handler for Schwab account linking
 * Exchanges authorization code for access/refresh tokens
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, codeVerifier, userId } = req.body

    if (!code || !codeVerifier || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' })
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
          redirect_uri: process.env.SCHWAB_REDIRECT_URI!,
          code_verifier: codeVerifier,
        }),
      },
    )

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token exchange failed:', error)
      return res
        .status(400)
        .json({ error: 'Failed to exchange authorization code' })
    }

    const tokens = await tokenResponse.json()
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
      return res.status(400).json({ error: 'Failed to fetch account numbers' })
    }

    const accounts = await accountsResponse.json()
    const primaryAccount = accounts[0] // Use first account as primary

    // Store tokens securely in Firestore
    const userRef = db.collection('users').doc(userId)
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
    console.error('OAuth callback error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
