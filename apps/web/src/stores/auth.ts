import type { Role } from "@judge/shared";
import { useCallback, useSyncExternalStore } from "react";

interface AuthUser {
	id: string;
	username: string;
	displayName: string;
	role: Role;
}

interface AuthState {
	token: string | null;
	user: AuthUser | null;
}

let state: AuthState = {
	token: localStorage.getItem("token"),
	user: (() => {
		try {
			const raw = localStorage.getItem("user");
			return raw ? (JSON.parse(raw) as AuthUser) : null;
		} catch {
			return null;
		}
	})()
};

const listeners = new Set<() => void>();

const emitChange = () => {
	for (const listener of listeners) {
		listener();
	}
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

const getSnapshot = () => {
	return state;
};

export const setAuth = (token: string, user: AuthUser) => {
	localStorage.setItem("token", token);
	localStorage.setItem("user", JSON.stringify(user));
	state = { token, user };
	emitChange();
};

export const clearAuth = () => {
	localStorage.removeItem("token");
	localStorage.removeItem("user");
	state = { token: null, user: null };
	emitChange();
};

export const updateUser = (partial: Partial<AuthUser>) => {
	if (!state.user) return;
	const updated = { ...state.user, ...partial };
	localStorage.setItem("user", JSON.stringify(updated));
	state = { ...state, user: updated };
	emitChange();
};

export const useAuth = () => {
	const authState = useSyncExternalStore(subscribe, getSnapshot);

	const login = useCallback((token: string, user: AuthUser) => {
		setAuth(token, user);
	}, []);

	const logout = useCallback(() => {
		clearAuth();
	}, []);

	return {
		token: authState.token,
		user: authState.user,
		isAuthenticated: !!authState.token,
		login,
		logout
	};
};
