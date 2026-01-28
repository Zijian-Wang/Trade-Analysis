import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import XLSX from 'xlsx'

const SZSE_URL =
  process.env.SZSE_STOCK_LIST_URL ||
  'https://www.szse.cn/api/report/ShowReport?SHOWTYPE=xlsx&CATALOGID=1110&TABKEY=tab1'

const SSE_URL =
  process.env.SSE_STOCK_LIST_URL ||
  'https://query.sse.com.cn/security/stock/getStockListData.do'

const sseHeaders = {
  Referer: process.env.SSE_REFERER || 'https://www.sse.com.cn/assortment/stock/list/',
  'User-Agent': process.env.SSE_USER_AGENT || 'Mozilla/5.0',
  Accept: 'application/json',
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Fetch failed: ${res.status} ${url} ${text.slice(0, 200)}`)
  }
  return await res.json()
}

async function fetchBuffer(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Fetch failed: ${res.status} ${url} ${text.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function loadSzseMap() {
  console.log(`Downloading SZSE XLSX: ${SZSE_URL}`)
  const buf = await fetchBuffer(SZSE_URL)

  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = wb.SheetNames?.[0]
  if (!sheetName) throw new Error('SZSE XLSX: no sheets found')

  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('SZSE XLSX: unexpected empty table')
  }

  const header = rows[0]
  const codeIdx = header.indexOf('A股代码')
  const nameIdx = header.indexOf('A股简称')
  if (codeIdx === -1 || nameIdx === -1) {
    throw new Error('SZSE XLSX: missing A股代码/A股简称 columns')
  }

  /** @type {Record<string,string>} */
  const out = {}
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const code = String(row[codeIdx] || '').trim()
    const name = String(row[nameIdx] || '').trim()
    if (!/^\d{6}$/.test(code) || !name) continue
    out[code] = name
  }

  console.log(`SZSE parsed: ${Object.keys(out).length} tickers`)
  return out
}

async function loadSseMap() {
  console.log(`Downloading SSE JSON list: ${SSE_URL}`)

  /** @type {Record<string,string>} */
  const out = {}

  // Page through results. SSE endpoint supports large pages; keep it conservative.
  const pageSize = Number(process.env.SSE_PAGE_SIZE || 2000)
  let pageNo = 1
  let total = null

  while (true) {
    const url =
      `${SSE_URL}?isPagination=true&stockType=1` +
      `&pageHelp.pageSize=${pageSize}` +
      `&pageHelp.pageNo=${pageNo}` +
      `&pageHelp.beginPage=${pageNo}` +
      `&pageHelp.cacheSize=1` +
      `&pageHelp.endPage=${pageNo}` +
      `&_=${Date.now()}`

    const json = await fetchJson(url, { headers: sseHeaders })
    const data = json?.pageHelp?.data
    if (!Array.isArray(data) || data.length === 0) break

    // Some responses include a total count; record once for logging.
    if (total == null) {
      total = json?.pageHelp?.total || json?.pageHelp?.rowCount || null
    }

    for (const row of data) {
      const code = String(row?.SECURITY_CODE_A || row?.COMPANY_CODE || '').trim()
      const name = String(row?.SECURITY_ABBR_A || row?.COMPANY_ABBR || '').trim()
      if (!/^\d{6}$/.test(code) || !name) continue
      out[code] = name
    }

    pageNo++
  }

  console.log(
    `SSE parsed: ${Object.keys(out).length} tickers` +
      (total ? ` (reported total: ${total})` : ''),
  )
  return out
}

async function main() {
  const [sse, szse] = await Promise.all([loadSseMap(), loadSzseMap()])
  const merged = { ...sse, ...szse }

  const root = process.cwd()
  const outDir = path.join(root, 'public', 'symbols')
  const outFile = path.join(outDir, 'cn_ticker_to_name.json')

  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(merged), 'utf8')

  console.log(
    `Wrote ${Object.keys(merged).length} CN tickers to ${outFile} (SSE ${Object.keys(sse).length} + SZSE ${Object.keys(szse).length})`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

