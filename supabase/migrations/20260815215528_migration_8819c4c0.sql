ALTER TABLE public.loyalty_programs 
    ADD COLUMN IF NOT EXISTS template_id VARCHAR(50) DEFAULT 'classic',
    ADD COLUMN IF NOT EXISTS bg_color VARCHAR(50),
    ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50),
    ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50),
    ADD COLUMN IF NOT EXISTS text_color VARCHAR(50),
    ADD COLUMN IF NOT EXISTS stamp_icon VARCHAR(50) DEFAULT 'star',
    ADD COLUMN IF NOT EXISTS reward_icon VARCHAR(50) DEFAULT 'gift',
    ADD COLUMN IF NOT EXISTS card_logo_url TEXT,
    ADD COLUMN IF NOT EXISTS card_bg_image_url TEXT;