import { z } from "zod";

const EnvSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(3000),
	HOST: z.string().default("0.0.0.0"),

	DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/judge"),

	JWT_SECRET: z.string().default("dev-secret-change-in-production"),
	JWT_EXPIRES_IN: z.string().default("7d"),

	MINIO_ENDPOINT: z.string().default("localhost"),
	MINIO_PORT: z
		.preprocess(v => {
			const n = Number(v);
			return isNaN(n) || n === 0 ? 9000 : n;
		}, z.number())
		.default(9000),
	MINIO_ACCESS_KEY: z.string().default("minioadmin"),
	MINIO_SECRET_KEY: z.string().default("minioadmin"),
	MINIO_USE_SSL: z
		.string()
		.transform(v => v === "true")
		.default(false),
	MINIO_PUBLIC_BASE_URL: z.string().default("/img"),

	CORS_ORIGIN: z.string().default("http://localhost:5173"),

	DEFAULT_ADMIN_PASSWORD: z.string().default("admin123")
});

const DEV_DEFAULTS = {
	JWT_SECRET: "dev-secret-change-in-production",
	DEFAULT_ADMIN_PASSWORD: "admin123",
	MINIO_ACCESS_KEY: "minioadmin",
	MINIO_SECRET_KEY: "minioadmin"
} as const;

const validatedEnv = EnvSchema.superRefine((env, ctx) => {
	if (env.NODE_ENV !== "production") {
		return;
	}

	if (env.JWT_SECRET === DEV_DEFAULTS.JWT_SECRET) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: "JWT_SECRET must be changed in production" });
	}

	if (env.DEFAULT_ADMIN_PASSWORD === DEV_DEFAULTS.DEFAULT_ADMIN_PASSWORD) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DEFAULT_ADMIN_PASSWORD must be changed in production" });
	}

	if (env.MINIO_ACCESS_KEY === DEV_DEFAULTS.MINIO_ACCESS_KEY || env.MINIO_SECRET_KEY === DEV_DEFAULTS.MINIO_SECRET_KEY) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MinIO credentials must be changed in production" });
	}
});

export const config = validatedEnv.parse(process.env);
export type Config = typeof config;
