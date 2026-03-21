import { i18n } from "@/i18n";
import type { ClassCumulativeScorePoint } from "@judge/shared";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface ScoreChartProps {
	data: ClassCumulativeScorePoint[];
	className?: string;
}

export function ScoreChart({ data, className }: ScoreChartProps) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);

	useEffect(() => {
		if (!chartRef.current) return;

		const styles = getComputedStyle(document.documentElement);
		const foreground = styles.getPropertyValue("--color-foreground").trim();
		const mutedForeground = styles.getPropertyValue("--color-muted-foreground").trim();
		const border = styles.getPropertyValue("--color-border").trim();
		const accent = styles.getPropertyValue("--catppuccin-color-blue").trim();
		const seriesColors = [
			styles.getPropertyValue("--catppuccin-color-blue").trim(),
			styles.getPropertyValue("--catppuccin-color-green").trim(),
			styles.getPropertyValue("--catppuccin-color-peach").trim(),
			styles.getPropertyValue("--catppuccin-color-pink").trim(),
			styles.getPropertyValue("--catppuccin-color-teal").trim(),
			styles.getPropertyValue("--catppuccin-color-mauve").trim(),
			styles.getPropertyValue("--catppuccin-color-yellow").trim(),
			styles.getPropertyValue("--catppuccin-color-red").trim()
		].filter(Boolean);

		const groupedPoints = new Map<string, ClassCumulativeScorePoint[]>();
		for (const point of data) {
			const existing = groupedPoints.get(point.userId) ?? [];
			existing.push(point);
			groupedPoints.set(point.userId, existing);
		}

		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;

		const formatPointTime = (value: string) =>
			new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			}).format(new Date(value));

		const series = Array.from(groupedPoints.values()).map((points, index) => ({
			name: points[0]?.userName ?? `User ${index + 1}`,
			type: "line" as const,
			data: points.map(point => ({
				value: [point.date, point.totalScore],
				assignmentTitle: point.assignmentTitle
			})),
			smooth: true,
			showSymbol: true,
			symbolSize: 7,
			lineStyle: { width: 3, color: seriesColors[index % seriesColors.length] || accent },
			itemStyle: { color: seriesColors[index % seriesColors.length] || accent }
		}));

		const option: echarts.EChartsCoreOption = {
			color: seriesColors,
			title: {
				text: i18n.t("components.scoreChart.title"),
				left: "center",
				textStyle: { fontSize: 14, fontWeight: 500, color: foreground }
			},
			legend: {
				top: 28,
				textStyle: { color: mutedForeground }
			},
			tooltip: {
				trigger: "item",
				backgroundColor: styles.getPropertyValue("--color-card").trim(),
				borderColor: border,
				textStyle: { color: foreground },
				formatter: (params: unknown) => {
					const item = params as {
						seriesName: string;
						value: [string, number];
						data: { assignmentTitle: string };
					};
					if (!item) return "";
					return i18n.t("components.scoreChart.tooltip", {
						time: formatPointTime(item.value[0]),
						userName: item.seriesName,
						value: item.value[1],
						assignmentTitle: item.data.assignmentTitle
					});
				}
			},
			grid: {
				left: "3%",
				right: "4%",
				bottom: "3%",
				containLabel: true
			},
			xAxis: {
				type: "time",
				axisLine: { lineStyle: { color: border } },
				axisTick: { lineStyle: { color: border } },
				axisLabel: {
					rotate: 30,
					color: mutedForeground,
					formatter: (value: string) => formatPointTime(value)
				}
			},
			yAxis: {
				type: "value",
				min: 0,
				axisLabel: { color: mutedForeground },
				splitLine: { lineStyle: { color: border, opacity: 0.55 } }
			},
			series
		};

		chart.setOption(option);

		const handleResize = () => chart.resize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			chart.dispose();
		};
	}, [data]);

	return <div ref={chartRef} className={className} style={{ height: 300 }} />;
}
