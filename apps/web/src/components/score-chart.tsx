import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ClassLeaderboardEntry } from "@judge/shared";

echarts.use([
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  CanvasRenderer,
]);

interface ScoreChartProps {
  data: ClassLeaderboardEntry[];
  className?: string;
}

export function ScoreChart({ data, className }: ScoreChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const chartHeight = Math.max(300, data.length * 44 + 96);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    const option: echarts.EChartsCoreOption = {
      title: {
        text: "班級累積分數排行榜",
        left: "center",
        textStyle: { fontSize: 14, fontWeight: 500 },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const item = params as {
            name: string;
            value: number;
            data: ClassLeaderboardEntry;
            dataIndex: number;
          };

          return [
            `第 ${item.dataIndex + 1} 名：${item.name}`,
            `累積分數：${item.value}`,
            `有成績作業數：${item.data.scoredAssignments}`,
            `帳號：@${item.data.username}`,
          ].join("<br/>");
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: 48,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        minInterval: 1,
      },
      yAxis: {
        type: "category",
        data: data.map((d) => `${d.displayName} (@${d.username})`),
        inverse: true,
        axisLabel: {
          interval: 0,
        },
      },
      series: [
        {
          type: "bar",
          data: data.map((d) => ({
            ...d,
            value: d.totalScore,
            name: `${d.displayName} (@${d.username})`,
          })),
          barMaxWidth: 28,
          itemStyle: { color: "#3b82f6" },
          label: {
            show: true,
            position: "right",
            formatter: "{c}",
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data]);

  return (
    <div ref={chartRef} className={className} style={{ height: chartHeight }} />
  );
}
