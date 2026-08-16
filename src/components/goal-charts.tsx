"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ChartPoint = {
  date: string;
  completed: number;
  rating: number | null;
};

export function GoalCharts({
  data,
  goalType,
  targetUnit,
}: {
  data: ChartPoint[];
  goalType: "HABIT" | "NUMERIC" | "MILESTONE";
  targetUnit: string | null;
}) {
  const activityLabel = goalType === "NUMERIC" ? targetUnit || "Value" : "Completed";

  const activityConfig = {
    completed: { label: activityLabel, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const ratingConfig = {
    rating: { label: "Effectiveness", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const hasRatings = data.some((d) => d.rating != null);

  return (
    <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Last 30 days</CardTitle>
          <CardDescription>
            {goalType === "NUMERIC" ? `Logged ${activityLabel.toLowerCase()} per day` : "Daily completion"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={activityConfig} className="aspect-auto h-48 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={goalType === "NUMERIC"}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {hasRatings && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Effectiveness trend</CardTitle>
            <CardDescription>Self-rated 1-10 on days you checked in</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ratingConfig} className="aspect-auto h-48 w-full">
              <LineChart data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={20}
                  domain={[0, 10]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="rating"
                  stroke="var(--color-rating)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
