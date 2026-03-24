import { i18n } from "@/i18n";

const ACTIVE_SUBMISSION_STATUSES = new Set(["pending", "queued", "running"]);

export const isSubmissionActive = (status: string) => {
	return ACTIVE_SUBMISSION_STATUSES.has(status);
};

export const getSubmissionStatusVariant = (status: string) => {
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
};

export const getSubmissionStatusLabel = (status: string) => {
	return i18n.t(`submissionStatus.${status}`, { defaultValue: status });
};
