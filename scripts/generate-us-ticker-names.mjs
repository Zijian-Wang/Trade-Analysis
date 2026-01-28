import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SEC_URL =
  process.env.SEC_TICKERS_URL || 'https://www.sec.gov/files/company_tickers.json'

const userAgent =
  process.env.SEC_USER_AGENT ||
  'trade-analysis (set SEC_USER_AGENT=yourapp (you@email.com))'

async function main() {
  console.log(`Downloading: ${SEC_URL}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  const res = await fetch(SEC_URL, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json',
    },
    signal: controller.signal,
  })
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SEC download failed: ${res.status} ${text.slice(0, 200)}`)
  }

  /** @type {Record<string, {cik_str:number, ticker:string, title:string}>} */
  const data = await res.json()

  /** @type {Record<string, string>} */
  const out = {}

  for (const key of Object.keys(data)) {
    const row = data[key]
    const ticker = (row?.ticker || '').toString().trim().toUpperCase()
    const title = (row?.title || '').toString().trim()
    if (!ticker || !title) continue
    out[ticker] = title
  }

  const root = process.cwd()
  const outDir = path.join(root, 'public', 'symbols')
  const outFile = path.join(outDir, 'us_ticker_to_name.json')

  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(out), 'utf8')

  console.log(`Wrote ${Object.keys(out).length} tickers to ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

