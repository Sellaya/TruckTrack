'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';

const chartData = [
  { month: 'January', expenses: 2400 },
  { month: 'February', expenses: 1398 },
  { month: 'March', expenses: 3800 },
  { month: 'April', expenses: 1908 },
  { month: 'May', expenses: 800 },
  { month: 'June', expenses: 1800 },
];

const chartConfig = {
  expenses: {
    label: 'Expenses',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

export function OverviewChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Expenses Overview</CardTitle>
        <CardDescription>For the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
