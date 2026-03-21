import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/lib/icons";
import { useAuth } from "@/stores/auth";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NotFoundPage() {
	const { isAuthenticated } = useAuth();
	const { t } = useTranslation();

	return (
		<div className="flex min-h-[70vh] items-center justify-center">
			<PageTitle title={t("pages.notFound.title")} />
			<div className="flex max-w-2xl flex-col items-center text-center">
				<p className="animate-fade-up text-8xl font-bold leading-none tracking-tight sm:text-9xl">404</p>
				<p className="animate-fade-up delay-1 mt-4 max-w-md text-sm text-muted-foreground sm:text-base">{t("pages.notFound.description")}</p>
				<div className="animate-fade-up delay-2 mt-8">
					<Button asChild>
						<Link to={isAuthenticated ? "/classes" : "/"}>
							<ArrowLeft />
							{t("pages.notFound.backHome")}
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
