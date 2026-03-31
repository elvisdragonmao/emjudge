import { FileUploader } from "@/components/file-uploader";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PageTitle } from "@/components/page-title";
import { SubmissionGrid, SubmissionList } from "@/components/submission-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssignmentDetail, useClassDetail, useDeleteAssignment, useSubmissions, useSubmit } from "@/hooks/use-api";
import { useRefetchCountdown } from "@/hooks/use-refetch-countdown";
import { formatDateTime } from "@/i18n";
import { ApiError, getApiErrorMessage } from "@/lib/api";
import { LayoutGrid, List, PencilLine, Trash2 } from "@/lib/icons";
import { isSubmissionActive } from "@/lib/submission-status";
import { useAuth } from "@/stores/auth";
import type { SubmissionSummary } from "@judge/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

const SubmissionSection = ({ title, submissions, viewMode }: { title: string; submissions: SubmissionSummary[]; viewMode: "list" | "grid" }) => {
	if (submissions.length === 0) {
		return null;
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<h3 className="text-base font-semibold">{title}</h3>
				<span className="text-xs text-muted-foreground">{submissions.length}</span>
			</div>
			{viewMode === "grid" ? <SubmissionGrid submissions={submissions} /> : <SubmissionList submissions={submissions} />}
		</div>
	);
};

export const AssignmentDetailPage = () => {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { data: assignment, isLoading } = useAssignmentDetail(id!);
	const { data: classDetail } = useClassDetail(assignment?.classId ?? "");
	const { data: submissionData, dataUpdatedAt: submissionsUpdatedAt } = useSubmissions(id!);
	const submitMutation = useSubmit(id!);
	const deleteMutation = useDeleteAssignment(id!, assignment?.classId ?? "");

	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
	const [showLatestOnly, setShowLatestOnly] = useState(true);
	const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

	const submitErrorMessage = (() => {
		if (!submitMutation.isError) {
			return null;
		}

		const error = submitMutation.error;
		if (error instanceof ApiError) {
			if (error.statusCode === 413 || error.message.includes("reach files limit")) {
				return t("pages.assignmentDetail.uploadFailedTooManyFiles");
			}

			return error.message;
		}

		return getApiErrorMessage(error, t("pages.assignmentDetail.uploadFailedDefault"));
	})();

	const handleUpload = (files: File[]) => {
		const formData = new FormData();
		for (const file of files) {
			const relativePath = file.webkitRelativePath || file.name;
			formData.append("path", relativePath);
			formData.append("file", file, relativePath);
		}
		submitMutation.mutate(formData);
	};

	const hasActiveSubmissions = submissionData?.submissions.some(submission => isSubmissionActive(submission.status)) ?? false;

	const visibleSubmissions = useMemo(() => {
		const submissions = submissionData?.submissions ?? [];

		if (!showLatestOnly) {
			return submissions;
		}

		const seenUsers = new Set<string>();

		return submissions.filter(submission => {
			if (seenUsers.has(submission.userId)) {
				return false;
			}

			seenUsers.add(submission.userId);
			return true;
		});
	}, [submissionData?.submissions, showLatestOnly]);

	const ownSubmissions = useMemo(() => visibleSubmissions.filter(submission => submission.userId === user?.id), [visibleSubmissions, user?.id]);
	const otherSubmissions = useMemo(() => visibleSubmissions.filter(submission => submission.userId !== user?.id), [visibleSubmissions, user?.id]);

	const submissionsRefreshCountdown = useRefetchCountdown(hasActiveSubmissions, 5000, submissionsUpdatedAt);

	if (isLoading) {
		return (
			<>
				<PageTitle title={t("pages.assignmentDetail.loadingTitle")} />
				<p className="text-muted-foreground">{t("common.loading")}</p>
			</>
		);
	}

	if (!assignment) {
		return (
			<>
				<PageTitle title={t("pages.assignmentDetail.notFoundTitle")} />
				<p className="text-muted-foreground">{t("pages.assignmentDetail.notFoundTitle")}</p>
			</>
		);
	}

	const isExpired = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;
	const isPublishedNow = assignment.status === "published" && (!assignment.publishedAt || new Date(assignment.publishedAt) <= new Date());
	const currentUserClassRole = classDetail?.members.find(member => member.id === user?.id)?.role;
	const canManageAssignment = !!user && (user.role === "admin" || currentUserClassRole === "teacher");
	const canSubmitAssignment = !!user && currentUserClassRole === "student";

	const handleDeleteAssignment = () => {
		if (!assignment) {
			return;
		}

		setDeleteErrorMessage(null);

		const confirmed = window.confirm(
			t("pages.assignmentDetail.deleteConfirm", {
				defaultValue: 'Delete assignment "{{title}}"? This also removes its submissions and judge records.',
				title: assignment.title
			})
		);

		if (!confirmed) {
			return;
		}

		deleteMutation.mutate(undefined, {
			onSuccess: () => {
				navigate(`/classes/${assignment.classId}`);
			},
			onError: error => setDeleteErrorMessage(getApiErrorMessage(error, t("pages.assignmentDetail.deleteFailed", { defaultValue: "Delete failed, please try again." })))
		});
	};

	return (
		<div className="space-y-6">
			<PageTitle title={assignment.title} />

			<div>
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold">{assignment.title}</h1>
					<Badge variant="secondary">{t(`assignmentTypes.${assignment.type}`)}</Badge>
					{assignment.status === "draft" && <Badge variant="outline">{t("pages.assignmentForm.statusDraft")}</Badge>}
					{assignment.status === "published" && !isPublishedNow && <Badge variant="outline">{t("pages.assignmentDetail.scheduled")}</Badge>}
					{isExpired && <Badge variant="destructive">{t("pages.assignmentDetail.expired")}</Badge>}
					{canManageAssignment && (
						<>
							<Button asChild size="sm" variant="outline">
								<Link to={`/assignments/${assignment.id}/edit`}>
									<PencilLine />
									{t("pages.assignmentDetail.editAssignment")}
								</Link>
							</Button>
							<Button size="sm" variant="destructive" onClick={handleDeleteAssignment} disabled={deleteMutation.isPending}>
								<Trash2 />
								{deleteMutation.isPending
									? t("pages.assignmentDetail.deletingAssignment", { defaultValue: "Deleting..." })
									: t("pages.assignmentDetail.deleteAssignment", { defaultValue: "Delete assignment" })}
							</Button>
						</>
					)}
				</div>
				<p className="mt-1 text-sm text-muted-foreground">
					{assignment.className}
					{assignment.dueDate && (
						<>
							{" / "}
							{t("pages.assignmentDetail.dueAt", {
								date: formatDateTime(assignment.dueDate)
							})}
						</>
					)}
				</p>
				{deleteErrorMessage && <p className="mt-2 text-sm text-destructive">{deleteErrorMessage}</p>}
			</div>

			{assignment.description && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("pages.assignmentDetail.description")}</CardTitle>
					</CardHeader>
					<CardContent>
						<MarkdownRenderer content={assignment.description} />
					</CardContent>
				</Card>
			)}

			{canSubmitAssignment && isPublishedNow && !isExpired && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("pages.assignmentDetail.submitAssignment")}</CardTitle>
					</CardHeader>
					<CardContent>
						<FileUploader onUpload={handleUpload} isLoading={submitMutation.isPending} />
						{submitMutation.isSuccess && <p className="mt-3 text-sm text-[var(--color-success)]">{t("pages.assignmentDetail.submitSuccess")}</p>}
						{submitErrorMessage && <p className="mt-3 text-sm text-destructive">{submitErrorMessage}</p>}
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold">
							{t("pages.assignmentDetail.submissionsTitle", {
								count: visibleSubmissions.length
							})}
						</h2>
						{showLatestOnly && visibleSubmissions.length !== (submissionData?.total ?? 0) && <p className="text-xs text-muted-foreground">{t("pages.assignmentDetail.hiddenDuplicates")}</p>}
						{hasActiveSubmissions && (
							<p className="text-xs text-muted-foreground">
								{t("pages.assignmentDetail.refreshIn", {
									seconds: submissionsRefreshCountdown
								})}
							</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						<label className="flex items-center gap-2 text-sm text-muted-foreground">
							<input type="checkbox" checked={showLatestOnly} onChange={e => setShowLatestOnly(e.target.checked)} className="h-4 w-4 rounded border-border" />
							{t("pages.assignmentDetail.latestOnly")}
						</label>
						<Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
							<List />
							{t("pages.assignmentDetail.list")}
						</Button>
						<Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
							<LayoutGrid />
							{t("pages.assignmentDetail.grid")}
						</Button>
					</div>
				</div>

				{visibleSubmissions.length === 0 && <p className="text-muted-foreground">{t("pages.assignmentDetail.noSubmissions")}</p>}

				{visibleSubmissions.length > 0 && (
					<div className="space-y-6">
						<SubmissionSection title={t("pages.assignmentDetail.mySubmissions", { defaultValue: "My submissions" })} submissions={ownSubmissions} viewMode={viewMode} />
						<SubmissionSection title={t("pages.assignmentDetail.otherSubmissions", { defaultValue: "Other submissions" })} submissions={otherSubmissions} viewMode={viewMode} />
					</div>
				)}
			</div>
		</div>
	);
};
