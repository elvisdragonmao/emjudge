import { z } from "zod";

export const ClassMemberRole = z.enum(["teacher", "student"]);
export type ClassMemberRole = z.infer<typeof ClassMemberRole>;

export const ClassMemberSummary = z.object({
	id: z.string().uuid(),
	username: z.string(),
	displayName: z.string(),
	role: ClassMemberRole,
	createdAt: z.string().datetime()
});
export type ClassMemberSummary = z.infer<typeof ClassMemberSummary>;

export const CreateClassRequest = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).default("")
});
export type CreateClassRequest = z.infer<typeof CreateClassRequest>;

export const UpdateClassRequest = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional()
});
export type UpdateClassRequest = z.infer<typeof UpdateClassRequest>;

export const UpdateClassJoinCodeSettingsRequest = z.object({
	joinCodeEnabled: z.boolean()
});
export type UpdateClassJoinCodeSettingsRequest = z.infer<typeof UpdateClassJoinCodeSettingsRequest>;

export const JoinClassByCodeRequest = z.object({
	code: z.string().min(4).max(32)
});
export type JoinClassByCodeRequest = z.infer<typeof JoinClassByCodeRequest>;

export const ClassJoinCodeInfo = z.object({
	enabled: z.boolean(),
	code: z.string().nullable()
});
export type ClassJoinCodeInfo = z.infer<typeof ClassJoinCodeInfo>;

export const ClassSummary = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string(),
	memberCount: z.number(),
	assignmentCount: z.number(),
	createdAt: z.string().datetime()
});
export type ClassSummary = z.infer<typeof ClassSummary>;

export const ClassDetail = ClassSummary.extend({
	joinCode: ClassJoinCodeInfo.optional(),
	members: z.array(ClassMemberSummary)
});
export type ClassDetail = z.infer<typeof ClassDetail>;

export const AddClassMembersRequest = z.object({
	userIds: z.array(z.string().uuid()).min(1)
});
export type AddClassMembersRequest = z.infer<typeof AddClassMembersRequest>;

export const RemoveClassMemberRequest = z.object({
	userId: z.string().uuid()
});
export type RemoveClassMemberRequest = z.infer<typeof RemoveClassMemberRequest>;

export const UpdateClassMemberRoleRequest = z.object({
	userId: z.string().uuid(),
	role: ClassMemberRole
});
export type UpdateClassMemberRoleRequest = z.infer<typeof UpdateClassMemberRoleRequest>;

export const ClassCumulativeScorePoint = z.object({
	userId: z.string().uuid(),
	userName: z.string(),
	date: z.string(),
	totalScore: z.number(),
	assignmentTitle: z.string()
});
export type ClassCumulativeScorePoint = z.infer<typeof ClassCumulativeScorePoint>;
