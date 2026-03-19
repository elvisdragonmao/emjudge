import { query, queryOne, queryMany } from "../db/pool.js";

interface ClassRow {
  id: string;
  name: string;
  description: string;
  created_by: string;
  is_archived: boolean;
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
    createdAt: row.created_at.toISOString(),
  };
}

export async function listClasses() {
  const rows = await queryMany<ClassRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count,
       (SELECT COUNT(*) FROM assignments WHERE class_id = c.id) as assignment_count
     FROM classes c
     WHERE c.is_archived = false
     ORDER BY c.created_at DESC`,
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
    [userId],
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
    [id],
  );
}

export async function getClassDetail(id: string) {
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
    [id],
  );

  return {
    ...toSummary(cls),
    members: members.map((m) => ({
      id: m.id,
      username: m.username,
      displayName: m.display_name,
      role: m.role as "admin" | "teacher" | "student",
      createdAt: m.created_at.toISOString(),
    })),
  };
}

export async function createClass(
  name: string,
  description: string,
  createdBy: string,
) {
  const row = await queryOne<ClassRow>(
    `INSERT INTO classes (name, description, created_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, description, createdBy],
  );
  return row ? toSummary(row) : null;
}

export async function updateClass(
  id: string,
  data: { name?: string; description?: string },
) {
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

  if (sets.length === 0) return;

  params.push(id);
  await query(
    `UPDATE classes SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
}

export async function addMembers(classId: string, userIds: string[]) {
  for (const userId of userIds) {
    await query(
      `INSERT INTO class_members (class_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [classId, userId],
    );
  }
}

export async function removeMember(classId: string, userId: string) {
  await query(
    "DELETE FROM class_members WHERE class_id = $1 AND user_id = $2",
    [classId, userId],
  );
}

export async function isUserInClass(userId: string, classId: string) {
  const row = await queryOne(
    "SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2",
    [classId, userId],
  );
  return row !== null;
}

export async function getClassLeaderboard(classId: string) {
  const rows = await queryMany<{
    user_id: string;
    username: string;
    display_name: string;
    total_score: string;
    scored_assignments: string;
  }>(
    `WITH best_scores AS (
       SELECT s.user_id, s.assignment_id, MAX(s.score) AS best_score
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE a.class_id = $1
         AND s.status = 'completed'
         AND s.score IS NOT NULL
       GROUP BY s.user_id, s.assignment_id
     )
     SELECT u.id AS user_id,
            u.username,
            u.display_name,
            COALESCE(SUM(bs.best_score), 0) AS total_score,
            COUNT(bs.assignment_id) AS scored_assignments
     FROM class_members cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN best_scores bs ON bs.user_id = u.id
     WHERE cm.class_id = $1
     GROUP BY u.id, u.username, u.display_name
     ORDER BY total_score DESC, scored_assignments DESC, u.username ASC`,
    [classId],
  );

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    totalScore: Number(r.total_score),
    scoredAssignments: Number(r.scored_assignments),
  }));
}
