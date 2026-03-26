import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
	const html = useMemo(() => {
		const rawHtml = marked.parse(content, { async: false }) as string;
		return DOMPurify.sanitize(rawHtml);
	}, [content]);

	return <div className={`markdown-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
