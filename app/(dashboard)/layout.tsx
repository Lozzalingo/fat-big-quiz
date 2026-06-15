import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/utils/db";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auto-authenticate on localhost (matching BucketRace's local dev behaviour)
  const headersList = headers();
  const host = headersList.get("host") || "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (isLocalhost) {
    console.log("[Admin] Localhost detected - bypassing auth");
    return <>{children}</>;
  }

  // In production, require NextAuth session with admin role
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { role: true },
    });

    // Redirect non-admin users to homepage
    if (!user || user.role === "user") {
      redirect("/");
    }
  } catch (error) {
    console.error("[Admin] Error checking user role:", error);
    redirect("/");
  }

  return <>{children}</>;
}
