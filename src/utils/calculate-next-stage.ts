import { db } from "~/server/db";
import type { flowPopup, oauth2Client } from "~/server/db/schema";

// i'm lazy so here's the function that calculates the next stage of the application process based on data available
export async function CalculateNextStage(
  data: typeof flowPopup.$inferSelect,
  client: typeof oauth2Client.$inferSelect,
): Promise<(typeof flowPopup.status.enumValues)[number]> {
  if (!data.session_id) {
    return "forced_login";
  }

  const session = await db.query.session.findFirst({
    columns: {
      id: true,
      userId: true,
    },
    with: {
      user: {
        columns: {
          id: true,
        },
        with: {
          socialUsers: {
            columns: {
              id: true,
              accountType: true,
            },
          },
        },
      },
    },
    where(fields, operators) {
      return operators.eq(fields.id, data.session_id!);
    },
  });

  if (!session) {
    return "forced_login";
  }

  let hasRequired = false;
  const accounts = session.user.socialUsers.map((account) => account.accountType);

  for (const reqAccount of ["roblox"] as ["discord" | "roblox"]) {
    if (accounts?.includes(reqAccount)) {
      hasRequired = true;
    }
  }

  if (!hasRequired) {
    return "link_account";
  }

  if (!data.selected_account && session.user.socialUsers.length > 1) {
    return "select_account";
  }

  if (data.session_id) {
    return "link_account";
  }
  if (!data.provided_consent && client.consentNeeded) {
    return "consent_needed";
  }
  return "complete";
}
