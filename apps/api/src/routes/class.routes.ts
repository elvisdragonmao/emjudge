import {
	AddClassMembersRequest,
	ClassCumulativeScorePoint,
	ClassDetail,
	ClassJoinCodeInfo,
	ClassSummary,
	CreateClassRequest,
	IdParam,
	JoinClassByCodeRequest,
	MessageResponse,
	RemoveClassMemberRequest,
	UpdateClassJoinCodeSettingsRequest,
	UpdateClassMemberRoleRequest,
	UpdateClassRequest,
	UserSummary
} from "@judge/shared";
import type { FastifyInstance } from "fastify";
import { authSecurity, createRouteSchema, toJsonSchema, withErrorResponses } from "../lib/openapi.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as classService from "../services/class.service.js";

export async function classRoutes(app: FastifyInstance) {
	// List classes (staff: all, student: only enrolled)
	app.get(
		"/api/classes",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "List classes",
				security: authSecurity,
				response: withErrorResponses(
					{
						200: toJsonSchema(ClassSummary.array(), "ClassSummaryList")
					},
					[401]
				)
			})
		},
		async request => {
			if (request.userRole === "admin") {
				return classService.listClasses();
			}
			return classService.listClassesForUser(request.userId);
		}
	);

	app.get(
		"/api/classes/:id/available-members",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "List users available to add to class",
				security: authSecurity,
				params: toJsonSchema(IdParam, "AvailableClassMembersIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(UserSummary.array(), "AvailableClassMembersResponse")
					},
					[401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			return classService.listAvailableMembers(id);
		}
	);

	// Get class detail
	app.get(
		"/api/classes/:id",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Get class detail",
				security: authSecurity,
				params: toJsonSchema(IdParam, "IdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(ClassDetail, "ClassDetail")
					},
					[401, 403, 404]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);

			const canView = await classService.canViewClass(request.userId, request.userRole, id);
			if (!canView) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}

			const cls = await classService.getClassDetail(id, request.userRole === "admin");
			if (!cls) {
				return reply.status(404).send({ error: "班級不存在", statusCode: 404 });
			}
			return cls;
		}
	);

	app.post(
		"/api/classes/join-by-code",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Join class by code",
				security: authSecurity,
				body: toJsonSchema(JoinClassByCodeRequest, "JoinClassByCodeRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "JoinClassByCodeResponse")
					},
					[400, 401, 403, 404, 409]
				)
			})
		},
		async (request, reply) => {
			const body = JoinClassByCodeRequest.parse(request.body);
			const result = await classService.joinClassByCode(body.code, request.userId);

			if (result.type === "not_found") {
				return reply.status(404).send({ error: "班級代碼無效", statusCode: 404 });
			}

			if (result.type === "disabled") {
				return reply.status(403).send({ error: "此班級已停用代碼加入", statusCode: 403 });
			}

			if (result.type === "already_joined") {
				return reply.status(409).send({ error: "你已經加入這個班級", statusCode: 409 });
			}

			return { message: "已加入班級" };
		}
	);

	// Get cumulative class score history
	app.get(
		"/api/classes/:id/score-history",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Get class score history",
				security: authSecurity,
				params: toJsonSchema(IdParam, "ClassIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(ClassCumulativeScorePoint.array(), "ClassCumulativeScorePointList")
					},
					[401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);

			const canView = await classService.canViewClass(request.userId, request.userRole, id);
			if (!canView) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}

			return classService.getClassScoreHistory(id);
		}
	);

	// Create class (staff only)
	app.post(
		"/api/classes",
		{
			preHandler: requireRole("admin", "teacher"),
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Create class",
				security: authSecurity,
				body: toJsonSchema(CreateClassRequest, "CreateClassRequest"),
				response: withErrorResponses(
					{
						201: toJsonSchema(ClassSummary, "CreatedClassSummary")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const body = CreateClassRequest.parse(request.body);
			const cls = await classService.createClass(body.name, body.description, request.userId);
			return reply.status(201).send(cls);
		}
	);

	// Update class
	app.patch(
		"/api/classes/:id",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Update class",
				security: authSecurity,
				params: toJsonSchema(IdParam, "UpdateClassIdParam"),
				body: toJsonSchema(UpdateClassRequest, "UpdateClassRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "ClassUpdatedResponse")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const body = UpdateClassRequest.parse(request.body);
			await classService.updateClass(id, body);
			return { message: "班級已更新" };
		}
	);

	app.patch(
		"/api/classes/:id/join-code",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Update class join code settings",
				security: authSecurity,
				params: toJsonSchema(IdParam, "UpdateJoinCodeClassIdParam"),
				body: toJsonSchema(UpdateClassJoinCodeSettingsRequest, "UpdateClassJoinCodeSettingsRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(ClassJoinCodeInfo, "UpdatedClassJoinCodeInfo")
					},
					[400, 401, 403, 404]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const body = UpdateClassJoinCodeSettingsRequest.parse(request.body);
			await classService.updateClass(id, { joinCodeEnabled: body.joinCodeEnabled });
			const settings = await classService.getJoinCodeSettings(id);
			if (!settings) {
				return reply.status(404).send({ error: "班級不存在", statusCode: 404 });
			}
			return settings;
		}
	);

	app.post(
		"/api/classes/:id/join-code/reissue",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Reissue class join code",
				security: authSecurity,
				params: toJsonSchema(IdParam, "ReissueJoinCodeClassIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(ClassJoinCodeInfo, "ReissuedClassJoinCodeInfo")
					},
					[401, 403, 404]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const settings = await classService.reissueJoinCode(id);
			if (!settings) {
				return reply.status(404).send({ error: "班級不存在", statusCode: 404 });
			}
			return settings;
		}
	);

	// Add members
	app.post(
		"/api/classes/:id/members",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Add class members",
				security: authSecurity,
				params: toJsonSchema(IdParam, "AddClassMemberIdParam"),
				body: toJsonSchema(AddClassMembersRequest, "AddClassMembersRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "ClassMembersAddedResponse")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const body = AddClassMembersRequest.parse(request.body);
			await classService.addMembers(id, body.userIds);
			return { message: "成員已加入" };
		}
	);

	// Remove member
	app.delete(
		"/api/classes/:id/members",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Remove class member",
				security: authSecurity,
				params: toJsonSchema(IdParam, "RemoveClassMemberIdParam"),
				body: toJsonSchema(RemoveClassMemberRequest, "RemoveClassMemberRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "ClassMemberRemovedResponse")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const body = RemoveClassMemberRequest.parse(request.body);
			await classService.removeMember(id, body.userId);
			return { message: "成員已移除" };
		}
	);

	app.patch(
		"/api/classes/:id/members/role",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Classes"],
				summary: "Update class member role",
				security: authSecurity,
				params: toJsonSchema(IdParam, "UpdateClassMemberRoleIdParam"),
				body: toJsonSchema(UpdateClassMemberRoleRequest, "UpdateClassMemberRoleRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "ClassMemberRoleUpdatedResponse")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}

			const body = UpdateClassMemberRoleRequest.parse(request.body);
			await classService.updateMemberRole(id, body.userId, body.role);
			return { message: "成員角色已更新" };
		}
	);
}
