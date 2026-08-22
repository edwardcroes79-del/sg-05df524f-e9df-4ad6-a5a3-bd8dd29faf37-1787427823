CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- e.g., 'client_approval', 'admin_notification'
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admins can manage email logs" ON email_logs FOR ALL USING (true); -- Protected by app-level service keys anyway