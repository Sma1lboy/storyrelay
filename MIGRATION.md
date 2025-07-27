# Database Migration Guide

## Overview

This document provides comprehensive instructions for setting up and migrating the StoryRelay database using Supabase. The migration creates all necessary tables, indexes, and security policies for the collaborative storytelling platform.

## Database Schema Overview

The StoryRelay application uses three main tables:
- **stories**: Main narrative storage with active story tracking
- **submissions**: User-contributed story continuations with voting rounds
- **votes**: Vote tracking with duplicate prevention

## Migration Methods

### Method 1: Supabase Dashboard (Recommended for Initial Setup)

#### Prerequisites
- Supabase account with a project created
- Project URL and anon key configured in your environment

#### Steps

1. **Access Supabase Dashboard**
   ```
   https://app.supabase.com/project/[your-project-id]
   ```

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Execute Migration Script**
   - Copy the entire content from `database.sql`
   - Paste into the SQL editor
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

4. **Verify Execution**
   - Check for green success messages
   - Ensure no error messages appear
   - Verify tables appear in Database → Tables section

#### Expected Output
```
CREATE TABLE
CREATE TABLE  
CREATE TABLE
INSERT 0 1
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

### Method 2: Supabase CLI (Recommended for Development Teams)

#### Prerequisites
- Node.js 18+ installed
- Supabase CLI installed globally
- Git repository initialized

#### Installation
```bash
npm install -g supabase
```

#### Setup Process

1. **Initialize Supabase in Project**
   ```bash
   supabase init
   ```
   This creates a `supabase/` directory with configuration files.

2. **Link to Remote Project**
   ```bash
   supabase link --project-ref your-project-reference-id
   ```
   Find your project reference ID in Supabase Dashboard → Settings → General.

3. **Create Migration File**
   ```bash
   supabase migration new initial_storyrelay_schema
   ```
   This creates: `supabase/migrations/[timestamp]_initial_storyrelay_schema.sql`

4. **Add Migration Content**
   Copy content from `database.sql` to the new migration file.

5. **Apply Migration**
   ```bash
   supabase db push
   ```

6. **Verify Migration**
   ```bash
   supabase db diff
   ```
   Should show no differences if migration was successful.

#### CLI Commands Reference
```bash
# Check migration status
supabase migration list

# Create new migration
supabase migration new <migration_name>

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --linked > types/supabase.ts
```

### Method 3: Step-by-Step Manual Migration

For educational purposes or troubleshooting, you can run the migration in stages:

#### Stage 1: Core Tables
```sql
-- Create stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 50),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  round_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, user_id)
);
```

#### Stage 2: Initial Data
```sql
-- Insert starter story
INSERT INTO stories (content, is_active) 
VALUES ('Once upon a time, there was a mysterious city...', TRUE);
```

#### Stage 3: Security Policies
```sql
-- Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create read policies (public access)
CREATE POLICY "Stories are viewable by everyone" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Submissions are viewable by everyone" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

-- Create write policies (authenticated users only)
CREATE POLICY "Users can insert their own submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

#### Stage 4: Performance Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_stories_active ON stories(is_active);
CREATE INDEX idx_submissions_story_id ON submissions(story_id);
CREATE INDEX idx_submissions_round_end ON submissions(round_end);
CREATE INDEX idx_votes_submission_id ON votes(submission_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
```

## Schema Details

### Stories Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated unique identifier |
| content | TEXT | NOT NULL | The complete story content |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Story creation timestamp |
| is_active | BOOLEAN | DEFAULT TRUE | Whether this story accepts new submissions |

**Business Rules:**
- Only one story should be active at a time
- Stories become inactive when reaching 1000 characters
- New stories are automatically created when current one is full

### Submissions Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated unique identifier |
| story_id | UUID | FOREIGN KEY | Reference to parent story |
| content | TEXT | NOT NULL, ≤50 chars | The story continuation sentence |
| user_id | TEXT | NOT NULL | Clerk user identifier |
| user_name | TEXT | NOT NULL | Display name for attribution |
| votes | INTEGER | DEFAULT 0 | Current vote count |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Submission timestamp |
| round_end | TIMESTAMPTZ | DEFAULT NOW() + 1h | When voting round ends |

**Business Rules:**
- One submission per user per round
- Content limited to 50 characters
- Voting rounds last 1 hour
- Submissions deleted after settlement

### Votes Table
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated unique identifier |
| submission_id | UUID | FOREIGN KEY | Reference to voted submission |
| user_id | TEXT | NOT NULL | Clerk user identifier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Vote timestamp |

**Business Rules:**
- One vote per user per round (enforced by unique constraint)
- Votes deleted after round settlement
- Cannot vote for own submissions (enforced in application)

## Row Level Security (RLS) Policies

### Read Policies (Public Access)
All tables allow public read access to support real-time updates for anonymous users:

```sql
CREATE POLICY "Stories are viewable by everyone" ON stories
  FOR SELECT USING (true);
```

### Write Policies (Authenticated Only)
Write operations require authentication and user ownership:

```sql
CREATE POLICY "Users can insert their own submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

**Important**: RLS policies depend on Clerk authentication integration. The `auth.uid()` function returns the authenticated user's ID.

## Indexes and Performance

### Query Optimization
The migration creates five indexes to optimize common queries:

1. **`idx_stories_active`**: Fast lookup of active stories
2. **`idx_submissions_story_id`**: Efficient submission filtering by story
3. **`idx_submissions_round_end`**: Quick identification of expired rounds
4. **`idx_votes_submission_id`**: Fast vote counting per submission
5. **`idx_votes_user_id`**: Rapid user vote validation

### Expected Query Performance
- Finding active story: O(1) with active index
- Loading submissions: O(log n) with story_id index
- Vote counting: O(log n) with submission_id index
- Settlement queries: O(log n) with round_end index

## Verification and Testing

### Post-Migration Checks

1. **Table Structure Verification**
   ```sql
   -- Check all tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('stories', 'submissions', 'votes');
   ```

2. **Initial Data Verification**
   ```sql
   -- Verify starter story exists
   SELECT id, content, is_active FROM stories;
   ```

3. **RLS Policy Verification**
   ```sql
   -- Check policies are enabled
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('stories', 'submissions', 'votes');
   ```

4. **Index Verification**
   ```sql
   -- List all indexes
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE tablename IN ('stories', 'submissions', 'votes');
   ```

### Functional Testing

1. **Authentication Integration Test**
   - Try inserting submission without authentication (should fail)
   - Test with valid Clerk session (should succeed)

2. **Business Logic Test**
   ```sql
   -- Test character limit constraint
   INSERT INTO submissions (story_id, content, user_id, user_name) 
   VALUES (
     (SELECT id FROM stories WHERE is_active = true),
     'This content is definitely longer than fifty characters and should fail',
     'test-user',
     'Test User'
   ); -- Should fail
   ```

3. **Real-time Subscription Test**
   - Insert new submission and verify real-time updates work
   - Test vote updates propagate to frontend

## Common Issues and Solutions

### Issue 1: RLS Policy Failures
**Symptoms**: `permission denied for table` errors
**Cause**: Authentication not properly configured
**Solution**: 
1. Verify Clerk integration is working
2. Check that `auth.uid()` returns valid user ID
3. Ensure RLS policies match your authentication pattern

### Issue 2: Foreign Key Constraint Violations
**Symptoms**: `violates foreign key constraint` errors
**Cause**: Referencing non-existent records
**Solution**:
1. Ensure parent records exist before creating children
2. Check cascade deletion is working properly
3. Verify transaction ordering in application code

### Issue 3: Character Limit Violations
**Symptoms**: `new row violates check constraint` errors
**Cause**: Submission content exceeds 50 characters
**Solution**:
1. Implement frontend validation
2. Add server-side validation in API routes
3. Consider using client-side character counting

### Issue 4: Duplicate Vote Attempts
**Symptoms**: `duplicate key value violates unique constraint` errors
**Cause**: User attempting to vote multiple times
**Solution**:
1. Check existing votes before allowing new ones
2. Implement proper error handling in vote API
3. Update UI to reflect vote status

## Rollback Procedures

### Emergency Rollback
If migration causes issues, you can rollback:

```sql
-- Drop all tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
```

### Partial Rollback
To rollback specific components:

```sql
-- Remove RLS policies only
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
DROP POLICY IF EXISTS "Submissions are viewable by everyone" ON submissions;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;

-- Disable RLS
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
```

## Production Considerations

### Before Production Migration
1. **Backup**: Create full database backup
2. **Maintenance Mode**: Put application in maintenance mode
3. **Test Environment**: Run migration in staging first
4. **Monitoring**: Set up alerts for migration process

### Post-Migration Monitoring
1. **Performance**: Monitor query execution times
2. **Error Rates**: Watch for authentication/permission errors
3. **Real-time**: Verify subscription functionality
4. **Data Integrity**: Regular constraint and foreign key checks

### Scaling Considerations
- **Connection Pooling**: Configure for expected concurrent users
- **Index Maintenance**: Monitor index usage and performance
- **Archive Strategy**: Plan for story archival as data grows
- **Backup Schedule**: Regular automated backups

## Future Migrations

### Migration Naming Convention
```
YYYYMMDD_HHMMSS_descriptive_name.sql
```

Example: `20240101_120000_add_story_categories.sql`

### Migration Template
```sql
-- Migration: [Description]
-- Date: [YYYY-MM-DD]
-- Author: [Name]

-- Add new functionality
-- ...

-- Update existing data if needed
-- ...

-- Create/update indexes
-- ...

-- Update RLS policies if needed
-- ...
```

### Version Control
- Keep all migration files in repository
- Never modify existing migration files
- Use sequential numbering or timestamps
- Include rollback scripts for complex migrations

This migration guide should be updated whenever schema changes are made to ensure accurate documentation for the development team.