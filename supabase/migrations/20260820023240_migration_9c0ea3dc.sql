CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rate_key, action)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_action_window
ON public.api_rate_limits(action, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_action
ON public.api_rate_limits(rate_key, action);

REVOKE ALL ON public.api_rate_limits FROM anon;
REVOKE ALL ON public.api_rate_limits FROM authenticated;