import { MINIO_BUCKETS, type CreateAssignmentRequest, type UpdateAssignmentRequest } from "@judge/shared";
import { query, queryMany, queryOne, transaction } from "../db/pool.js";
import { removeObject } from "../utils/minio.js";

interface AssignmentRow {
	id: string;
	class_id: string;
	title: string;
	description: string;
	type: string;
	status?: "draft" | "published";
	published_at?: Date | null;
	due_date: Date | null;
	allow_multiple_submissions: boolean;
	sort_order?: number;
	created_by: string;
	created_at: Date;
	submission_count?: string;
	latest_submission_status?: "pending" | "queued" | "running" | "completed" | "failed" | "error" | null;
	latest_submission_score?: number | null;
	latest_submission_max_score?: number | null;
	class_name?: string;
}

interface SpecRow {
	id: string;
	assignment_id: string;
	start_command: string;
	test_content: string | null;
	timeout_ms: number;
	allowed_paths: string[];
	blocked_paths: string[];
}

interface MinioKeyRow {
	minio_key: string;
}

const toSummary = (row: AssignmentRow) => {
	return {
		id: row.id,
		classId: row.class_id,
		title: row.title,
		type: row.type as "html-css-js" | "react",
		status: row.status ?? "published",
		publishedAt: row.published_at?.toISOString() ?? null,
		dueDate: row.due_date?.toISOString() ?? null,
		allowMultipleSubmissions: row.allow_multiple_submissions,
		sortOrder: row.sort_order ?? 0,
		submissionCount: parseInt(row.submission_count ?? "0", 10),
		latestSubmissionStatus: row.latest_submission_status ?? null,
		latestSubmissionScore: row.latest_submission_score ?? null,
		latestSubmissionMaxScore: row.latest_submission_max_score ?? null,
		createdAt: row.created_at.toISOString()
	};
};

export const listByClass = async (classId: string, userId: string, includeUnpublished = false) => {
	const rows = await queryMany<AssignmentRow>(
		`SELECT a.*,
	       (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count,
	       latest_submission.status AS latest_submission_status,
	       latest_submission.score AS latest_submission_score,
	       latest_submission.max_score AS latest_submission_max_score
	     FROM assignments a
	     LEFT JOIN LATERAL (
	       SELECT s.status, s.score, s.max_score
	       FROM submissions s
	       WHERE s.assignment_id = a.id AND s.user_id = $2
	       ORDER BY s.created_at DESC
	       LIMIT 1
	     ) latest_submission ON true
	      WHERE a.class_id = $1
	       AND ($3::boolean = true OR (a.status = 'published' AND (a.published_at IS NULL OR a.published_at <= NOW())))
	     ORDER BY a.sort_order ASC, a.created_at DESC, a.id DESC`,
		[classId, userId, includeUnpublished]
	);
	return rows.map(toSummary);
};

export const getById = async (id: string) => {
	const row = await queryOne<AssignmentRow>(
		`SELECT a.*,
	       c.name as class_name,
	       (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count,
	       NULL::text AS latest_submission_status,
	       NULL::numeric AS latest_submission_score,
	       NULL::numeric AS latest_submission_max_score
	     FROM assignments a
	     JOIN classes c ON c.id = a.class_id
	     WHERE a.id = $1`,
		[id]
	);
	if (!row) return null;

	const spec = await queryOne<SpecRow>("SELECT * FROM assignment_specs WHERE assignment_id = $1", [id]);

	return {
		...toSummary(row),
		description: row.description,
		className: row.class_name ?? "",
		spec: spec
			? {
					startCommand: spec.start_command,
					testContent: spec.test_content ?? undefined,
					timeoutMs: spec.timeout_ms,
					allowedPaths: spec.allowed_paths,
					blockedPaths: spec.blocked_paths
				}
			: undefined
	};
};

export const create = async (data: CreateAssignmentRequest, createdBy: string) => {
	return transaction(async client => {
		const sortOrderResult = await client.query<{ next_sort_order: number }>(
			`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
       FROM assignments
       WHERE class_id = $1`,
			[data.classId]
		);
		const nextSortOrder = sortOrderResult.rows[0]?.next_sort_order ?? 1;

		const result = await client.query(
			`INSERT INTO assignments (class_id, title, description, type, status, published_at, due_date, allow_multiple_submissions, sort_order, created_by)
	       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
			[data.classId, data.title, data.description, data.type, data.status, data.publishedAt ?? null, data.dueDate ?? null, data.allowMultipleSubmissions, nextSortOrder, createdBy]
		);
		const assignmentId = result.rows[0]!.id as string;

		await client.query(
			`INSERT INTO assignment_specs (assignment_id, start_command, test_content, timeout_ms, allowed_paths, blocked_paths)
       VALUES ($1, $2, $3, $4, $5, $6)`,
			[assignmentId, data.spec.startCommand, data.spec.testContent ?? null, data.spec.timeoutMs, data.spec.allowedPaths, data.spec.blockedPaths]
		);

		return assignmentId;
	});
};

export const update = async (id: string, data: UpdateAssignmentRequest) => {
	await transaction(async client => {
		const sets: string[] = [];
		const params: unknown[] = [];
		let idx = 1;

		if (data.title !== undefined) {
			sets.push(`title = $${idx++}`);
			params.push(data.title);
		}
		if (data.description !== undefined) {
			sets.push(`description = $${idx++}`);
			params.push(data.description);
		}
		if (data.type !== undefined) {
			sets.push(`type = $${idx++}`);
			params.push(data.type);
		}
		if (data.status !== undefined) {
			sets.push(`status = $${idx++}`);
			params.push(data.status);
		}
		if (data.publishedAt !== undefined) {
			sets.push(`published_at = $${idx++}`);
			params.push(data.publishedAt);
		}
		if (data.dueDate !== undefined) {
			sets.push(`due_date = $${idx++}`);
			params.push(data.dueDate);
		}
		if (data.allowMultipleSubmissions !== undefined) {
			sets.push(`allow_multiple_submissions = $${idx++}`);
			params.push(data.allowMultipleSubmissions);
		}

		if (sets.length > 0) {
			params.push(id);
			await client.query(`UPDATE assignments SET ${sets.join(", ")} WHERE id = $${idx}`, params);
		}

		if (data.spec) {
			const specSets: string[] = [];
			const specParams: unknown[] = [];
			let specIdx = 1;

			if (data.spec.startCommand !== undefined) {
				specSets.push(`start_command = $${specIdx++}`);
				specParams.push(data.spec.startCommand);
			}
			if (data.spec.testContent !== undefined) {
				specSets.push(`test_content = $${specIdx++}`);
				specParams.push(data.spec.testContent);
			}
			if (data.spec.timeoutMs !== undefined) {
				specSets.push(`timeout_ms = $${specIdx++}`);
				specParams.push(data.spec.timeoutMs);
			}
			if (data.spec.allowedPaths !== undefined) {
				specSets.push(`allowed_paths = $${specIdx++}`);
				specParams.push(data.spec.allowedPaths);
			}
			if (data.spec.blockedPaths !== undefined) {
				specSets.push(`blocked_paths = $${specIdx++}`);
				specParams.push(data.spec.blockedPaths);
			}

			if (specSets.length > 0) {
				specParams.push(id);
				await client.query(`UPDATE assignment_specs SET ${specSets.join(", ")} WHERE assignment_id = $${specIdx}`, specParams);
			}
		}

		if (data.submissionRecordAction === "delete") {
			await client.query("DELETE FROM submissions WHERE assignment_id = $1", [id]);
		}
	});
};

export const deleteAssignment = async (id: string) => {
	const [submissionFiles, submissionArtifacts] = await Promise.all([
		queryMany<MinioKeyRow>(
			`SELECT sf.minio_key
		     FROM submission_files sf
		     JOIN submissions s ON s.id = sf.submission_id
		     WHERE s.assignment_id = $1`,
			[id]
		),
		queryMany<MinioKeyRow>(
			`SELECT sa.minio_key
		     FROM submission_artifacts sa
		     JOIN submissions s ON s.id = sa.submission_id
		     WHERE s.assignment_id = $1`,
			[id]
		)
	]);

	await query("DELETE FROM assignments WHERE id = $1", [id]);

	await Promise.allSettled([
		...submissionFiles.map(file => removeObject(MINIO_BUCKETS.SUBMISSIONS, file.minio_key)),
		...submissionArtifacts.map(artifact => removeObject(MINIO_BUCKETS.ARTIFACTS, artifact.minio_key))
	]);
};

export const reorderByClass = async (classId: string, assignmentIds: string[]) => {
	await transaction(async client => {
		const existingAssignments = await client.query<{ id: string }>("SELECT id FROM assignments WHERE class_id = $1", [classId]);
		const existingIds = existingAssignments.rows.map(row => row.id);

		if (existingIds.length !== assignmentIds.length) {
			throw new Error("Assignment list does not match class assignments");
		}

		const inputIds = new Set(assignmentIds);
		if (inputIds.size !== assignmentIds.length || existingIds.some(id => !inputIds.has(id))) {
			throw new Error("Assignment list does not match class assignments");
		}

		for (const [index, assignmentId] of assignmentIds.entries()) {
			await client.query("UPDATE assignments SET sort_order = $1 WHERE id = $2 AND class_id = $3", [index + 1, assignmentId, classId]);
		}
	});
};
