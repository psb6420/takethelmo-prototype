import { Home } from "@/features/demo/Home";
import { requireLocalUser } from "@/features/local-auth/session";
export default async function DemoPage() {
  await requireLocalUser();
  return <Home />;
}
