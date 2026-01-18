# Pranjay Frontend

Next.js 14 frontend for Pranjay B2B Cosmetics Platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Language**: TypeScript

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API URL
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Auth pages (login)
│   │   ├── (shop)/        # Shop pages
│   │   └── admin/         # Admin panel
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # Header, Footer
│   │   └── products/      # Product components
│   ├── lib/               # API client, utilities
│   ├── store/             # Zustand stores
│   └── hooks/             # Custom hooks
├── tailwind.config.ts
└── package.json
```

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

## License

MIT
