import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Simple health check endpoint to verify Vercel functions work
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
