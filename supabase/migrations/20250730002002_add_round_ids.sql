-- Add round_ids to stories table to track rounds
ALTER TABLE public.stories
ADD COLUMN round_ids text[];

-- Add round_id to submissions table to associate a submission with a specific round
ALTER TABLE public.submissions
ADD COLUMN round_id text;

