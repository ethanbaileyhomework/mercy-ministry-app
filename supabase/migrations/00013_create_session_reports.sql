-- Session reports table — stores AI-generated reports per session
CREATE TABLE IF NOT EXISTS session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  report_markdown text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  model_used text,
  UNIQUE(session_id)
);

ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON session_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
