import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { isSubmissionActive } from "@/lib/submission-status";
import type {
	AssignmentDetail,
	AssignmentSummary,
	BulkImportRequest,
	ClassCumulativeScorePoint,
	ClassDetail,
	ClassJoinCodeInfo,
	ClassSummary,
	CreateAssignmentRequest,
	CreateUserRequest,
	JoinClassByCodeRequest,
	LoginRequest,
	LoginResponse,
	MessageResponse,
	RegisterRequest,
	RegistrationStatusResponse,
	ReorderAssignmentsRequest,
	SubmissionDetail,
	SubmissionListResponse,
	UpdateAssignmentRequest,
	UpdateClassJoinCodeSettingsRequest,
	UpdateClassMemberRoleRequest,
	UpdateRegistrationSettingsRequest,
	UserListResponse,
	UserSummary
} from "@judge/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface BulkImportResult {
	totalCount: number;
	successCount: number;
	errorCount: number;
	errors: Array<{
		username: string;
		error: string;
	}>;
}

// ─── Auth ────────────────────────────────────────────────
export const useLogin = () => {
	return useMutation({
		mutationFn: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data)
	});
};

export const useRegistrationStatus = () => {
	return useQuery({
		queryKey: queryKeys.registrationStatus(),
		queryFn: () => api.get<RegistrationStatusResponse>("/auth/registration-status")
	});
};

export const useRegister = () => {
	return useMutation({
		mutationFn: (data: RegisterRequest) => api.post<LoginResponse>("/auth/register", data)
	});
};

// ─── Me ──────────────────────────────────────────────────
export const useMe = () => {
	return useQuery({
		queryKey: queryKeys.me(),
		queryFn: () =>
			api.get<{
				id: string;
				username: string;
				displayName: string;
				role: string;
				createdAt: string;
			}>("/me"),
		retry: false
	});
};

export const useUpdateProfile = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { displayName: string }) => api.patch<MessageResponse>("/me/profile", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me() })
	});
};

export const useChangePassword = () => {
	return useMutation({
		mutationFn: (data: { currentPassword: string; newPassword: string }) => api.post<MessageResponse>("/me/change-password", data)
	});
};

// ─── Classes ─────────────────────────────────────────────
export const useClasses = () => {
	return useQuery({
		queryKey: queryKeys.classes(),
		queryFn: () => api.get<ClassSummary[]>("/classes")
	});
};

export const useClassDetail = (id: string) => {
	return useQuery({
		queryKey: queryKeys.classDetail(id),
		queryFn: () => api.get<ClassDetail>(`/classes/${id}`),
		enabled: !!id
	});
};

export const useClassScoreHistory = (classId: string) => {
	return useQuery({
		queryKey: queryKeys.classScoreHistory(classId),
		queryFn: () => api.get<ClassCumulativeScorePoint[]>(`/classes/${classId}/score-history`),
		enabled: !!classId
	});
};

export const useAvailableClassMembers = (classId: string, enabled = true) => {
	return useQuery({
		queryKey: queryKeys.availableClassMembers(classId),
		queryFn: () => api.get<UserSummary[]>(`/classes/${classId}/available-members`),
		enabled: !!classId && enabled
	});
};

export const useCreateClass = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; description: string }) => api.post("/classes", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.classes() })
	});
};

export const useJoinClassByCode = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: JoinClassByCodeRequest) => api.post<MessageResponse>("/classes/join-by-code", data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classes() });
		}
	});
};

export const useAddClassMembers = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (userIds: string[]) => api.post<MessageResponse>(`/classes/${classId}/members`, { userIds }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
			qc.invalidateQueries({ queryKey: queryKeys.availableClassMembers(classId) });
		}
	});
};

export const useRemoveClassMember = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) => api.delete<MessageResponse>(`/classes/${classId}/members`, { userId }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
			qc.invalidateQueries({ queryKey: queryKeys.availableClassMembers(classId) });
		}
	});
};

export const useUpdateClassMemberRole = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateClassMemberRoleRequest) => api.patch<MessageResponse>(`/classes/${classId}/members/role`, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
		}
	});
};

export const useUpdateClassJoinCodeSettings = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateClassJoinCodeSettingsRequest) => api.patch<ClassJoinCodeInfo>(`/classes/${classId}/join-code`, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
		}
	});
};

export const useReissueClassJoinCode = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<ClassJoinCodeInfo>(`/classes/${classId}/join-code/reissue`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.classDetail(classId) });
		}
	});
};

// ─── Assignments ─────────────────────────────────────────
export const useAssignments = (classId: string) => {
	return useQuery({
		queryKey: queryKeys.assignments(classId),
		queryFn: () => api.get<AssignmentSummary[]>(`/classes/${classId}/assignments`),
		enabled: !!classId
	});
};

export const useReorderAssignments = (classId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: ReorderAssignmentsRequest) => api.patch<MessageResponse>(`/classes/${classId}/assignments/order`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assignments(classId) })
	});
};

export const useAssignmentDetail = (id: string) => {
	return useQuery({
		queryKey: queryKeys.assignmentDetail(id),
		queryFn: () => api.get<AssignmentDetail>(`/assignments/${id}`),
		enabled: !!id
	});
};

export const useCreateAssignment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateAssignmentRequest) => api.post("/assignments", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] })
	});
};

export const useUpdateAssignment = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateAssignmentRequest) => api.patch(`/assignments/${id}`, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.assignmentDetail(id) });
			qc.invalidateQueries({ queryKey: ["assignments"] });
			qc.invalidateQueries({ queryKey: ["submissions"] });
		}
	});
};

// ─── Submissions ─────────────────────────────────────────
export const useSubmissions = (assignmentId: string, page = 1) => {
	return useQuery({
		queryKey: queryKeys.submissions(assignmentId, page),
		queryFn: () => api.get<SubmissionListResponse>(`/assignments/${assignmentId}/submissions?page=${page}`),
		enabled: !!assignmentId,
		refetchInterval: query => (query.state.data?.submissions.some(submission => isSubmissionActive(submission.status)) ? 5000 : false),
		refetchIntervalInBackground: true
	});
};

export const useSubmissionDetail = (id: string) => {
	return useQuery({
		queryKey: queryKeys.submissionDetail(id),
		queryFn: () => api.get<SubmissionDetail>(`/submissions/${id}`),
		enabled: !!id,
		refetchInterval: query => (query.state.data && isSubmissionActive(query.state.data.status) ? 5000 : false),
		refetchIntervalInBackground: true
	});
};

export const useRejudgeSubmission = (submissionId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<{ message: string; runId: string }>(`/submissions/${submissionId}/rejudge`),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: queryKeys.submissionDetail(submissionId)
			});
			qc.invalidateQueries({ queryKey: ["submissions"] });
		}
	});
};

export const useSubmit = (assignmentId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (formData: FormData) => api.upload(`/assignments/${assignmentId}/submit`, formData),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["submissions"] });
			qc.invalidateQueries({
				queryKey: queryKeys.assignmentDetail(assignmentId)
			});
		}
	});
};

// ─── Admin ───────────────────────────────────────────────
export const useUsers = (page = 1) => {
	return useQuery({
		queryKey: queryKeys.users(page),
		queryFn: () => api.get<UserListResponse>(`/admin/users?page=${page}`)
	});
};

export const useAdminRegistrationSettings = () => {
	return useQuery({
		queryKey: queryKeys.adminRegistrationSettings(),
		queryFn: () => api.get<RegistrationStatusResponse>("/admin/settings/registration")
	});
};

export const useUpdateRegistrationSettings = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateRegistrationSettingsRequest) => api.patch<RegistrationStatusResponse>("/admin/settings/registration", data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.adminRegistrationSettings() });
			qc.invalidateQueries({ queryKey: queryKeys.registrationStatus() });
		}
	});
};

export const useCreateUser = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateUserRequest) => api.post<UserSummary>("/admin/users", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
	});
};

export const useBulkImport = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkImportRequest) => api.post<BulkImportResult>("/admin/users/bulk-import", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
	});
};

export const useResetPassword = () => {
	return useMutation({
		mutationFn: (data: { userId: string; newPassword: string }) => api.post("/admin/users/reset-password", data)
	});
};
