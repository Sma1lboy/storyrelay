

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."increment_votes"("submission_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_vote_count INTEGER;
BEGIN
  -- Atomically increment the votes column and return new value
  UPDATE submissions 
  SET votes = votes + 1 
  WHERE id = submission_id
  RETURNING votes INTO new_vote_count;
  
  -- Return the new vote count
  RETURN new_vote_count;
END;
$$;


ALTER FUNCTION "public"."increment_votes"("submission_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid",
    "content" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "user_name" "text" NOT NULL,
    "votes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "round_end" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    "processed" boolean DEFAULT false,
    CONSTRAINT "submissions_content_check" CHECK (("char_length"("content") <= 50))
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."submissions"."processed" IS 'Whether this submission has been processed by settlement';



CREATE OR REPLACE VIEW "public"."unprocessed_expired_submissions" AS
 SELECT "s"."id",
    "s"."story_id",
    "s"."content",
    "s"."user_id",
    "s"."user_name",
    "s"."votes",
    "s"."created_at",
    "s"."round_end",
    "s"."processed",
    "st"."content" AS "story_content",
    "st"."is_active" AS "story_is_active"
   FROM ("public"."submissions" "s"
     JOIN "public"."stories" "st" ON (("s"."story_id" = "st"."id")))
  WHERE (("s"."processed" = false) AND ("s"."round_end" < "now"()) AND ("st"."is_active" = true))
  ORDER BY "s"."round_end" DESC, "s"."votes" DESC, "s"."created_at";


ALTER VIEW "public"."unprocessed_expired_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid",
    "user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."stories"
    ADD CONSTRAINT "stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_submission_id_user_id_key" UNIQUE ("submission_id", "user_id");



CREATE INDEX "idx_stories_active" ON "public"."stories" USING "btree" ("is_active");



CREATE INDEX "idx_submissions_processed" ON "public"."submissions" USING "btree" ("processed");



CREATE INDEX "idx_submissions_processed_round_end" ON "public"."submissions" USING "btree" ("processed", "round_end");



CREATE INDEX "idx_submissions_round_end" ON "public"."submissions" USING "btree" ("round_end");



CREATE INDEX "idx_submissions_settlement" ON "public"."submissions" USING "btree" ("story_id", "processed", "round_end" DESC, "votes" DESC, "created_at");



COMMENT ON INDEX "public"."idx_submissions_settlement" IS 'Optimized index for settlement queries';



CREATE INDEX "idx_submissions_story_id" ON "public"."submissions" USING "btree" ("story_id");



CREATE INDEX "idx_submissions_story_processed_round" ON "public"."submissions" USING "btree" ("story_id", "processed", "round_end");



CREATE INDEX "idx_votes_submission_id" ON "public"."votes" USING "btree" ("submission_id");



CREATE INDEX "idx_votes_user_id" ON "public"."votes" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all inserts to submissions" ON "public"."submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow all inserts to votes" ON "public"."votes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow all story operations" ON "public"."stories" USING (true) WITH CHECK (true);



CREATE POLICY "Submissions are viewable by everyone" ON "public"."submissions" FOR SELECT USING (true);



CREATE POLICY "Votes are viewable by everyone" ON "public"."votes" FOR SELECT USING (true);



ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stories_delete_policy" ON "public"."stories" FOR DELETE USING (true);



CREATE POLICY "stories_insert_policy" ON "public"."stories" FOR INSERT WITH CHECK (true);



CREATE POLICY "stories_select_policy" ON "public"."stories" FOR SELECT USING (true);



CREATE POLICY "stories_update_policy" ON "public"."stories" FOR UPDATE USING (true);



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_delete_policy" ON "public"."submissions" FOR DELETE USING (true);



CREATE POLICY "submissions_insert_policy" ON "public"."submissions" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "submissions_select_policy" ON "public"."submissions" FOR SELECT USING (true);



CREATE POLICY "submissions_update_policy" ON "public"."submissions" FOR UPDATE USING (true);



ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_delete_policy" ON "public"."votes" FOR DELETE USING (true);



CREATE POLICY "votes_insert_policy" ON "public"."votes" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "votes_select_policy" ON "public"."votes" FOR SELECT USING (true);



CREATE POLICY "votes_update_policy" ON "public"."votes" FOR UPDATE USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."increment_votes"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_votes"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_votes"("submission_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."unprocessed_expired_submissions" TO "anon";
GRANT ALL ON TABLE "public"."unprocessed_expired_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."unprocessed_expired_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
