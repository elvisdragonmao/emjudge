import type { SubmissionSummary } from "@judge/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import {
  getSubmissionStatusLabel,
  getSubmissionStatusVariant,
} from "@/lib/submission-status";

interface SubmissionGridProps {
  submissions: SubmissionSummary[];
}

export function SubmissionGrid({ submissions }: SubmissionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {submissions.map((sub) => (
        <Link key={sub.id} to={`/submissions/${sub.id}`}>
          <Card className="overflow-hidden transition-shadow hover:shadow-md">
            {/* Screenshot */}
            <div className="aspect-video bg-muted">
              {sub.screenshotUrl ? (
                <img
                  src={sub.screenshotUrl}
                  alt={`${sub.displayName} 的截圖`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  無截圖
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{sub.displayName}</span>
                <Badge variant={getSubmissionStatusVariant(sub.status)}>
                  {getSubmissionStatusLabel(sub.status)}
                </Badge>
              </div>
              {sub.score !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  分數: {sub.score} / {sub.maxScore}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(sub.createdAt).toLocaleString("zh-TW")}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function SubmissionList({ submissions }: SubmissionGridProps) {
  return (
    <div className="space-y-2">
      {submissions.map((sub) => (
        <Link key={sub.id} to={`/submissions/${sub.id}`}>
          <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{sub.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  @{sub.username} / {sub.fileCount} 個檔案
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {sub.score !== null && (
                <span className="text-sm font-medium">
                  {sub.score} / {sub.maxScore}
                </span>
              )}
              <Badge variant={getSubmissionStatusVariant(sub.status)}>
                {getSubmissionStatusLabel(sub.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(sub.createdAt).toLocaleString("zh-TW")}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
