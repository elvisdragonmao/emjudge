import { AssignmentDetail, AssignmentSummary, CreateAssignmentRequest, IdParam, MessageResponse, ReorderAssignmentsRequest, UpdateAssignmentRequest } from "@judge/shared";
import type { FastifyInstance } from "fastify";
import { authSecurity, createRouteSchema, toJsonSchema, withErrorResponses } from "../lib/openapi.js";
import { authenticate } from "../middleware/auth.js";
import * as assignmentService from "../services/assignment.service.js";
import * as classService from "../services/class.service.js";

export async function assignmentRoutes(app: FastifyInstance) {
	// List assignments for a class
	app.get(
		"/api/classes/:id/assignments",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "List assignments for class",
				security: authSecurity,
				params: toJsonSchema(IdParam, "AssignmentClassIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(AssignmentSummary.array(), "AssignmentSummaryList")
					},
					[401]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const canView = await classService.canViewClass(request.userId, request.userRole, id);
			if (!canView) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const canManage = await classService.canManageClass(request.userId, request.userRole, id);
			return assignmentService.listByClass(id, canManage);
		}
	);

	app.patch(
		"/api/classes/:id/assignments/order",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "Reorder assignments for class",
				security: authSecurity,
				params: toJsonSchema(IdParam, "ReorderAssignmentsClassIdParam"),
				body: toJsonSchema(ReorderAssignmentsRequest, "ReorderAssignmentsRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "AssignmentsReorderedResponse")
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
			const body = ReorderAssignmentsRequest.parse(request.body);
			await assignmentService.reorderByClass(id, body.assignmentIds);
			return { message: "作業順序已更新" };
		}
	);

	// Get assignment detail
	app.get(
		"/api/assignments/:id",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "Get assignment detail",
				security: authSecurity,
				params: toJsonSchema(IdParam, "AssignmentIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(AssignmentDetail, "AssignmentDetail")
					},
					[401, 404]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const assignment = await assignmentService.getById(id);
			if (!assignment) {
				return reply.status(404).send({ error: "作業不存在", statusCode: 404 });
			}

			const canView = await classService.canViewClass(request.userId, request.userRole, assignment.classId);
			if (!canView) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}

			const canManage = await classService.canManageClass(request.userId, request.userRole, assignment.classId);
			const isVisibleToStudents = assignment.status === "published" && (!assignment.publishedAt || new Date(assignment.publishedAt).getTime() <= Date.now());
			if (!canManage && !isVisibleToStudents) {
				return reply.status(404).send({ error: "作業不存在", statusCode: 404 });
			}

			return assignment;
		}
	);

	// Create assignment
	app.post(
		"/api/assignments",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "Create assignment",
				security: authSecurity,
				body: toJsonSchema(CreateAssignmentRequest, "CreateAssignmentRequest"),
				response: withErrorResponses(
					{
						201: {
							type: "object",
							required: ["id"],
							properties: { id: { type: "string", format: "uuid" } }
						}
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const body = CreateAssignmentRequest.parse(request.body);
			const canManage = await classService.canManageClass(request.userId, request.userRole, body.classId);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const id = await assignmentService.create(body, request.userId);
			return reply.status(201).send({ id });
		}
	);

	// Update assignment
	app.patch(
		"/api/assignments/:id",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "Update assignment",
				security: authSecurity,
				params: toJsonSchema(IdParam, "UpdateAssignmentIdParam"),
				body: toJsonSchema(UpdateAssignmentRequest, "UpdateAssignmentRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "AssignmentUpdatedResponse")
					},
					[400, 401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const assignment = await assignmentService.getById(id);
			if (!assignment) {
				return reply.status(404).send({ error: "作業不存在", statusCode: 404 });
			}
			const canManage = await classService.canManageClass(request.userId, request.userRole, assignment.classId);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			const body = UpdateAssignmentRequest.parse(request.body);
			await assignmentService.update(id, body);
			return { message: "作業已更新" };
		}
	);

	// Delete assignment
	app.delete(
		"/api/assignments/:id",
		{
			preHandler: authenticate,
			schema: createRouteSchema({
				tags: ["Assignments"],
				summary: "Delete assignment",
				security: authSecurity,
				params: toJsonSchema(IdParam, "DeleteAssignmentIdParam"),
				response: withErrorResponses(
					{
						200: toJsonSchema(MessageResponse, "AssignmentDeletedResponse")
					},
					[401, 403]
				)
			})
		},
		async (request, reply) => {
			const { id } = IdParam.parse(request.params);
			const assignment = await assignmentService.getById(id);
			if (!assignment) {
				return reply.status(404).send({ error: "作業不存在", statusCode: 404 });
			}
			const canManage = await classService.canManageClass(request.userId, request.userRole, assignment.classId);
			if (!canManage) {
				return reply.status(403).send({ error: "Forbidden", statusCode: 403 });
			}
			await assignmentService.deleteAssignment(id);
			return { message: "作業已刪除" };
		}
	);
}
