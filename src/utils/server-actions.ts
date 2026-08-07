"use server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { env } from "~/env";
import { db } from "~/server/db";
import type { FlowAttestationPayload } from "./types";
import { flowPopup, socialUsers, user } from "~/server/db/schema";
import { CalculateNextStage } from "./calculate-next-stage";
import { eq } from "drizzle-orm";

export async function selectAccount(accountType: "discord" | "roblox", accountId: string) {
    const cookieStore = await cookies();
    if (!cookieStore.has("emillioid.flow-attestation")) {
        return {
            status: "error",
            message: "No flow attestation cookie found.",
        };
    }

    const flowAttestation = cookieStore.get("emillioid.flow-attestation")!.value;
    const flowAttestationPayload = await jwtVerify<FlowAttestationPayload>(flowAttestation, new TextEncoder().encode(env.BETTER_AUTH_SECRET), {
        issuer: env.BETTER_AUTH_URL,
    }).catch(() => null);

    if (!flowAttestationPayload) {
        return {
            status: "error",
            message: "Invalid flow attestation.",
        };
    }

    const flow = flowAttestationPayload.payload.flow;
    let flowData = await db.query.flowPopup.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, flow);
        },
        with: {
            client: true,
            session: {
                with: {
                    user: {
                        with: {
                            socialUsers: {
                                columns: {
                                    accountType: true,
                                    accountId: true,
                                },
                            },
                        }
                    },
                },
            },
        },
    });

    if (!flowData) {
        return {
            status: "error",
            message: "Flow not found.",
        };
    }

    if (flowData.status !== "select_account") {
        return {
            status: "error",
            message: "Flow is not in the correct state for linking.",
        };
    }

    const socialUser = await db.query.socialUsers.findFirst({
        where(fields, operators) {
            return operators.and(operators.eq(fields.accountType, accountType), operators.eq(fields.accountId, accountId), operators.eq(fields.userId, flowData.session!.userId));
        }
    })

    if (!socialUser) {
        return {
            status: "error",
            message: "Selected account not found.",
        };
    }

    const newFlowData = {...flowData, selected_account: socialUser.id};

    await db
        .update(flowPopup)
        .set({ ...newFlowData, status: await CalculateNextStage(newFlowData, flowData!.client!, flowData!.session!) })
        .where(eq(flowPopup.id, flow));
    
    return {
        status: "success",
        message: "Account selected successfully.",
    };
}

export async function linkViaTPBloxlink() {
    const cookieStore = await cookies();
    if (!cookieStore.has("emillioid.flow-attestation")) {
        return {
            status: "error",
            message: "No flow attestation cookie found.",
        };
    }

    const flowAttestation = cookieStore.get("emillioid.flow-attestation")!.value;
    const flowAttestationPayload = await jwtVerify<FlowAttestationPayload>(flowAttestation, new TextEncoder().encode(env.BETTER_AUTH_SECRET), {
        issuer: env.BETTER_AUTH_URL,
    }).catch(() => null);

    if (!flowAttestationPayload) {
        return {
            status: "error",
            message: "Invalid flow attestation.",
        };
    }

    const flow = flowAttestationPayload.payload.flow;
    let flowData = await db.query.flowPopup.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, flow);
        },
        with: {
            client: true,
            session: {
                with: {
                    user: {
                        with: {
                            socialUsers: {
                                columns: {
                                    accountType: true,
                                    accountId: true,
                                },
                            },
                        }
                    },
                },
            },
        },
    });

    if (!flowData) {
        return {
            status: "error",
            message: "Flow not found.",
        };
    }

    if (flowData.status !== "link_account") {
        return {
            status: "error",
            message: "Flow is not in the correct state for linking.",
        };
    }

    try {
        const bloxlinkFetch = await fetch(
          `https://api.blox.link/v4/public/guilds/1396311258315231292/discord-to-roblox/${flowData.session?.user.socialUsers.find((account) => account.accountType === "discord")?.accountId}`,
          {
            headers: { Authorization: env.BLOXLINK_API_KEY },
          },
        ).then((response) =>
          response.json<{
            robloxID: string;
          }>(),
        );

        if (!bloxlinkFetch.robloxID) {
            return {
                status: "error",
                message: "No account linked via Bloxlink. Please ensure you have linked your Roblox account to your Discord account using Bloxlink.",
            };
        }

        const socialUser = await db.query.socialUsers.findFirst({
            where(fields, operators) {
                return operators.and(operators.eq(fields.accountType, "roblox"), operators.eq(fields.accountId, bloxlinkFetch.robloxID));
            },
        });

        if (socialUser) {
            return {
                status: "error",
                message: "This Roblox account is already linked to another EmillioID account.",
            };
        }

        await db.insert(socialUsers).values({
            userId: flowData.session!.userId,
            accountType: "roblox",
            accountId: bloxlinkFetch.robloxID,
        });
    } catch (e) {
        console.error("Error linking via Bloxlink:", e);
        return {
            status: "error",
            message: "Failed to link account via Bloxlink.",
        }
    }
    await db
        .update(flowPopup)
        .set({ status: await CalculateNextStage(flowData!, flowData!.client!) })
        .where(eq(flowPopup.id, flow));

    return {
        status: "success",
        message: "Account linked successfully.",
    };
}