-- Enable REPLICA IDENTITY FULL on core tables to allow column-filtered real-time updates
ALTER TABLE customer_loyalty_cards REPLICA IDENTITY FULL;
ALTER TABLE rewards REPLICA IDENTITY FULL;
ALTER TABLE stamp_transactions REPLICA IDENTITY FULL;

SELECT 'Successfully set REPLICA IDENTITY FULL' as status;