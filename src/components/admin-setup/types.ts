import { TEMPLATE_PRESETS } from "@/lib/cardTemplatePresets";

export type SetupAssetKind = "card_logo" | "card_banner" | "business_logo";

export type SetupProgramDraft = {
  name: string;
  description: string;
  stamp_target: number;
  reward_title: string;
  reward_description: string;
  reward_expiration_days: number | null;
  template_id: string;
  bg_color: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  stamp_icon: string;
  reward_icon: string;
  card_logo_url: string;
  card_banner_url: string;
};

export type SetupBrandingDraft = {
  logo: string;
  primary_color: string;
  secondary_color: string;
};

export type SetupLiveProgram = {
  id: string;
  name: string | null;
  description: string | null;
  stamp_target: number | null;
  reward_title: string | null;
  reward_description: string | null;
  reward_expiration_days: number | null;
  template_id: string | null;
  bg_color: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  text_color: string | null;
  stamp_icon: string | null;
  reward_icon: string | null;
  card_logo_url: string | null;
  card_banner_url: string | null;
  active: boolean | null;
};

export type SetupWorkspace = {
  session: { id: string; requestId: string; startedAt: string; expiresAt: string };
  business: { id: string; name: string; logo: string; primary_color: string; secondary_color: string };
  entitlements: { hasPremiumTemplates: boolean; canUseRewardExpiration: boolean };
  livePrograms: SetupLiveProgram[];
  draft: {
    targetProgramId: string | null;
    branding: Partial<SetupBrandingDraft>;
    program: Partial<SetupProgramDraft>;
    updatedAt: string;
  } | null;
};

const classicPreset = TEMPLATE_PRESETS.find((preset) => preset.id === "classic") || TEMPLATE_PRESETS[0];

export const DEFAULT_SETUP_PROGRAM: SetupProgramDraft = {
  name: "",
  description: "",
  stamp_target: 10,
  reward_title: "",
  reward_description: "",
  reward_expiration_days: null,
  template_id: classicPreset.id,
  ...classicPreset.defaults,
  card_logo_url: "",
  card_banner_url: "",
};

export function programFromLive(program: SetupLiveProgram): SetupProgramDraft {
  return {
    name: program.name || "",
    description: program.description || "",
    stamp_target: program.stamp_target || DEFAULT_SETUP_PROGRAM.stamp_target,
    reward_title: program.reward_title || "",
    reward_description: program.reward_description || "",
    reward_expiration_days: program.reward_expiration_days ?? null,
    template_id: program.template_id || DEFAULT_SETUP_PROGRAM.template_id,
    bg_color: program.bg_color || DEFAULT_SETUP_PROGRAM.bg_color,
    primary_color: program.primary_color || DEFAULT_SETUP_PROGRAM.primary_color,
    secondary_color: program.secondary_color || "",
    text_color: program.text_color || DEFAULT_SETUP_PROGRAM.text_color,
    stamp_icon: program.stamp_icon || DEFAULT_SETUP_PROGRAM.stamp_icon,
    reward_icon: program.reward_icon || DEFAULT_SETUP_PROGRAM.reward_icon,
    card_logo_url: program.card_logo_url || "",
    card_banner_url: program.card_banner_url || "",
  };
}