import crypto from "node:crypto";
import { query, queryMany, queryOne, transaction } from "../db/pool.js";

interface ClassRow {
	id: string;
	name: string;
	description: string;
	created_by: string;
	is_archived: boolean;
	join_code: string | null;
	join_code_enabled: boolean;
	created_at: Date;
	updated_at: Date;
	member_count?: string;
	assignment_count?: string;
}

function toSummary(row: ClassRow) {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		memberCount: parseInt(row.member_count ?? "0", 10),
		assignmentCount: parseInt(row.assignment_count ?? "0", 10),
		createdAt: row.created_at.toISOString()
	};
}

function toJoinCodeInfo(row: ClassRow, includeCode: boolean) {
	return {
		enabled: row.join_code_enabled,
		code: includeCode ? row.join_code : null
	};
}

function generateJoinCode() {
	return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateUniqueJoinCode() {
	for (let attempt = 0; attempt < 10; attempt++) {
		const code = generateJoinCode();
		const existing = await queryOne<{ id: string }>("SELECT id FROM classes WHERE join_code = $1", [code]);
		if (!existing) {
			return code;
		}
	}

	throw new Error("Failed to generate unique join code");
}

export async function listClasses() {
	const rows = await queryMany<ClassRow>(
		`SELECT c.*,
       (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count,
       (SELECT COUNT(*) FROM assignments WHERE class_id = c.id) as assignment_count
     FROM classes c
     WHERE c.is_archived = false
     ORDER BY c.created_at DESC`
	);
	return rows.map(toSummary);
}

export async function listClassesForUser(userId: string) {
	const rows = await queryMany<ClassRow>(
		`SELECT c.*,
       (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count,
       (SELECT COUNT(*) FROM assignments WHERE class_id = c.id) as assignment_count
     FROM classes c
     JOIN class_members cm ON cm.class_id = c.id
     WHERE cm.user_id = $1 AND c.is_archived = false
     ORDER BY c.created_at DESC`,
		[userId]
	);
	return rows.map(toSummary);
}

export async function getClassById(id: string) {
	return queryOne<ClassRow>(
		`SELECT c.*,
       (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count,
       (SELECT COUNT(*) FROM assignments WHERE class_id = c.id) as assignment_count
     FROM classes c
     WHERE c.id = $1`,
		[id]
	);
}

export async function getClassDetail(id: string, includeJoinCode = false) {
	const cls = await getClassById(id);
	if (!cls) return null;

	const members = await queryMany<{
		id: string;
		username: string;
		display_name: string;
		role: string;
		created_at: Date;
	}>(
		`SELECT u.id, u.username, u.display_name, u.role, u.created_at
     FROM users u
     JOIN class_members cm ON cm.user_id = u.id
     WHERE cm.class_id = $1
     ORDER BY u.username`,
		[id]
	);

	return {
		...toSummary(cls),
		joinCode: toJoinCodeInfo(cls, includeJoinCode),
		members: members.map(m => ({
			id: m.id,
			username: m.username,
			displayName: m.display_name,
			role: m.role as "admin" | "teacher" | "student",
			createdAt: m.created_at.toISOString()
		}))
	};
}

export async function createClass(name: string, description: string, createdBy: string) {
	const joinCode = await generateUniqueJoinCode();
	const row = await queryOne<ClassRow>(
		`INSERT INTO classes (name, description, created_by, join_code, join_code_enabled)
     VALUES ($1, $2, $3, $4, true) RETURNING *`,
		[name, description, createdBy, joinCode]
	);
	return row ? toSummary(row) : null;
}

export async function updateClass(id: string, data: { name?: string; description?: string; joinCodeEnabled?: boolean }) {
	const sets: string[] = [];
	const params: unknown[] = [];
	let idx = 1;

	if (data.name !== undefined) {
		sets.push(`name = $${idx++}`);
		params.push(data.name);
	}
	if (data.description !== undefined) {
		sets.push(`description = $${idx++}`);
		params.push(data.description);
	}
	if (data.joinCodeEnabled !== undefined) {
		sets.push(`join_code_enabled = $${idx++}`);
		params.push(data.joinCodeEnabled);
	}

	if (sets.length === 0) return;

	params.push(id);
	await query(`UPDATE classes SET ${sets.join(", ")} WHERE id = $${idx}`, params);
}

export async function addMembers(classId: string, userIds: string[]) {
	for (const userId of userIds) {
		await query(`INSERT INTO class_members (class_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [classId, userId]);
	}
}

export async function listAvailableMembers(classId: string) {
	const users = await queryMany<{
		id: string;
		username: string;
		display_name: string;
		role: string;
		created_at: Date;
	}>(
		`SELECT u.id, u.username, u.display_name, u.role, u.created_at
     FROM users u
     WHERE u.is_active = true
       AND NOT EXISTS (
         SELECT 1
         FROM class_members cm
         WHERE cm.class_id = $1 AND cm.user_id = u.id
       )
     ORDER BY u.role ASC, u.username ASC`,
		[classId]
	);

	return users.map(user => ({
		id: user.id,
		username: user.username,
		displayName: user.display_name,
		role: user.role as "admin" | "teacher" | "student",
		classes: [],
		createdAt: user.created_at.toISOString()
	}));
}

export async function getJoinCodeSettings(classId: string) {
	const row = await queryOne<ClassRow>("SELECT * FROM classes WHERE id = $1", [classId]);
	if (!row) return null;
	return toJoinCodeInfo(row, true);
}

export async function reissueJoinCode(classId: string) {
	const joinCode = await generateUniqueJoinCode();
	const row = await queryOne<ClassRow>("UPDATE classes SET join_code = $1 WHERE id = $2 RETURNING *", [joinCode, classId]);
	if (!row) return null;
	return toJoinCodeInfo(row, true);
}

export async function joinClassByCode(code: string, userId: string) {
	return transaction(async client => {
		const normalizedCode = code.trim().toUpperCase();
		const classRow = await client.query<ClassRow>("SELECT * FROM classes WHERE join_code = $1 AND is_archived = false", [normalizedCode]);
		const cls = classRow.rows[0] ?? null;

		if (!cls) {
			return { type: "not_found" as const };
		}

		if (!cls.join_code_enabled) {
			return { type: "disabled" as const, classId: cls.id };
		}

		const existing = await client.query("SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2", [cls.id, userId]);
		if ((existing.rowCount ?? 0) > 0) {
			return { type: "already_joined" as const, classId: cls.id };
		}

		await client.query("INSERT INTO class_members (class_id, user_id) VALUES ($1, $2)", [cls.id, userId]);
		return { type: "joined" as const, classId: cls.id };
	});
}

export async function removeMember(classId: string, userId: string) {
	await query("DELETE FROM class_members WHERE class_id = $1 AND user_id = $2", [classId, userId]);
}

export async function isUserInClass(userId: string, classId: string) {
	const row = await queryOne("SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2", [classId, userId]);
	return row !== null;
}

export async function getClassScoreHistory(classId: string) {
	const rows = await queryMany<{
		user_id: string;
		display_name: string;
		username: string;
		assignment_id: string;
		score: number;
		title: string;
		created_at: Date;
	}>(
		`SELECT s.user_id, u.display_name, u.username, s.assignment_id, s.score, a.title, s.created_at
      FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
		 JOIN users u ON u.id = s.user_id
      WHERE a.class_id = $1
        AND s.status = 'completed'
        AND s.score IS NOT NULL
      ORDER BY s.created_at ASC, s.id ASC`,
		[classId]
	);

	const bestScores = new Map<string, number>();
	const userTotals = new Map<string, number>();
	const points: Array<{
		userId: string;
		userName: string;
		date: string;
		totalScore: number;
		assignmentTitle: string;
	}> = [];

	for (const row of rows) {
		const key = `${row.user_id}:${row.assignment_id}`;
		const previousBest = bestScores.get(key) ?? 0;

		if (row.score <= previousBest) {
			continue;
		}

		const totalScore = (userTotals.get(row.user_id) ?? 0) + (row.score - previousBest);
		bestScores.set(key, row.score);
		userTotals.set(row.user_id, totalScore);

		points.push({
			userId: row.user_id,
			userName: row.display_name || row.username,
			date: row.created_at.toISOString(),
			totalScore,
			assignmentTitle: row.title
		});
	}

	return points;
}
