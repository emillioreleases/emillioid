import { relations } from "drizzle-orm/relations";
import { bcpsOryloginUser, bcpsOryloginAccount, bcpsOryloginPost, bcpsOryloginSession, bcpsOryloginOauth2Client, bcpsOryloginOauth2Consent, bcpsOryloginOauth2LoginAttempt, bcpsOryloginOauth2LoginSession } from "./schema";

export const bcpsOryloginAccountRelations = relations(bcpsOryloginAccount, ({one}) => ({
	bcpsOryloginUser: one(bcpsOryloginUser, {
		fields: [bcpsOryloginAccount.userId],
		references: [bcpsOryloginUser.id]
	}),
}));

export const bcpsOryloginUserRelations = relations(bcpsOryloginUser, ({many}) => ({
	bcpsOryloginAccounts: many(bcpsOryloginAccount),
	bcpsOryloginPosts: many(bcpsOryloginPost),
	bcpsOryloginSessions: many(bcpsOryloginSession),
	bcpsOryloginOauth2LoginAttempts: many(bcpsOryloginOauth2LoginAttempt),
	bcpsOryloginOauth2LoginSessions: many(bcpsOryloginOauth2LoginSession),
}));

export const bcpsOryloginPostRelations = relations(bcpsOryloginPost, ({one}) => ({
	bcpsOryloginUser: one(bcpsOryloginUser, {
		fields: [bcpsOryloginPost.createdById],
		references: [bcpsOryloginUser.id]
	}),
}));

export const bcpsOryloginSessionRelations = relations(bcpsOryloginSession, ({one, many}) => ({
	bcpsOryloginUser: one(bcpsOryloginUser, {
		fields: [bcpsOryloginSession.userId],
		references: [bcpsOryloginUser.id]
	}),
	bcpsOryloginOauth2LoginSessions: many(bcpsOryloginOauth2LoginSession),
}));

export const bcpsOryloginOauth2ConsentRelations = relations(bcpsOryloginOauth2Consent, ({one}) => ({
	bcpsOryloginOauth2Client: one(bcpsOryloginOauth2Client, {
		fields: [bcpsOryloginOauth2Consent.clientId],
		references: [bcpsOryloginOauth2Client.id]
	}),
}));

export const bcpsOryloginOauth2ClientRelations = relations(bcpsOryloginOauth2Client, ({many}) => ({
	bcpsOryloginOauth2Consents: many(bcpsOryloginOauth2Consent),
	bcpsOryloginOauth2LoginAttempts: many(bcpsOryloginOauth2LoginAttempt),
	bcpsOryloginOauth2LoginSessions: many(bcpsOryloginOauth2LoginSession),
}));

export const bcpsOryloginOauth2LoginAttemptRelations = relations(bcpsOryloginOauth2LoginAttempt, ({one}) => ({
	bcpsOryloginUser: one(bcpsOryloginUser, {
		fields: [bcpsOryloginOauth2LoginAttempt.userId],
		references: [bcpsOryloginUser.id]
	}),
	bcpsOryloginOauth2Client: one(bcpsOryloginOauth2Client, {
		fields: [bcpsOryloginOauth2LoginAttempt.clientId],
		references: [bcpsOryloginOauth2Client.id]
	}),
}));

export const bcpsOryloginOauth2LoginSessionRelations = relations(bcpsOryloginOauth2LoginSession, ({one}) => ({
	bcpsOryloginOauth2Client: one(bcpsOryloginOauth2Client, {
		fields: [bcpsOryloginOauth2LoginSession.clientId],
		references: [bcpsOryloginOauth2Client.id]
	}),
	bcpsOryloginUser: one(bcpsOryloginUser, {
		fields: [bcpsOryloginOauth2LoginSession.userId],
		references: [bcpsOryloginUser.id]
	}),
	bcpsOryloginSession: one(bcpsOryloginSession, {
		fields: [bcpsOryloginOauth2LoginSession.sessionId],
		references: [bcpsOryloginSession.id]
	}),
}));