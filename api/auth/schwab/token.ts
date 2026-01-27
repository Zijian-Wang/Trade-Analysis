import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../_lib/firebase-admin'

/**
 * Token refresh endpoint
 * Refreshes expired access tokens using refresh token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' })
    }

    // Initialize Firebase (lazy, with proper error handling)
    let db
    try {
      db = getDb()
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: e instanceof Error ? e.message : 'Firebase initialization failed',
      })
    }

    // Get user's Schwab account data
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    const schwabAccount = userData?.schwabAccounts?.[0]

    if (!schwabAccount || !schwabAccount.refreshToken) {
      return res.status(400).json({ error: 'No Schwab account linked' })
    }

    // Check if refresh token is expired (7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    if (schwabAccount.linkedAt < sevenDaysAgo) {
      return res
        .status(401)
        .json({ error: 'Refresh token expired. Re-authentication required.' })
    }

    // Refresh access token
    const tokenResponse = await fetch(
      'https://api.schwabapi.com/v1/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: schwabAccount.refreshToken,
        }),
      },
    )

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Token refresh failed:', error)
      return res.status(400).json({ error: 'Failed to refresh token' })
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }
    const { access_token, refresh_token, expires_in } = tokens

    // Update tokens in Firestore
    const expiresAt = Date.now() + expires_in * 1000
    await userRef.set(
      {
        schwabAccounts: [
          {
            ...schwabAccount,
            accessToken: access_token,
            refreshToken: refresh_token || schwabAccount.refreshToken, // Use new refresh token if provided
            expiresAt,
          },
        ],
      },
      { merge: true },
    )

    return res.status(200).json({
      success: true,
      accessToken: access_token,
      expiresAt,
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
