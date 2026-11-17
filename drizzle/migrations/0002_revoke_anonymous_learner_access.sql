-- Remove anonymous privileges from learner data and stop re-granting them
-- automatically to future tables created in the public schema.
revoke all privileges on table
  public.profiles,
  public.question_attempts,
  public.test_attempts
from anon;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role supabase_admin in schema public
  revoke all on tables from anon;
