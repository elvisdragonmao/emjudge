import { marked } from "marked";
import { useMemo } from "react";

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	const html = useMemo(() => {
		return marked.parse(content, { async: false }) as string;
	}, [content]);

	return <div className={`markdown-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
