import { MINIO_BUCKETS, type SubmissionStatus } from "@judge/shared";
import crypto from "node:crypto";
import { queryMany, queryOne, transaction } from "../db/pool.js";
import { getPresignedUrl, removeObject, uploadBuffer } from "../utils/minio.js";

interface SubmissionRow {
	id: string;
	assignment_id: string;
	class_id?: string;
	user_id: string;
	status: SubmissionStatus;
	score: number | null;
	max_score: number | null;
	file_count: number;
	created_at: Date;
	username?: string;
	display_name?: string;
}

interface FileRow {
	id: string;
	submission_id: string;
	path: string;
	size: number;
	minio_key: string;
}

interface DownloadFileRow {
	id: string;
	submission_id: string;
	path: string;
	minio_key: string;
}

interface RunRow {
	id: string;
	submission_id: string;
	status: SubmissionStatus;
	score: number | null;
	max_score: number | null;
	test_results: unknown;
	log: string | null;
	started_at: Date | null;
	finished_at: Date | null;
	created_at: Date;
}

type SubmissionCreateErrorCode = "assignment_not_found" | "assignment_not_published" | "assignment_closed" | "multiple_submissions_disabled";

export class SubmissionCreateError extends Error {
	constructor(public readonly code: SubmissionCreateErrorCode) {
		super(code);
		this.name = "SubmissionCreateError";
	}
}

interface AssignmentSubmissionRulesRow {
	status: "draft" | "published";
	published_at: Date | null;
	due_date: Date | null;
	allow_multiple_submissions: boolean;
}

const getAssignmentSubmissionRules = async (assignmentId: string) => {
	return queryOne<AssignmentSubmissionRulesRow>(
		`SELECT status, published_at, due_date, allow_multiple_submissions
       FROM assignments
       WHERE id = $1`,
		[assignmentId]
	);
};

const enforceSubmissionRules = async (assignmentId: string, userId: string) => {
	const assignment = await getAssignmentSubmissionRules(assignmentId);
	if (!assignment) {
		throw new SubmissionCreateError("assignment_not_found");
	}

	if (assignment.status !== "published") {
		throw new SubmissionCreateError("assignment_not_published");
	}

	if (assignment.published_at && assignment.published_at.getTime() > Date.now()) {
		throw new SubmissionCreateError("assignment_not_published");
	}

	if (assignment.due_date && assignment.due_date.getTime() < Date.now()) {
		throw new SubmissionCreateError("assignment_closed");
	}

	if (!assignment.allow_multiple_submissions) {
		const existingSubmission = await queryOne<{ id: string }>("SELECT id FROM submissions WHERE assignment_id = $1 AND user_id = $2 LIMIT 1", [assignmentId, userId]);
		if (existingSubmission) {
			throw new SubmissionCreateError("multiple_submissions_disabled");
		}
	}
};

const cleanupUploadedFiles = async (uploadedKeys: string[]) => {
	if (uploadedKeys.length === 0) {
		return;
	}

	await Promise.allSettled(uploadedKeys.map(key => removeObject(MINIO_BUCKETS.SUBMISSIONS, key)));
};

interface ArtifactRow {
	id: string;
	run_id: string;
	submission_id: string;
	type: string;
	name: string;
	minio_key: string;
}

const getClassMemberRoleByAssignment = async (userId: string, assignmentId: string) => {
	const row = await queryOne<{ role: "teacher" | "student" }>(
		`SELECT cm.role
       FROM assignments a
       JOIN class_members cm ON cm.class_id = a.class_id
       WHERE a.id = $1 AND cm.user_id = $2`,
		[assignmentId, userId]
	);

	return row?.role ?? null;
};

const getClassMemberRoleBySubmission = async (userId: string, submissionId: string) => {
	const row = await queryOne<{ role: "teacher" | "student" }>(
		`SELECT cm.role
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN class_members cm ON cm.class_id = a.class_id
       WHERE s.id = $1 AND cm.user_id = $2`,
		[submissionId, userId]
	);

	return row?.role ?? null;
};

export const createSubmission = async (assignmentId: string, userId: string, files: Array<{ path: string; buffer: Buffer }>) => {
	await enforceSubmissionRules(assignmentId, userId);

	const submissionId = crypto.randomUUID();
	const uploadEntries = files.map(file => ({
		path: file.path,
		size: file.buffer.length,
		minioKey: `${submissionId}/${file.path}`,
		buffer: file.buffer
	}));
	const uploadedKeys: string[] = [];

	try {
		for (const entry of uploadEntries) {
			await uploadBuffer(MINIO_BUCKETS.SUBMISSIONS, entry.minioKey, entry.buffer);
			uploadedKeys.push(entry.minioKey);
		}
	} catch (error) {
		await cleanupUploadedFiles(uploadedKeys);
		throw error;
	}

	return transaction(async client => {
		try {
			await client.query(
				`INSERT INTO submissions (id, assignment_id, user_id, file_count, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
				[submissionId, assignmentId, userId, uploadEntries.length]
			);

			for (const entry of uploadEntries) {
				await client.query(
					`INSERT INTO submission_files (submission_id, path, size, minio_key)
          VALUES ($1, $2, $3, $4)`,
					[submissionId, entry.path, entry.size, entry.minioKey]
				);
			}

			const runResult = await client.query(
				`INSERT INTO submission_runs (submission_id, status)
       VALUES ($1, 'pending') RETURNING id`,
				[submissionId]
			);
			const runId = runResult.rows[0]!.id as string;

			await client.query(
				`INSERT INTO judge_jobs (submission_id, run_id, status)
       VALUES ($1, $2, 'pending')`,
				[submissionId, runId]
			);

			await client.query("UPDATE submissions SET status = 'queued' WHERE id = $1", [submissionId]);

			return submissionId;
		} catch (error) {
			await cleanupUploadedFiles(uploadedKeys);
			throw error;
		}
	});
};

export const canUserSubmitAssignment = async (userId: string, userRole: string, assignmentId: string) => {
	if (userRole !== "student") {
		return false;
	}

	const classRole = await getClassMemberRoleByAssignment(userId, assignmentId);
	if (classRole !== "student") {
		return false;
	}

	const assignment = await getAssignmentSubmissionRules(assignmentId);
	if (!assignment) {
		return false;
	}

	if (assignment.status !== "published") {
		return false;
	}

	if (assignment.published_at && assignment.published_at.getTime() > Date.now()) {
		return false;
	}

	if (assignment.due_date && assignment.due_date.getTime() < Date.now()) {
		return false;
	}

	if (!assignment.allow_multiple_submissions) {
		const existingSubmission = await queryOne<{ id: string }>("SELECT id FROM submissions WHERE assignment_id = $1 AND user_id = $2 LIMIT 1", [assignmentId, userId]);
		return !existingSubmission;
	}

	return true;
};

export const listByAssignment = async (assignmentId: string, page: number, limit: number) => {
	const offset = (page - 1) * limit;

	const [rows, countResult] = await Promise.all([
		queryMany<SubmissionRow>(
			`SELECT s.*, u.username, u.display_name
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.assignment_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
			[assignmentId, limit, offset]
		),
		queryOne<{ count: string }>("SELECT COUNT(*) as count FROM submissions WHERE assignment_id = $1", [assignmentId])
	]);

	const submissions = await Promise.all(
		rows.map(async row => {
			// Get latest screenshot
			const artifact = await queryOne<ArtifactRow>(
				`SELECT sa.* FROM submission_artifacts sa
         JOIN submission_runs sr ON sr.id = sa.run_id
         WHERE sa.submission_id = $1 AND sa.type = 'screenshot'
         ORDER BY sa.created_at DESC LIMIT 1`,
				[row.id]
			);

			let screenshotUrl: string | null = null;
			if (artifact) {
				screenshotUrl = await getPresignedUrl(MINIO_BUCKETS.ARTIFACTS, artifact.minio_key);
			}

			return {
				id: row.id,
				assignmentId: row.assignment_id,
				userId: row.user_id,
				username: row.username ?? "",
				displayName: row.display_name ?? "",
				status: row.status,
				score: row.score,
				maxScore: row.max_score,
				screenshotUrl,
				fileCount: row.file_count,
				createdAt: row.created_at.toISOString()
			};
		})
	);

	return {
		submissions,
		total: parseInt(countResult?.count ?? "0", 10)
	};
};

export const getDetail = async (submissionId: string) => {
	const row = await queryOne<SubmissionRow>(
		`SELECT s.*, u.username, u.display_name
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
		[submissionId]
	);
	if (!row) return null;

	const files = await queryMany<FileRow>("SELECT * FROM submission_files WHERE submission_id = $1 ORDER BY path", [submissionId]);

	const runs = await queryMany<RunRow>("SELECT * FROM submission_runs WHERE submission_id = $1 ORDER BY created_at DESC", [submissionId]);

	const runsWithArtifacts = await Promise.all(
		runs.map(async run => {
			const artifacts = await queryMany<ArtifactRow>("SELECT * FROM submission_artifacts WHERE run_id = $1", [run.id]);

			return {
				id: run.id,
				submissionId: run.submission_id,
				status: run.status,
				score: run.score,
				maxScore: run.max_score,
				testResults: run.test_results as Array<{
					name: string;
					passed: boolean;
					message?: string;
					score: number;
				}> | null,
				log: run.log,
				artifacts: artifacts.map(a => ({
					id: a.id,
					type: a.type as "screenshot" | "log" | "report",
					name: a.name,
					minioKey: a.minio_key
				})),
				startedAt: run.started_at?.toISOString() ?? null,
				finishedAt: run.finished_at?.toISOString() ?? null,
				createdAt: run.created_at.toISOString()
			};
		})
	);

	return {
		id: row.id,
		assignmentId: row.assignment_id,
		userId: row.user_id,
		username: row.username ?? "",
		displayName: row.display_name ?? "",
		status: row.status,
		score: row.score,
		maxScore: row.max_score,
		screenshotUrl: null as string | null,
		fileCount: row.file_count,
		createdAt: row.created_at.toISOString(),
		files: files.map(f => ({
			id: f.id,
			path: f.path,
			size: Number(f.size),
			minioKey: f.minio_key
		})),
		runs: runsWithArtifacts
	};
};

export const canUserViewAssignmentSubmissions = async (userId: string, userRole: string, assignmentId: string) => {
	if (userRole === "admin") {
		return true;
	}

	const row = await queryOne<{ role: "teacher" | "student"; status: "draft" | "published"; published_at: Date | null }>(
		`SELECT cm.role, a.status, a.published_at
       FROM assignments a
       JOIN class_members cm ON cm.class_id = a.class_id
       WHERE a.id = $1 AND cm.user_id = $2`,
		[assignmentId, userId]
	);

	if (!row) {
		return false;
	}

	if (row.role === "teacher") {
		return true;
	}

	if (row.status !== "published") {
		return false;
	}

	if (row.published_at && row.published_at.getTime() > Date.now()) {
		return false;
	}

	return true;
};

export const canUserViewSubmission = async (userId: string, userRole: string, submissionId: string) => {
	if (userRole === "admin") {
		return true;
	}

	const classRole = await getClassMemberRoleBySubmission(userId, submissionId);
	return classRole !== null;
};

export const canUserViewArtifact = async (userId: string, userRole: string, artifactId: string) => {
	if (userRole === "admin") {
		return true;
	}

	const row = await queryOne(
		`SELECT 1
     FROM submission_artifacts sa
     JOIN submissions s ON s.id = sa.submission_id
     JOIN assignments a ON a.id = s.assignment_id
     JOIN class_members cm ON cm.class_id = a.class_id
     WHERE sa.id = $1 AND cm.user_id = $2`,
		[artifactId, userId]
	);

	return row !== null;
};

export const canUserRejudgeSubmission = async (userId: string, userRole: string, submissionId: string, submissionOwnerId: string) => {
	if (userRole === "admin") {
		return true;
	}

	const classRole = await getClassMemberRoleBySubmission(userId, submissionId);
	if (classRole === "teacher") {
		return true;
	}

	return submissionOwnerId === userId;
};

export const listByUser = async (userId: string, assignmentId: string) => {
	const rows = await queryMany<SubmissionRow>(
		`SELECT s.*, u.username, u.display_name
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1 AND s.assignment_id = $2
     ORDER BY s.created_at DESC`,
		[userId, assignmentId]
	);

	return rows.map(row => ({
		id: row.id,
		assignmentId: row.assignment_id,
		userId: row.user_id,
		username: row.username ?? "",
		displayName: row.display_name ?? "",
		status: row.status,
		score: row.score,
		maxScore: row.max_score,
		screenshotUrl: null as string | null,
		fileCount: row.file_count,
		createdAt: row.created_at.toISOString()
	}));
};

export const getFileForDownload = async (fileId: string) => {
	const row = await queryOne<DownloadFileRow>(
		`SELECT id, submission_id, path, minio_key
     FROM submission_files
     WHERE id = $1`,
		[fileId]
	);

	if (!row) return null;

	return {
		id: row.id,
		submissionId: row.submission_id,
		path: row.path,
		minioKey: row.minio_key
	};
};

export const rejudgeSubmission = async (submissionId: string) => {
	return transaction(async client => {
		const submission = await client.query<{ id: string }>("SELECT id FROM submissions WHERE id = $1", [submissionId]);

		if (submission.rows.length === 0) {
			return { ok: false as const, reason: "not_found" as const };
		}

		const activeJob = await client.query<{ id: string }>(
			`SELECT id
       FROM judge_jobs
       WHERE submission_id = $1
         AND status IN ('pending', 'locked', 'running')
       LIMIT 1`,
			[submissionId]
		);

		if (activeJob.rows.length > 0) {
			return { ok: false as const, reason: "already_queued" as const };
		}

		const runResult = await client.query<{ id: string }>(
			`INSERT INTO submission_runs (submission_id, status)
       VALUES ($1, 'pending')
       RETURNING id`,
			[submissionId]
		);

		const runId = runResult.rows[0]!.id;

		await client.query(
			`INSERT INTO judge_jobs (submission_id, run_id, status)
       VALUES ($1, $2, 'pending')`,
			[submissionId, runId]
		);

		await client.query("UPDATE submissions SET status = 'queued' WHERE id = $1", [submissionId]);

		return { ok: true as const, runId };
	});
};
