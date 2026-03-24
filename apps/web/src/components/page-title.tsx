import { Helmet } from "react-helmet-async";

const APP_NAME = "emjudge";

type PageTitleProps = {
	title?: string;
};

export const PageTitle = ({ title }: PageTitleProps) => {
	const content = title ? `${title} | ${APP_NAME}` : APP_NAME;

	return (
		<Helmet>
			<title>{content}</title>
		</Helmet>
	);
};
