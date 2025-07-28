# StoryRelay - Global Collaborative Storytelling

A minimalist platform for global collaborative story creation where users can write continuations to ongoing stories, with the best submissions selected through a voting mechanism.

_AI vibe coding project_ - This project was developed entirely without human intervention, exploring the boundaries of AI development with all the fancy cutting-edge context systems.

## Features

- 🌍 Global collaborative storytelling
- ✍️ Each user can write one continuation sentence per round (50 character limit)
- 🗳️ Vote to select the best continuations
- ⏰ Automatic hourly settlement adds highest-voted sentences to the main story
- 🔐 Secure user authentication with Clerk
- 🎨 Responsive design with mobile support

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Authentication**: Clerk
- **Database**: Supabase
- **Deployment**: Vercel

## Quick Start

### 1. Environment Setup

Copy the environment template and fill in your configuration:

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
# Clerk - Get these from https://clerk.com after creating an app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase - Get these from https://supabase.com after creating a project
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Database Setup

Execute the SQL statements from `database.sql` in your Supabase project:

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to "SQL Editor"
4. Copy and execute all SQL from `database.sql`

### 3. Install Dependencies and Run

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

The application will start at [http://localhost:3000](http://localhost:3000).

### 4. Clerk Configuration

1. In [Clerk Dashboard](https://dashboard.clerk.com):
   - Enable Google and GitHub social login (optional)
   - Configure user fields and permissions
   - Add your domain to the allowlist

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── submit/         # Submit story continuations
│   │   ├── vote/           # Voting endpoint
│   │   └── settle/         # Automatic settlement
│   ├── sign-in/            # Sign-in pages
│   ├── sign-up/            # Sign-up pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/             # React components
│   ├── Story.tsx          # Story display
│   ├── SubmitForm.tsx     # Story submission form
│   └── VoteList.tsx       # Voting list
├── lib/
│   └── supabase.ts        # Supabase client
├── middleware.ts          # Clerk middleware
└── database.sql          # Database schema
```

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Scheduled Tasks (Optional)

To automatically execute hourly vote settlements, you can:

1. Use Vercel Cron Jobs
2. Use GitHub Actions
3. Use Supabase Edge Functions

Add a scheduled task to call the `/api/settle` endpoint.

## Development Roadmap

- [ ] Add story history viewing
- [ ] Implement user statistics dashboard
- [ ] Support multi-language stories
- [ ] Add story categories and tags
- [ ] Implement real-time notifications

## License

MIT
