import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/utils/db";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
