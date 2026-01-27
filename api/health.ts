import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Simple health check endpoint to verify Vercel functions work
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
      hasSchwabClientId: !!process.env.SCHWAB_CLIENT_ID,
      hasSchwabClientSecret: !!process.env.SCHWAB_CLIENT_SECRET,
      hasSchwabRedirectUri: !!process.env.SCHWAB_REDIRECT_URI,
    },
  })
}
