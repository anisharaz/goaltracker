import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Target, TrendingUp, Star, type LucideIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundDecoration } from "@/components/background-decoration";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Flame,
    title: "Build streaks",
    description:
      "Daily habits with flexible schedules — skip weekends, or pick exactly which days count.",
  },
  {
    icon: TrendingUp,
    title: "Track numbers",
    description: "Quantity goals like distance, pages, or liters — logged and charted over time.",
  },
  {
    icon: Target,
    title: "Hit milestones",
    description: "One-off goals with a target date, for the things that don't repeat.",
  },
  {
    icon: Star,
    title: "Rate your effort",
    description: "An optional note and a 1-10 effectiveness rating on every check-in.",
  },
];

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-4xl flex-1 flex-col items-center gap-16 px-6 py-24 text-center sm:px-8">
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex flex-col items-center gap-5 duration-500">
          <h1>Goal Tracker</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Habits, numbers, and milestones — in one place, with streaks that keep you honest.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-in">Get started</Link>
          </Button>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <Card
              key={feature.title}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardContent className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
