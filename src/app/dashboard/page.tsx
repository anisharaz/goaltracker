import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Welcome, {session.user.name}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user.email}
            </p>
          </div>
          <SignOutButton />
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Your goals
          </h2>
          {goals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/[.08] px-6 py-10 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              No goals yet. Goal creation is coming next.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="rounded-xl border border-black/[.08] px-5 py-4 dark:border-white/[.145]"
                >
                  <p className="font-medium text-black dark:text-zinc-50">
                    {goal.title}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {goal.type}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
