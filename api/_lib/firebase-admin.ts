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
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // Vercel stores multi-line env vars with literal \n - convert to actual newlines
          privateKey: privateKey.replace(/\\n/g, '\n'),
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
