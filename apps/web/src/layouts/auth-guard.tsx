import { useAuth } from "@/stores/auth";
import type { Role } from "@judge/shared";
import { Navigate, Outlet } from "react-router";

interface AuthGuardProps {
	allowedRoles?: Role[];
}

export const AuthGuard = ({ allowedRoles }: AuthGuardProps) => {
	const { isAuthenticated, initialized, user } = useAuth();

	if (!initialized) {
		return null;
	}

	if (!isAuthenticated || !user) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
};
