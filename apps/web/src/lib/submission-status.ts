const ACTIVE_SUBMISSION_STATUSES = new Set(["pending", "queued", "running"]);

export function isSubmissionActive(status: string) {
  return ACTIVE_SUBMISSION_STATUSES.has(status);
}

export function getSubmissionStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "failed":
    case "error":
      return "destructive" as const;
    case "queued":
      return "info" as const;
    case "running":
      return "running" as const;
    default:
      return "secondary" as const;
  }
}

export function getSubmissionStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "等待中",
    queued: "排隊中",
    running: "評測中",
    completed: "完成",
    failed: "失敗",
    error: "錯誤",
  };

  return map[status] ?? status;
}
