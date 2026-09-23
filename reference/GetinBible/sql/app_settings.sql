-- App Settings Table for storing application configuration
-- Used for admin-configurable settings like Content Analysis report size

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (security handled at app level)
CREATE POLICY "Allow all operations on app_settings" ON app_settings
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Insert default content analysis settings
INSERT INTO app_settings (key, value)
VALUES ('content_analysis_settings', '{"wordLimit": 250}'::jsonb)
ON CONFLICT (key) DO NOTHING;
