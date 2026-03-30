import type { Role } from "@judge/shared";
import { useCallback, useSyncExternalStore } from "react";

interface AuthUser {
	id: string;
	username: string;
	displayName: string;
	role: Role;
}

interface AuthState {
	user: AuthUser | null;
	initialized: boolean;
}

let state: AuthState = {
	user: (() => {
		try {
			const raw = localStorage.getItem("user");
			return raw ? (JSON.parse(raw) as AuthUser) : null;
		} catch {
			return null;
		}
	})(),
	initialized: false
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

export const clearAuth = () => {
	localStorage.removeItem("user");
	state = { user: null, initialized: true };
	emitChange();
};

export const setAuthUser = (user: AuthUser | null) => {
	if (user) {
		localStorage.setItem("user", JSON.stringify(user));
	} else {
		localStorage.removeItem("user");
	}

	state = { user, initialized: true };
	emitChange();
};

export const markAuthInitialized = () => {
	if (state.initialized) return;
	state = { ...state, initialized: true };
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

	const logout = useCallback(() => {
		clearAuth();
	}, []);

	return {
		user: authState.user,
		initialized: authState.initialized,
		isAuthenticated: !!authState.user,
		logout
	};
};
