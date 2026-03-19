/** Centralized React Query key factory */
export const queryKeys = {
  me: () => ["me"] as const,
  users: (page?: number) => ["users", { page }] as const,
  classes: () => ["classes"] as const,
  classDetail: (id: string) => ["classes", id] as const,
  classLeaderboard: (id: string) => ["classes", id, "leaderboard"] as const,
  assignments: (classId: string) => ["assignments", { classId }] as const,
  assignmentDetail: (id: string) => ["assignments", id] as const,
  submissions: (assignmentId: string, page?: number) =>
    ["submissions", { assignmentId, page }] as const,
  submissionDetail: (id: string) => ["submissions", id] as const,
};
