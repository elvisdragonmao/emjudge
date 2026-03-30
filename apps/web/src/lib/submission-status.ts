import { i18n } from "@/i18n";

const ACTIVE_SUBMISSION_STATUSES = new Set(["pending", "queued", "running"]);

interface SubmissionStatusMeta {
	status: string;
	score?: number | null;
	maxScore?: number | null;
}

export const isSubmissionActive = (status: string) => {
	return ACTIVE_SUBMISSION_STATUSES.has(status);
};

export const getSubmissionVerdict = ({ status, score, maxScore }: SubmissionStatusMeta) => {
	if (status === "completed") {
		if (typeof score === "number" && typeof maxScore === "number" && score >= maxScore) {
			return "AC";
		}

		return "WA";
	}

	return null;
};

export const getSubmissionStatusVariant = ({ status, score, maxScore }: SubmissionStatusMeta) => {
	const verdict = getSubmissionVerdict({ status, score, maxScore });
	if (verdict === "AC") {
		return "success" as const;
	}
	if (verdict === "WA") {
		return "destructive" as const;
	}

	switch (status) {
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

export const getSubmissionStatusLabel = ({ status, score, maxScore }: SubmissionStatusMeta) => {
	const verdict = getSubmissionVerdict({ status, score, maxScore });
	if (verdict) {
		return verdict;
	}

	return i18n.t(`submissionStatus.${status}`, { defaultValue: status });
};
