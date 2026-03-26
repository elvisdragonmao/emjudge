type PgError = {
	code?: string;
	constraint?: string;
};

const UNIQUE_VIOLATION_CODE = "23505";

export const isUniqueConstraintError = (error: unknown, constraint: string): boolean => {
	if (!error || typeof error !== "object") {
		return false;
	}

	const pgError = error as PgError;
	return pgError.code === UNIQUE_VIOLATION_CODE && pgError.constraint === constraint;
};
