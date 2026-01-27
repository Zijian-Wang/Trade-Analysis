import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let firebaseApp: App | null = null
let db: Firestore | null = null
let firebaseInitError: string | null = null

/**
 * Lazily initialize Firebase Admin SDK and return Firestore instance.
 * Throws a descriptive error if initialization fails (missing env vars, bad credentials, etc.)
 */
export function getDb(): Firestore {
  if (db) return db

  if (firebaseInitError) {
    throw new Error(firebaseInitError)
  }

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      firebaseInitError = `Missing Firebase Admin credentials: ${[
        !projectId && 'FIREBASE_PROJECT_ID',
        !clientEmail && 'FIREBASE_CLIENT_EMAIL',
        !privateKey && 'FIREBASE_PRIVATE_KEY',
      ]
        .filter(Boolean)
        .join(', ')}`
      throw new Error(firebaseInitError)
    }

    try {
      // Normalize the private key - handle various formats from different env var sources
      let normalizedKey = privateKey
      
      // Remove surrounding quotes if present (some env var UIs add these)
      if ((normalizedKey.startsWith('"') && normalizedKey.endsWith('"')) ||
          (normalizedKey.startsWith("'") && normalizedKey.endsWith("'"))) {
        normalizedKey = normalizedKey.slice(1, -1)
      }
      
      // Convert escaped newlines to actual newlines
      // Handle both \\n (double-escaped) and \n (single-escaped)
      normalizedKey = normalizedKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
      
      // Validate the key format
      if (!normalizedKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Private key missing BEGIN marker. Check FIREBASE_PRIVATE_KEY format.')
      }
      if (!normalizedKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Private key missing END marker. Check FIREBASE_PRIVATE_KEY format.')
      }
      
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: normalizedKey,
        }),
      })
    } catch (e) {
      firebaseInitError = `Firebase Admin init failed: ${e instanceof Error ? e.message : String(e)}`
      throw new Error(firebaseInitError)
    }
  } else {
    firebaseApp = getApps()[0]
  }

  db = getFirestore()
  return db
}
