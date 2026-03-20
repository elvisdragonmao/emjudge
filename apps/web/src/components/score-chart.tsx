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
		const accentSoft = styles.getPropertyValue("--catppuccin-color-lavender").trim();

		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;

		const formatPointTime = (value: string) =>
			new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			}).format(new Date(value));

		const option: echarts.EChartsCoreOption = {
			title: {
				text: i18n.t("components.scoreChart.title"),
				left: "center",
				textStyle: { fontSize: 14, fontWeight: 500, color: foreground }
			},
			tooltip: {
				trigger: "axis",
				backgroundColor: styles.getPropertyValue("--color-card").trim(),
				borderColor: border,
				textStyle: { color: foreground },
				formatter: (params: unknown) => {
					const list = params as Array<{
						axisValueLabel: string;
						value: number;
						data: { assignmentTitle: string };
					}>;
					const item = list[0];
					if (!item) return "";
					return i18n.t("components.scoreChart.tooltip", {
						time: formatPointTime(item.axisValueLabel),
						value: item.value,
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
				type: "category",
				data: data.map(d => d.date),
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
			series: [
				{
					type: "line",
					data: data.map(d => ({
						value: d.totalScore,
						assignmentTitle: d.assignmentTitle
					})),
					smooth: true,
					lineStyle: { width: 3, color: accent },
					itemStyle: { color: accentSoft },
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: colorMixForChart(accent, 0.34) },
							{ offset: 1, color: colorMixForChart(accentSoft, 0.08) }
						])
					}
				}
			]
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

function colorMixForChart(color: string, alpha: number) {
	const normalized = color.replace("#", "");
	if (normalized.length !== 6) return color;

	const r = Number.parseInt(normalized.slice(0, 2), 16);
	const g = Number.parseInt(normalized.slice(2, 4), 16);
	const b = Number.parseInt(normalized.slice(4, 6), 16);

	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
