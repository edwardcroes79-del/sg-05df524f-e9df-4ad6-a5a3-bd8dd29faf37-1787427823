ALTER TABLE businesses 
ADD COLUMN admin_notify_status text DEFAULT 'pending',
ADD COLUMN admin_notify_error text;