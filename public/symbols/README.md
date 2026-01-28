This folder contains **static symbol directory data** served directly by Vite/Vercel.

Goals:
- **$0 external API cost**
- **No runtime dependency** on 3rd-party APIs for company names
- **Minimal initial bundle impact** (files here are fetched lazily when needed)

## US ticker → company name

Generate the US map from the SEC dataset:

```bash
npm run generate:us-names
```

This will create:
- `public/symbols/us_ticker_to_name.json`

Notes:
- The SEC requires a User-Agent. Set `SEC_USER_AGENT` (recommended).
  Example: `SEC_USER_AGENT="yourapp (you@example.com)"`
