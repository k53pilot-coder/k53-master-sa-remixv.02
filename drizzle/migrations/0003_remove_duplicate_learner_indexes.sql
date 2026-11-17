-- The initial learner schema already created these equivalent indexes.
-- Remove the duplicate names introduced during the schema reconciliation.
drop index if exists public.question_attempts_user_created_idx;
drop index if exists public.test_attempts_user_created_idx;
