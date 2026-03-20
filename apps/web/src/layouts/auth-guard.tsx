import { useAuth } from "@/stores/auth";
import type { Role } from "@judge/shared";
import { Navigate, Outlet } from "react-router";

interface AuthGuardProps {
	allowedRoles?: Role[];
}

export function AuthGuard({ allowedRoles }: AuthGuardProps) {
	const { isAuthenticated, user } = useAuth();

	if (!isAuthenticated || !user) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
