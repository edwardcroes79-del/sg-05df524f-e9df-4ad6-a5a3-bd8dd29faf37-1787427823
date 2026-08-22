ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_business_id_email_type_key UNIQUE (business_id, email_type);