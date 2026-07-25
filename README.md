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

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file from `.env.example`.

3. Set at least these variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001,https://backend-cocinas-inteligentes.vercel.app
NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT=http://localhost:3001/api/archivos/upload
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Recommended local behavior:
- While developing against a local backend, keep `http://localhost:3001` first.
- The Axios layer already supports multiple values in `NEXT_PUBLIC_API_URL` separated by commas and, in development, it prioritizes `localhost` or `127.0.0.1` when present.
- If your local backend is down, replace the variable with only `https://backend-cocinas-inteligentes.vercel.app`.

4. Start the frontend:

```bash
npm run dev
```

Optional variables used by integrated flows:

```env
META_GRAPH_VERSION=v22.0
META_OEMBED_ACCESS_TOKEN=
META_APP_ID=
META_APP_CLIENT_TOKEN=
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC=
NEXT_PUBLIC_SHOWROOM_ADDRESS=
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The repo includes `vercel.json` with the base build and install commands for Next.js.

Before deploying, configure in Vercel the same variables listed in `.env.example`.
