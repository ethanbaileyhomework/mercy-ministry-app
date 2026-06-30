-- Session reports table — stores AI-generated reports per session
-- Note: production schema uses jsonb columns (ai_sections, report_data)
-- rather than report_markdown. This migration reflects the actual production schema.

CREATE TABLE IF NOT EXISTS session_reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  session_date    date        NOT NULL,
  ai_sections     jsonb       NOT NULL,
  report_data     jsonb       NOT NULL,
  google_drive_url      text,
  google_drive_file_id  text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON session_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
