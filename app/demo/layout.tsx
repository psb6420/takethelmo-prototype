import { requireLocalUser } from "@/features/local-auth/session";
import { DemoProvider } from "@/features/demo/Store";
import { DemoShell } from "@/features/demo/Shell";
export const metadata = { title: "사용자 체험 데모" };
export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLocalUser();
  return (
    <DemoProvider key={user.id} user={user}>
      <DemoShell>{children}</DemoShell>
    </DemoProvider>
  );
}
