import { LoginRequest, LoginResponse, RegisterRequest, RegistrationStatusResponse } from "@judge/shared";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { createRouteSchema, toJsonSchema, withErrorResponses } from "../lib/openapi.js";
import * as settingsService from "../services/settings.service.js";
import * as userService from "../services/user.service.js";
import { isUniqueConstraintError } from "../utils/pg-error.js";

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 12;
const AUTH_COOKIE_NAME = "access_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const authRateBucket = new Map<string, number[]>();

const isRateLimited = (ip: string | undefined, routeKey: string) => {
	const key = `${routeKey}:${ip ?? "unknown"}`;
	const now = Date.now();
	const windowStart = now - AUTH_RATE_LIMIT_WINDOW_MS;
	const timestamps = authRateBucket.get(key) ?? [];
	const inWindow = timestamps.filter(ts => ts >= windowStart);

	if (inWindow.length >= AUTH_RATE_LIMIT_MAX_REQUESTS) {
		authRateBucket.set(key, inWindow);
		return true;
	}

	inWindow.push(now);
	authRateBucket.set(key, inWindow);
	return false;
};

export const authRoutes = async (app: FastifyInstance) => {
	app.get(
		"/api/auth/registration-status",
		{
			schema: createRouteSchema({
				tags: ["Auth"],
				summary: "Get registration status",
				response: {
					200: toJsonSchema(RegistrationStatusResponse, "RegistrationStatusResponse")
				}
			})
		},
		async () => settingsService.getRegistrationStatus()
	);

	app.post(
		"/api/auth/logout",
		{
			schema: createRouteSchema({
				tags: ["Auth"],
				summary: "Logout",
				response: {
					200: {
						type: "object",
						required: ["message"],
						properties: {
							message: { type: "string" }
						}
					}
				}
			})
		},
		async (_request, reply) => {
			reply.clearCookie(AUTH_COOKIE_NAME, {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				secure: config.NODE_ENV === "production"
			});

			return { message: "已登出" };
		}
	);

	app.post(
		"/api/auth/login",
		{
			schema: createRouteSchema({
				tags: ["Auth"],
				summary: "Login",
				body: toJsonSchema(LoginRequest, "LoginRequest"),
				response: withErrorResponses(
					{
						200: toJsonSchema(LoginResponse, "LoginResponse")
					},
					[401, 429]
				)
			})
		},
		async (request, reply) => {
			if (isRateLimited(request.ip, "login")) {
				return reply.status(429).send({ error: "Too many requests", statusCode: 429 });
			}

			const body = LoginRequest.parse(request.body);
			const user = await userService.verifyPassword(body.username, body.password);

			if (!user) {
				return reply.status(401).send({ error: "帳號或密碼錯誤", statusCode: 401 });
			}

			const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: config.JWT_EXPIRES_IN });
			reply.setCookie(AUTH_COOKIE_NAME, token, {
				path: "/",
				httpOnly: true,
				sameSite: "lax",
				secure: config.NODE_ENV === "production",
				maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
			});

			return { token, user };
		}
	);

	app.post(
		"/api/auth/register",
		{
			schema: createRouteSchema({
				tags: ["Auth"],
				summary: "Register student account",
				body: toJsonSchema(RegisterRequest, "RegisterRequest"),
				response: withErrorResponses(
					{
						201: toJsonSchema(LoginResponse, "RegisterResponse")
					},
					[403, 409, 429]
				)
			})
		},
		async (request, reply) => {
			if (isRateLimited(request.ip, "register")) {
				return reply.status(429).send({ error: "Too many requests", statusCode: 429 });
			}

			const body = RegisterRequest.parse(request.body);
			const { registrationEnabled } = await settingsService.getRegistrationStatus();

			if (!registrationEnabled) {
				return reply.status(403).send({ error: "目前未開放註冊", statusCode: 403 });
			}

			try {
				const user = await userService.registerStudent(body);
				const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: config.JWT_EXPIRES_IN });
				reply.setCookie(AUTH_COOKIE_NAME, token, {
					path: "/",
					httpOnly: true,
					sameSite: "lax",
					secure: config.NODE_ENV === "production",
					maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
				});
				return reply.status(201).send({ token, user });
			} catch (err: unknown) {
				if (isUniqueConstraintError(err, "uq_users_username")) {
					return reply.status(409).send({ error: "帳號已存在", statusCode: 409 });
				}
				throw err;
			}
		}
	);
};
