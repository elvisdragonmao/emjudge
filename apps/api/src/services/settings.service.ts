import { query, queryOne } from "../db/pool.js";

interface AppSettingsRow {
	id: number;
	registration_enabled: boolean;
}

const ensureSettingsRow = async () => {
	await query(
		`INSERT INTO app_settings (id, registration_enabled)
     VALUES (1, false)
     ON CONFLICT (id) DO NOTHING`
	);
};

export const getRegistrationStatus = async () => {
	await ensureSettingsRow();
	const row = await queryOne<AppSettingsRow>("SELECT registration_enabled FROM app_settings WHERE id = 1");
	return { registrationEnabled: row?.registration_enabled ?? false };
};

export const updateRegistrationStatus = async (registrationEnabled: boolean) => {
	await ensureSettingsRow();
	const row = await queryOne<AppSettingsRow>(
		`UPDATE app_settings
     SET registration_enabled = $1
     WHERE id = 1
     RETURNING id, registration_enabled`,
		[registrationEnabled]
	);

	return { registrationEnabled: row?.registration_enabled ?? false };
};
