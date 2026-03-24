import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
	connectionString: config.DATABASE_URL,
	max: 5
});

export const queryOne = async <T extends pg.QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> => {
	const result = await pool.query<T>(text, params);
	return result.rows[0] ?? null;
};

export const queryMany = async <T extends pg.QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> => {
	const result = await pool.query<T>(text, params);
	return result.rows;
};

export const query = async (text: string, params?: unknown[]) => {
	return pool.query(text, params);
};
