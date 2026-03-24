import { ErrorResponse } from "@judge/shared";
import type { FastifySchema } from "fastify";
import { z, type ZodType } from "zod";

type SchemaMap = Record<number, ZodType | Record<string, unknown>>;

const stripJsonSchemaMeta = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(stripJsonSchemaMeta);
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([key]) => key !== "$schema")
		.map(([key, child]) => [key, stripJsonSchemaMeta(child)]);

	return Object.fromEntries(entries);
};

export const toJsonSchema = (schema: ZodType, _name?: string) => {
	return stripJsonSchemaMeta(z.toJSONSchema(schema)) as Record<string, unknown>;
};

export const buildResponseSchemas = (schemas: SchemaMap) => {
	return Object.fromEntries(Object.entries(schemas).map(([statusCode, schema]) => [statusCode, schema instanceof z.ZodType ? toJsonSchema(schema) : schema]));
};

export const withErrorResponses = (schemas: SchemaMap, extraErrors: number[] = []): Record<number, Record<string, unknown>> => {
	const response = buildResponseSchemas(schemas) as Record<number, Record<string, unknown>>;

	for (const statusCode of extraErrors) {
		response[statusCode] = toJsonSchema(ErrorResponse, `ErrorResponse${statusCode}`);
	}

	return response;
};

export const authSecurity = [{ bearerAuth: [] }];

export const createRouteSchema = (schema: FastifySchema): FastifySchema => {
	return schema;
};
