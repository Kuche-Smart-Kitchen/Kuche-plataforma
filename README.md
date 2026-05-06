This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Run Locally

If you want to run the frontend in local development mode, follow this order:

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root.

3. Use one of these setups:

```env
# Use the deployed backend during local frontend development
NEXT_PUBLIC_API_URL=https://backend-cocinas-inteligentes.vercel.app
NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT=https://backend-cocinas-inteligentes.vercel.app/api/archivos/upload
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC5tkCTPmiBULbEx
```

or, if you also have the backend running locally:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT=http://localhost:3001/api/archivos/upload
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAC5tkCTPmiBULbEx
```

4. Start the frontend:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

Notes:
- If you do not create `.env.local`, the app falls back to `http://localhost:3001` for the API.
- If the backend is remote, make sure it is reachable and allows CORS from `http://localhost:3000`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The repo is ready for Vercel deployment. Use the default Next.js framework detection, or rely on the included [vercel.json](vercel.json).

Before deploying, set these environment variables in the Vercel project settings:


Use [.env.example](.env.example) as the template for local and production values.

If your backend is deployed separately, make sure it is reachable from Vercel over HTTPS and that CORS allows requests from the frontend domain.
