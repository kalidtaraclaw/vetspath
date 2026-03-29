# VetsPath — Your VA Benefits Navigator

A web tool that helps veterans understand their VA benefits eligibility by analyzing DD-214 data against VA business rules.

## What It Does

1. **DD-214 Analysis** — Enter key fields from your discharge document
2. **Smart Questionnaire** — Answer targeted questions based on your service profile
3. **Eligibility Results** — See which benefits you likely qualify for, including presumptive conditions
4. **Forms & Documents** — Get a personalized list of forms to file and documents to gather

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js — just click Deploy

## Tech Stack

- **Next.js 14** (React framework)
- **TypeScript** (type safety)
- **Tailwind CSS** (styling)

## Roadmap

- [ ] DD-214 OCR upload (auto-extract fields from uploaded document)
- [ ] Medical records parsing
- [ ] PDF form pre-filling
- [ ] User accounts and saved progress
- [ ] VSO integration

## Disclaimer

VetsPath is an informational tool and does not constitute legal or medical advice. Always verify eligibility with the VA or a Veterans Service Organization.
