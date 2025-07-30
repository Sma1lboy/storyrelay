# Supabase Database Migration Guide

This document outlines the process for managing database migrations for the StoryRelay project using the Supabase CLI. We have adopted a structured migration workflow to ensure consistency and reliability across all environments.

## Migration Philosophy

All database schema changes are managed through versioned SQL migration files located in the `supabase/migrations` directory. This approach provides a clear, repeatable, and automated way to keep the database schema up-to-date.

**DO NOT** make schema changes directly in the Supabase Dashboard, as they will not be tracked and can lead to inconsistencies between environments.

## Initial Setup

If you are setting up the project for the first time, you only need to run the remote migrations.

### 1. Link Your Project

First, link your local environment to your Supabase project. You will need your project's reference ID, which can be found in your project's dashboard URL (`https://app.supabase.com/project/[ref-id-here]`).

```bash
bunx supabase login
bunx supabase link --project-ref <your-project-ref-id>
```

### 2. Push Migrations

Once linked, apply all existing migrations to your remote database:

```bash
bunx supabase db push
```

This command will execute all migration scripts in the `supabase/migrations` directory in sequential order, bringing your database schema to the latest version.

## Creating a New Migration

When you need to make a change to the database schema (e.g., add a table, alter a column), follow these steps:

### 1. Ensure Your Local Database is Up-to-Date

If you have a local database instance, reset it to match the remote schema:

```bash
# WARNING: This will delete all local data.
bunx supabase db reset
```

### 2. Create a New Migration File

Generate a new migration file with a descriptive name:

```bash
bunx supabase migration new <your-migration-name>
```

For example:

```bash
bunx supabase migration new add_user_profiles
```

This will create a new, timestamped SQL file in the `supabase/migrations` directory.

### 3. Write Your SQL

Open the newly created file and add your SQL statements. Include comments to explain the purpose of the changes.

### 4. Apply and Test Locally (Optional)

If you are running a local Supabase instance, apply the migration to test it:

```bash
bunx supabase db push
```

### 5. Apply to Remote Database

Once you are confident in your changes, apply the migration to the staging or production environment:

```bash
bunx supabase db push
```

## Migration Files

Here is an overview of the existing migration files:

### `0001_initial_schema.sql`

- **Purpose**: Establishes the core database schema.
- **Contains**:
  - `stories`, `submissions`, and `votes` table creation.
  - Comprehensive Row-Level Security (RLS) policies designed for API-level authentication (via Clerk).
  - The `increment_votes()` PostgreSQL function for atomic vote updates.
  - Performance indexes and an initial story record.

### `0002_add_processed_column.sql`

- **Purpose**: Enhances the `submissions` table for the settlement process.
- **Contains**:
  - Adds a `processed` boolean column to the `submissions` table.
  - Adds several indexes to optimize queries related to finding unprocessed submissions.

### `0003_update_to_chinese_story.sql` (Optional)

- **Purpose**: An optional script to set the initial story's content to Chinese.
- **Note**: This is not a core schema migration and should be run manually if desired. It is kept separate to distinguish between schema and content changes.

## Troubleshooting

- **RLS Issues**: The initial schema (`0001_initial_schema.sql`) includes permissive RLS policies that should prevent common issues where vote counts or other fields fail to update. If you encounter permission errors, ensure this migration has been applied correctly.
- **Migration Conflicts**: If you are working in a team, always pull the latest changes from the repository before creating a new migration to avoid conflicts.
