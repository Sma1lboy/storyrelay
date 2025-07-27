# StoryRelay Development Documentation

## Project Overview

StoryRelay is a global collaborative storytelling platform built with Next.js 15, Clerk authentication, and Supabase database. Users can contribute to ongoing stories by writing continuation sentences and voting for the best submissions.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk (social login support)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Deployment**: Vercel
- **Package Manager**: Bun

### Core Concepts
- **Stories**: Main narrative threads with a 1000-character limit
- **Submissions**: User-contributed continuation sentences (50-character limit)
- **Voting**: One vote per user per round system
- **Settlement**: Hourly automated process to select winning submissions

## Project Structure

```
my-clerk-app/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── settle/route.ts     # Automated settlement endpoint
│   │   ├── submit/route.ts     # Story submission handler
│   │   └── vote/route.ts       # Voting handler
│   ├── sign-in/                # Clerk authentication pages
│   │   └── [[...sign-in]]/page.tsx
│   ├── sign-up/
│   │   └── [[...sign-up]]/page.tsx
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout with Clerk provider
│   └── page.tsx                # Homepage
├── components/                 # React components
│   ├── Story.tsx              # Story display with real-time updates
│   ├── SubmitForm.tsx         # Story submission form
│   └── VoteList.tsx           # Voting interface
├── lib/                       # Utilities
│   └── supabase.ts            # Database client and types
├── middleware.ts              # Clerk authentication middleware
├── database.sql               # Database schema and initial data
├── .env.example               # Environment variables template
├── README.md                  # User documentation
└── DEVELOPMENT.md             # This file
```

## Database Schema

### Tables

#### `stories`
- Primary narrative storage
- Tracks active story state
- Auto-generates new stories when reaching character limit

```sql
stories (
  id: uuid PRIMARY KEY,
  content: text NOT NULL,
  created_at: timestamp DEFAULT NOW(),
  is_active: boolean DEFAULT TRUE
)
```

#### `submissions`
- User story continuations
- Includes voting round timing
- Character limit enforced at database level

```sql
submissions (
  id: uuid PRIMARY KEY,
  story_id: uuid REFERENCES stories(id),
  content: text CHECK (char_length(content) <= 50),
  user_id: text NOT NULL,
  user_name: text NOT NULL,
  votes: integer DEFAULT 0,
  created_at: timestamp DEFAULT NOW(),
  round_end: timestamp DEFAULT (NOW() + INTERVAL '1 hour')
)
```

#### `votes`
- Vote tracking with duplicate prevention
- Links users to submissions

```sql
votes (
  id: uuid PRIMARY KEY,
  submission_id: uuid REFERENCES submissions(id),
  user_id: text NOT NULL,
  created_at: timestamp DEFAULT NOW(),
  UNIQUE(submission_id, user_id)
)
```

### Row Level Security (RLS)
- Public read access for all tables
- Write restrictions based on authenticated user ID
- Prevents data manipulation by unauthorized users

## Component Architecture

### Story.tsx
**Purpose**: Displays current active story with real-time updates

**Features**:
- Real-time story updates via Supabase subscriptions
- Highlights most recent sentence
- Shows character count progress
- Loading states and error handling

**Dependencies**: Supabase client, story subscription

### SubmitForm.tsx
**Purpose**: Handles story continuation submissions

**Features**:
- Character limit validation (50 chars)
- Authentication state checking
- Form submission with error handling
- Auto-clears on successful submission

**Dependencies**: Clerk useUser hook, submit API endpoint

### VoteList.tsx
**Purpose**: Displays voting interface for submissions

**Features**:
- Real-time submission and vote updates
- One-vote-per-user enforcement
- Round countdown timer
- Voting state management

**Dependencies**: Clerk useUser hook, vote API endpoint, Supabase subscriptions

## API Endpoints

### POST `/api/submit`
**Purpose**: Handle story continuation submissions

**Authentication**: Required (Clerk)

**Validation**:
- Content length (1-50 characters)
- User hasn't submitted for current round
- Active story exists

**Process**:
1. Validate user authentication
2. Check submission constraints
3. Fetch user info from Clerk API
4. Insert submission to database

### POST `/api/vote`
**Purpose**: Handle voting for submissions

**Authentication**: Required (Clerk)

**Validation**:
- User hasn't voted in current round
- Submission exists and is active
- Round hasn't expired

**Process**:
1. Validate vote eligibility
2. Insert vote record
3. Update submission vote count

### POST `/api/settle`
**Purpose**: Automated settlement process

**Authentication**: None (called by scheduled tasks)

**Process**:
1. Find expired submissions
2. Select highest-voted submission
3. Add to main story or create new story
4. Clean up processed submissions and votes

## Real-time Features

### Supabase Subscriptions
- **Story Updates**: Automatic refresh when story content changes
- **Submission Updates**: Live vote counts and new submissions
- **Vote Updates**: Real-time voting state changes

### Implementation Pattern
```typescript
const channel = supabase
  .channel('updates')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'stories' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe()
```

## Authentication Flow

### Clerk Integration
- **Social Login**: Google, GitHub support
- **Session Management**: Automatic token refresh
- **Route Protection**: Middleware-based authentication
- **User Context**: React hooks for user state

### Protected Routes
- Submit story continuations
- Vote on submissions
- User-specific data access

### Public Routes
- Story viewing
- General app navigation
- Authentication pages

## Development Workflow

### Environment Setup
1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Configure Clerk and Supabase credentials
4. Run database migrations
5. Start development server

### Database Migrations
Execute `database.sql` in Supabase SQL Editor:
- Creates tables with proper constraints
- Sets up RLS policies
- Inserts initial story data
- Creates performance indexes

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended configuration
- **Components**: Functional components with hooks
- **Error Handling**: Comprehensive try-catch blocks
- **Loading States**: User feedback for async operations

## Deployment Strategy

### Vercel Deployment
- **Automatic**: Push to main branch triggers deployment
- **Environment Variables**: Configure in Vercel dashboard
- **Build Process**: Next.js static generation where possible

### Scheduled Tasks
Settlement automation options:
1. **Vercel Cron Jobs**: Built-in scheduling
2. **GitHub Actions**: Custom workflow scheduling
3. **Supabase Edge Functions**: Database-level automation

### Environment Variables
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Performance Considerations

### Optimization Strategies
- **Static Generation**: Homepage and auth pages
- **Real-time Subscriptions**: Efficient change detection
- **Database Indexes**: Query performance optimization
- **Component Memoization**: Prevent unnecessary re-renders

### Scalability Features
- **RLS Policies**: Secure multi-user access
- **Vote Deduplication**: Database-level constraints
- **Character Limits**: Prevent data bloat
- **Automatic Cleanup**: Settlement process removes old data

## Testing Strategy

### Manual Testing Checklist
- [ ] User authentication (sign up/in/out)
- [ ] Story submission with validation
- [ ] Voting functionality and constraints
- [ ] Real-time updates across sessions
- [ ] Settlement process simulation
- [ ] Mobile responsiveness
- [ ] Error handling scenarios

### Future Testing
- Unit tests for components
- Integration tests for API routes
- End-to-end testing with Playwright
- Performance testing under load

## Security Measures

### Authentication Security
- **Clerk Integration**: Industry-standard security
- **Session Management**: Secure token handling
- **Route Protection**: Middleware enforcement

### Database Security
- **RLS Policies**: Row-level access control
- **Input Validation**: SQL injection prevention
- **Rate Limiting**: API endpoint protection (future)

### Data Privacy
- **Minimal Data**: Only essential user information
- **Public Stories**: No private content storage
- **GDPR Compliance**: User data deletion support

## Future Enhancements

### Planned Features
- **Story History**: Browse completed stories
- **User Profiles**: Statistics and contribution history
- **Categories**: Themed story channels
- **Notifications**: Real-time voting and settlement alerts
- **Multi-language**: International story support

### Technical Improvements
- **Caching**: Redis for performance
- **CDN**: Global content distribution
- **Analytics**: User behavior tracking
- **Mobile App**: React Native implementation

## Troubleshooting

### Common Issues
1. **Build Failures**: Check environment variables
2. **Authentication Errors**: Verify Clerk configuration
3. **Database Connection**: Confirm Supabase credentials
4. **Real-time Issues**: Check subscription setup

### Debug Tools
- Next.js build analyzer
- Supabase dashboard monitoring
- Clerk user management console
- Browser developer tools for client-side debugging

## Contributing Guidelines

### Code Standards
- Follow existing patterns and conventions
- Add TypeScript types for new functionality
- Include error handling and loading states
- Test changes across different user states

### Pull Request Process
1. Create feature branch from main
2. Implement changes with proper testing
3. Update documentation if needed
4. Submit PR with clear description
5. Address review feedback

This documentation should be updated as the project evolves and new features are added.