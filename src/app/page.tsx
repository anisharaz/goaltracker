import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Flame, Target, TrendingUp, Star, type LucideIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundDecoration } from "@/components/background-decoration";
import { HeroIllustration } from "@/components/hero-illustration";

const FEATURES: { icon: LucideIcon; title: string; description: string; accent: string }[] = [
  {
    icon: Flame,
    title: "Build streaks",
    description:
      "Daily habits with flexible schedules — skip weekends, or pick exactly which days count.",
    accent: "var(--chart-1)",
  },
  {
    icon: TrendingUp,
    title: "Track numbers",
    description: "Quantity goals like distance, pages, or liters — logged and charted over time.",
    accent: "var(--chart-2)",
  },
  {
    icon: Target,
    title: "Hit milestones",
    description: "One-off goals with a target date, for the things that don't repeat.",
    accent: "var(--chart-3)",
  },
  {
    icon: Star,
    title: "Rate your effort",
    description: "An optional note and a 1-10 effectiveness rating on every check-in.",
    accent: "var(--chart-4)",
  },
];

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-muted/40">
      <BackgroundDecoration />

      <div className="flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <span className="font-heading text-lg font-semibold tracking-tight">Goal Tracker</span>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid items-center gap-16 py-12 lg:grid-cols-2 lg:gap-12 lg:py-16">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex flex-col items-start gap-6 text-left duration-500">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Streaks, done right
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl">
              Build habits that <span className="font-heading italic text-primary">actually</span> stick.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Track habits, numbers, and one-off goals on a single board — with streaks,
              effectiveness ratings, and a check-in flow that takes five seconds.
            </p>
            <div className="flex flex-col items-start gap-2">
              <Button size="lg" asChild>
                <Link href="/sign-in">Get started free</Link>
              </Button>
              <p className="text-xs text-muted-foreground">No credit card. Sign in with Google.</p>
            </div>
          </div>

          <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex justify-center duration-700 lg:justify-end">
            <HeroIllustration />
          </div>
        </section>

        <section className="flex flex-col gap-8 py-12 sm:py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2>Everything you need, nothing you don&apos;t</h2>
            <p className="max-w-md text-muted-foreground">
              Four goal types, one board, and just enough structure to keep you honest.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <Card
                key={feature.title}
                className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-300"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardContent className="flex items-start gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in oklch, ${feature.accent} 15%, transparent)`, color: feature.accent }}
                  >
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
        </section>
      </div>
    </div>
  );
}
