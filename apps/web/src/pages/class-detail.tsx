import { PageTitle } from "@/components/page-title";
import { ScoreChart } from "@/components/score-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	useAddClassMembers,
	useAssignments,
	useAvailableClassMembers,
	useClassDetail,
	useClassScoreHistory,
	useReissueClassJoinCode,
	useRemoveClassMember,
	useReorderAssignments,
	useUpdateClassJoinCodeSettings
} from "@/hooks/use-api";
import { formatDate, i18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api";
import { Copy, GripVertical, Plus, RotateCcw, UserMinus, UserPlus, Users, X } from "@/lib/icons";
import { useAuth } from "@/stores/auth";
import type { AssignmentSummary } from "@judge/shared";
import { isStaff } from "@judge/shared";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

export function ClassDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const { data: cls, isLoading } = useClassDetail(id!);
	const { data: scoreHistory } = useClassScoreHistory(id!);
	const { data: assignments } = useAssignments(id!);
	const { data: availableMembers, isLoading: isLoadingAvailableMembers } = useAvailableClassMembers(id!);

	const addMembersMutation = useAddClassMembers(id!);
	const removeMemberMutation = useRemoveClassMember(id!);
	const reorderAssignmentsMutation = useReorderAssignments(id!);
	const updateJoinCodeSettingsMutation = useUpdateClassJoinCodeSettings(id!);
	const reissueJoinCodeMutation = useReissueClassJoinCode(id!);

	const [showAddMember, setShowAddMember] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [copyMessage, setCopyMessage] = useState("");
	const [memberMessage, setMemberMessage] = useState("");
	const [joinCodeMessage, setJoinCodeMessage] = useState("");
	const [assignmentMessage, setAssignmentMessage] = useState("");
	const [orderedAssignments, setOrderedAssignments] = useState<AssignmentSummary[]>([]);
	const [draggingAssignmentId, setDraggingAssignmentId] = useState<string | null>(null);
	const dragStartOrderRef = useRef<AssignmentSummary[] | null>(null);
	const dropHandledRef = useRef(false);

	useEffect(() => {
		setOrderedAssignments(assignments ?? []);
	}, [assignments]);

	if (isLoading) {
		return (
			<>
				<PageTitle title={t("pages.classDetail.loadingTitle")} />
				<p className="text-muted-foreground">{t("common.loading")}</p>
			</>
		);
	}

	if (!cls) {
		return (
			<>
				<PageTitle title={t("pages.classDetail.notFoundTitle")} />
				<p className="text-muted-foreground">{t("pages.classDetail.notFoundTitle")}</p>
			</>
		);
	}

	const memberIds = new Set(cls.members?.map(member => member.id) ?? []);
	const availableUsers = (availableMembers ?? []).filter(
		candidate =>
			!memberIds.has(candidate.id) &&
			(searchQuery === "" || candidate.username.toLowerCase().includes(searchQuery.toLowerCase()) || candidate.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
	);
	const canManageAssignments = !!user && isStaff(user.role);
	const canDragAssignments = canManageAssignments && !reorderAssignmentsMutation.isPending;

	const handleAddMember = (userId: string) => {
		setMemberMessage("");
		addMembersMutation.mutate([userId], {
			onSuccess: data => setMemberMessage(data.message),
			onError: error => setMemberMessage(getApiErrorMessage(error, t("pages.classDetail.memberActionFailed")))
		});
	};

	const handleRemoveMember = (userId: string) => {
		setMemberMessage("");
		removeMemberMutation.mutate(userId, {
			onSuccess: data => setMemberMessage(data.message),
			onError: error => setMemberMessage(getApiErrorMessage(error, t("pages.classDetail.memberActionFailed")))
		});
	};

	const handleCopyJoinCode = async () => {
		if (!cls.joinCode?.code) return;
		await navigator.clipboard.writeText(cls.joinCode.code);
		setCopyMessage(t("pages.classDetail.joinCodeCopied"));
	};

	const moveAssignment = (items: AssignmentSummary[], sourceId: string, targetId: string) => {
		const sourceIndex = items.findIndex(item => item.id === sourceId);
		const targetIndex = items.findIndex(item => item.id === targetId);

		if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
			return items;
		}

		const nextItems = [...items];
		const [movedItem] = nextItems.splice(sourceIndex, 1);
		if (!movedItem) {
			return items;
		}
		nextItems.splice(targetIndex, 0, movedItem);
		return nextItems;
	};

	const isSameAssignmentOrder = (first: AssignmentSummary[], second: AssignmentSummary[]) => {
		if (first.length !== second.length) {
			return false;
		}

		return first.every((item, index) => item.id === second[index]?.id);
	};

	const handleAssignmentDragOver = (targetAssignmentId: string) => {
		if (!draggingAssignmentId || draggingAssignmentId === targetAssignmentId) {
			return;
		}

		setOrderedAssignments(previousAssignments => moveAssignment(previousAssignments, draggingAssignmentId, targetAssignmentId));
	};

	const handleAssignmentDrop = () => {
		dropHandledRef.current = true;
		if (!draggingAssignmentId) {
			setDraggingAssignmentId(null);
			dragStartOrderRef.current = null;
			return;
		}

		const previousAssignments = dragStartOrderRef.current ?? orderedAssignments;
		const nextAssignments = orderedAssignments;
		setDraggingAssignmentId(null);
		dragStartOrderRef.current = null;

		if (isSameAssignmentOrder(nextAssignments, previousAssignments)) {
			return;
		}

		setAssignmentMessage("");
		setOrderedAssignments(nextAssignments);
		reorderAssignmentsMutation.mutate(
			{ assignmentIds: nextAssignments.map(item => item.id) },
			{
				onError: error => {
					setOrderedAssignments(previousAssignments);
					setAssignmentMessage(getApiErrorMessage(error, t("pages.classDetail.assignmentOrderFailed")));
				}
			}
		);
	};

	return (
		<div className="space-y-6">
			<PageTitle title={cls.name} />

			<div className="flex items-center justify-between gap-4">
				<div>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-bold">{cls.name}</h1>
						{cls.joinCode && (
							<Badge variant="outline" className="gap-2 border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]">
								<span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
								{cls.joinCode.enabled ? t("pages.classDetail.joinCodeOpenTag") : t("pages.classDetail.joinCodeClosedTag")}
							</Badge>
						)}
					</div>
					<p className="text-muted-foreground">{cls.description}</p>
				</div>
				{user && isStaff(user.role) && (
					<Button asChild size="sm">
						<Link to={`/classes/${id}/assignments/new`}>
							<Plus />
							{t("pages.classDetail.newAssignment")}
						</Link>
					</Button>
				)}
			</div>

			{scoreHistory && scoreHistory.length > 0 && (
				<Card>
					<CardContent className="pt-6">
						<ScoreChart data={scoreHistory} />
					</CardContent>
				</Card>
			)}

			{user && isStaff(user.role) && cls.joinCode && (
				<Card>
					<CardHeader>
						<CardTitle>{t("pages.classDetail.joinCodeTitle")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-sm font-medium">{cls.joinCode.enabled ? t("pages.classDetail.joinCodeOpenTag") : t("pages.classDetail.joinCodeClosedTag")}</p>
								<p className="text-xs text-muted-foreground">{t("pages.classDetail.joinCodeDescription")}</p>
							</div>
							<div className="flex items-center gap-3 self-start md:self-center">
								<Switch
									checked={cls.joinCode.enabled}
									disabled={updateJoinCodeSettingsMutation.isPending}
									onCheckedChange={checked => {
										setJoinCodeMessage("");
										updateJoinCodeSettingsMutation.mutate(
											{ joinCodeEnabled: checked },
											{
												onSuccess: data => setJoinCodeMessage(data.enabled ? t("pages.classDetail.joinCodeEnabled") : t("pages.classDetail.joinCodeDisabled")),
												onError: error => setJoinCodeMessage(getApiErrorMessage(error, t("pages.classDetail.joinCodeActionFailed")))
											}
										);
									}}
								/>
								<span className="text-sm text-muted-foreground">{cls.joinCode.enabled ? t("pages.classDetail.disableJoinCode") : t("pages.classDetail.enableJoinCode")}</span>
							</div>
						</div>

						<div className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-xs text-muted-foreground">{t("pages.classDetail.joinCodeLabel")}</p>
								<p className="font-mono text-2xl font-semibold tracking-[0.3em]">{cls.joinCode.code ?? "--------"}</p>
								{copyMessage && <p className="mt-1 text-xs text-muted-foreground">{copyMessage}</p>}
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={handleCopyJoinCode} disabled={!cls.joinCode.code}>
									<Copy />
									{t("pages.classDetail.copyJoinCode")}
								</Button>
								<Button
									size="sm"
									onClick={() => {
										setJoinCodeMessage("");
										reissueJoinCodeMutation.mutate(undefined, {
											onSuccess: () => setJoinCodeMessage(t("pages.classDetail.reissueJoinCodeSuccess")),
											onError: error => setJoinCodeMessage(getApiErrorMessage(error, t("pages.classDetail.joinCodeActionFailed")))
										});
									}}
									disabled={reissueJoinCodeMutation.isPending}
								>
									<RotateCcw />
									{t("pages.classDetail.reissueJoinCode")}
								</Button>
							</div>
						</div>
						{joinCodeMessage && (
							<p className={`text-sm ${updateJoinCodeSettingsMutation.isError || reissueJoinCodeMutation.isError ? "text-destructive" : "text-muted-foreground"}`}>{joinCodeMessage}</p>
						)}
					</CardContent>
				</Card>
			)}

			<div className="space-y-3">
				<h2 className="text-lg font-semibold">{t("pages.classDetail.assignmentsTitle")}</h2>
				{assignmentMessage && <p className="text-sm text-destructive">{assignmentMessage}</p>}
				{assignments?.length === 0 && <p className="text-muted-foreground">{t("pages.classDetail.noAssignments")}</p>}
				{orderedAssignments.map(assignment => (
					<Card
						key={assignment.id}
						data-assignment-card={assignment.id}
						className={`transition-shadow hover:shadow-md ${draggingAssignmentId === assignment.id ? "opacity-70" : ""}`}
						onDragOver={event => {
							if (canDragAssignments) {
								event.preventDefault();
								handleAssignmentDragOver(assignment.id);
							}
						}}
						onDrop={() => {
							if (canDragAssignments) {
								handleAssignmentDrop();
							}
						}}
					>
						<CardContent className="flex items-center justify-between gap-4 p-4">
							<div className="flex min-w-0 items-center gap-3">
								{canManageAssignments && (
									<button
										type="button"
										draggable={canDragAssignments}
										onDragStart={(event: DragEvent<HTMLButtonElement>) => {
											if (!canDragAssignments) {
												return;
											}
											event.dataTransfer.effectAllowed = "move";
											dropHandledRef.current = false;
											dragStartOrderRef.current = orderedAssignments;
											setDraggingAssignmentId(assignment.id);

											const cardElement = event.currentTarget.closest("[data-assignment-card]") as HTMLElement | null;
											if (cardElement) {
												event.dataTransfer.setDragImage(cardElement, cardElement.clientWidth / 2, 24);
											}
										}}
										onDragEnd={() => {
											if (!dropHandledRef.current && dragStartOrderRef.current) {
												setOrderedAssignments(dragStartOrderRef.current);
											}
											setDraggingAssignmentId(null);
											dragStartOrderRef.current = null;
										}}
										disabled={!canDragAssignments}
										className={`rounded-md p-1 text-muted-foreground transition-colors ${
											canDragAssignments ? "cursor-grab hover:bg-accent hover:text-foreground active:cursor-grabbing" : "cursor-not-allowed opacity-60"
										}`}
										aria-label={t("pages.classDetail.reorderAssignments")}
									>
										<GripVertical className="size-4" />
									</button>
								)}
								<Link
									to={`/assignments/${assignment.id}`}
									className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<div className="min-w-0">
										<p className="truncate font-medium hover:underline">{assignment.title}</p>
										<div className="mt-1 flex flex-wrap items-center gap-2">
											<Badge variant="secondary">{t(`assignmentTypes.${assignment.type}`)}</Badge>
											{assignment.dueDate && (
												<span className="text-xs text-muted-foreground">
													{t("pages.classDetail.dueDate", {
														date: formatDate(assignment.dueDate)
													})}
												</span>
											)}
										</div>
									</div>
									<div className="shrink-0 text-sm text-muted-foreground">
										{t("pages.classDetail.submissionsCount", {
											count: assignment.submissionCount
										})}
									</div>
								</Link>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{user && isStaff(user.role) && cls.members && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">
							{t("pages.classDetail.membersTitle", {
								count: cls.members.length
							})}
						</h2>
						<Button size="sm" variant={showAddMember ? "outline" : "default"} onClick={() => setShowAddMember(!showAddMember)}>
							{showAddMember ? <X /> : <Users />}
							{showAddMember ? t("pages.classDetail.collapse") : t("pages.classDetail.addMembers")}
						</Button>
					</div>

					{showAddMember && (
						<Card>
							<CardContent className="space-y-3 pt-4">
								{memberMessage && <p className={`text-sm ${addMembersMutation.isError || removeMemberMutation.isError ? "text-destructive" : "text-muted-foreground"}`}>{memberMessage}</p>}
								<Input placeholder={t("pages.classDetail.searchPlaceholder")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
								{isLoadingAvailableMembers && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
								{!isLoadingAvailableMembers && availableUsers.length === 0 && (
									<p className="text-sm text-muted-foreground">{searchQuery ? t("pages.classDetail.noMatchingUsers") : t("pages.classDetail.noAvailableUsers")}</p>
								)}
								<div className="max-h-60 space-y-1 overflow-auto">
									{availableUsers.map(candidate => (
										<div key={candidate.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">{candidate.displayName}</span>
												<span className="text-xs text-muted-foreground">@{candidate.username}</span>
												<Badge variant="outline">{i18n.t(`roles.${candidate.role}`)}</Badge>
											</div>
											<Button size="sm" variant="secondary" onClick={() => handleAddMember(candidate.id)} disabled={addMembersMutation.isPending}>
												<UserPlus />
												{t("pages.classDetail.join")}
											</Button>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					<div className="rounded-lg border border-border">
						<div className="grid grid-cols-4 border-b border-border bg-muted px-4 py-2 text-sm font-medium">
							<span>{t("pages.classDetail.usernameHeader")}</span>
							<span>{t("pages.classDetail.displayNameHeader")}</span>
							<span>{t("pages.classDetail.roleHeader")}</span>
							<span className="text-right">{t("pages.classDetail.actionsHeader")}</span>
						</div>
						{cls.members.map(member => (
							<div key={member.id} className="grid grid-cols-4 items-center border-b border-border px-4 py-2 text-sm last:border-b-0">
								<span>{member.username}</span>
								<span>{member.displayName}</span>
								<span>
									<Badge variant="outline">{t(`roles.${member.role}`)}</Badge>
								</span>
								<span className="text-right">
									<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveMember(member.id)} disabled={removeMemberMutation.isPending}>
										<UserMinus />
										{t("pages.classDetail.remove")}
									</Button>
								</span>
							</div>
						))}
						{cls.members.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">{t("pages.classDetail.noMembers")}</div>}
					</div>
				</div>
			)}
		</div>
	);
}
