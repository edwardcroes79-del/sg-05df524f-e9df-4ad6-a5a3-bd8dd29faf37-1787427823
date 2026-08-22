ALTER TABLE businesses 
ADD COLUMN approval_email_status text DEFAULT 'pending',
ADD COLUMN approval_email_error text;