/**
 * Dashboard layout - admin area wrapper.
 *
 * Auth is now handled by:
 * 1. middleware.ts (SSO + site cookie check at the Edge)
 * 2. The admin/layout.tsx client component (checks role via useAuth)
 *
 * This server layout simply renders children. The middleware already
 * blocks unauthenticated users before they reach this point.
 */

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
