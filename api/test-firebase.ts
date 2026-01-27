import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Test endpoint to check if Firebase Admin can be loaded
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Step 1: Try to import firebase-admin
    const firebaseAdmin = await import('firebase-admin/app')
    
    // Step 2: Check env vars
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      return res.status(200).json({
        step: 'env-check',
        success: false,
        error: `Missing env vars: ${[
          !projectId && 'FIREBASE_PROJECT_ID',
          !clientEmail && 'FIREBASE_CLIENT_EMAIL',
          !privateKey && 'FIREBASE_PRIVATE_KEY',
        ].filter(Boolean).join(', ')}`,
        privateKeyPreview: privateKey ? `${privateKey.substring(0, 50)}...` : null,
      })
    }

    // Diagnostic info about the key format
    const keyDiagnostics = {
      length: privateKey.length,
      startsWithQuote: privateKey.startsWith('"') || privateKey.startsWith("'"),
      hasBeginMarker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasEndMarker: privateKey.includes('-----END PRIVATE KEY-----'),
      hasLiteralBackslashN: privateKey.includes('\\n'),
      hasActualNewlines: privateKey.includes('\n'),
      first60Chars: privateKey.substring(0, 60).replace(/\n/g, '\\n'),
    }

    // Step 3: Try to initialize
    if (!firebaseAdmin.getApps().length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      })
    }

    // Step 4: Try to get Firestore
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()

    return res.status(200).json({
      success: true,
      message: 'Firebase Admin initialized successfully',
      projectId,
      keyDiagnostics,
    })
  } catch (error) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      keyDiagnostics: privateKey ? {
        length: privateKey.length,
        startsWithQuote: privateKey.startsWith('"') || privateKey.startsWith("'"),
        hasBeginMarker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: privateKey.includes('-----END PRIVATE KEY-----'),
        hasLiteralBackslashN: privateKey.includes('\\n'),
        hasActualNewlines: privateKey.includes('\n'),
        first60Chars: privateKey.substring(0, 60).replace(/\n/g, '\\n'),
      } : null,
    })
  }
}
