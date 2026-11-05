-- ADR-001 spike: team-scoped RLS proof (2026-11-05). Run on a throwaway Neon branch only.
-- Fixture data is synthetic.
CREATE SCHEMA IF NOT EXISTS app;
CREATE ROLE app_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER NOINHERIT;
GRANT USAGE ON SCHEMA app TO app_runtime;

CREATE TABLE app.teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, age_group text NOT NULL);
CREATE TABLE app.memberships (
  user_id text NOT NULL,
  team_id uuid NOT NULL REFERENCES app.teams(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('head_coach','assistant')),
  PRIMARY KEY (user_id, team_id));
CREATE TABLE app.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES app.teams(id) ON DELETE CASCADE,
  skill text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_by text NOT NULL);

ALTER TABLE app.teams ENABLE ROW LEVEL SECURITY;       ALTER TABLE app.teams FORCE ROW LEVEL SECURITY;
ALTER TABLE app.memberships ENABLE ROW LEVEL SECURITY; ALTER TABLE app.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.assessments ENABLE ROW LEVEL SECURITY; ALTER TABLE app.assessments FORCE ROW LEVEL SECURITY;

CREATE FUNCTION app.current_user_id() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;

CREATE POLICY memberships_self ON app.memberships FOR SELECT TO app_runtime
  USING (user_id = app.current_user_id());
CREATE POLICY teams_member ON app.teams FOR SELECT TO app_runtime
  USING (id IN (SELECT team_id FROM app.memberships WHERE user_id = app.current_user_id()));
CREATE POLICY assess_select ON app.assessments FOR SELECT TO app_runtime
  USING (team_id IN (SELECT team_id FROM app.memberships WHERE user_id = app.current_user_id()));
CREATE POLICY assess_insert ON app.assessments FOR INSERT TO app_runtime
  WITH CHECK (created_by = app.current_user_id()
    AND team_id IN (SELECT team_id FROM app.memberships WHERE user_id = app.current_user_id()));
CREATE POLICY assess_update ON app.assessments FOR UPDATE TO app_runtime
  USING (team_id IN (SELECT team_id FROM app.memberships WHERE user_id = app.current_user_id()))
  WITH CHECK (team_id IN (SELECT team_id FROM app.memberships WHERE user_id = app.current_user_id()));

GRANT SELECT ON app.teams, app.memberships TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON app.assessments TO app_runtime;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_runtime;
GRANT app_runtime TO CURRENT_USER;

-- Fixtures: two teams, one coach each
INSERT INTO app.teams (id, name, age_group) VALUES
  ('00000000-0000-0000-0000-00000000000a','Team A','U12'),
  ('00000000-0000-0000-0000-00000000000b','Team B','U14');
INSERT INTO app.memberships VALUES
  ('coach-a','00000000-0000-0000-0000-00000000000a','head_coach'),
  ('coach-b','00000000-0000-0000-0000-00000000000b','head_coach');
INSERT INTO app.assessments (team_id, skill, rating, created_by) VALUES
  ('00000000-0000-0000-0000-00000000000a','passing',3,'coach-a'),
  ('00000000-0000-0000-0000-00000000000b','shooting',4,'coach-b');

-- Per-request pattern used by the tests (inside one transaction):
--   SET LOCAL ROLE app_runtime;
--   SELECT set_config('app.user_id', '<verified user id>', true);
