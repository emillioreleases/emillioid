import type { flowPopup, oauth2Client } from "~/server/db/schema";

// i'm lazy so here's the function that calculates the next stage of the application process based on data available
export function CalculateNextStage(
  data: typeof flowPopup.$inferSelect,
  client: typeof oauth2Client.$inferSelect,
): (typeof flowPopup.status.enumValues)[number] {
  if (!data.session_id) {
    return "forced_login";
  }
  if (!data.selected_account) {
    return "select_account";
  }
  if (!data.provided_consent && client.consentNeeded) {
    return "consent_needed";
  }
  return "complete";
}
