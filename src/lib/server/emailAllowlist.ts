export type AppEmailPurpose =
  | "business_registration_confirmation"
  | "business_registration_admin_notification"
  | "business_approval_confirmation"
  | "password_reset"
  | "customer_stamp_receipt"
  | "setup_assistance_superadmin_request"
  | "setup_assistance_superadmin_status"
  | "setup_assistance_business_status"
  | "contract_reminder_business_admin"
  | "contract_reminder_super_admin";

const ALLOWED_EMAIL_PURPOSES = new Set<AppEmailPurpose>([
  "business_registration_confirmation",
  "business_registration_admin_notification",
  "business_approval_confirmation",
  "password_reset",
]);

export function isEmailPurposeAllowed(purpose: AppEmailPurpose) {
  return ALLOWED_EMAIL_PURPOSES.has(purpose);
}

export function assertEmailPurposeAllowed(purpose: AppEmailPurpose) {
  if (!isEmailPurposeAllowed(purpose)) {
    throw new Error(`Email purpose blocked: ${purpose}`);
  }
}