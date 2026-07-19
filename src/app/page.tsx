import { redirect } from "next/navigation";

import { DashboardContent } from "@/app/dashboard/dashboard-content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function hasRequiredProfileAndGoal() {
  const profile = await prisma.userProfile.findFirst({
    include: {
      trainingGoals: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return Boolean(profile?.trainingGoals[0]);
}

export default async function HomePage() {
  if (!(await hasRequiredProfileAndGoal())) {
    redirect("/goals");
  }

  return <DashboardContent showHomeLink={false} />;
}
