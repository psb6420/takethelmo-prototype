import { redirect } from "next/navigation";
import { getLocalUser } from "@/features/local-auth/session";
import { LocalLoginForm } from "@/features/local-auth/LoginForm";
import { safeNextPath } from "@/lib/safe-redirect";
export const runtime = "nodejs";
export const metadata = { title: "프로토타입 로그인" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getLocalUser()) redirect(safeNextPath(next, "/demo"));
  return <main className="grid min-h-screen place-items-center bg-gray-50 px-4 py-12">
    <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 sm:p-9">
      <p className="text-sm font-semibold text-brand-700">taketheLMO</p>
      <h1 className="mt-4 text-2xl font-bold">프로토타입 로그인</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">내 계정으로 로그인하고 체험 기록을 이어가세요. 처음이라면 회원가입으로 시작할 수 있어요.</p>
      <LocalLoginForm next={next} />
      <p className="mt-6 text-xs leading-6 text-gray-500">이 서버에 등록한 계정으로 이용합니다. 체험 기록과 첨부파일은 계정별로 이 브라우저에 저장됩니다.</p>
    </section>
  </main>;
}
