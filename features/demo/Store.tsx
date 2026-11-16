"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSeed } from "./data";
import {
  canReview,
  profiles,
  type DemoState,
  type Notification,
  type FileRef,
  type History,
} from "./model";
export const STORAGE_KEY = "takethelmo:frontend-demo:v1";
type LocalUser = { id: string; name: string; email: string };
type Context = {
  user: LocalUser;
  storageScope: string;
  state: DemoState;
  update: (
    change: (state: DemoState) => DemoState,
    message?: string,
  ) => boolean;
  notify: (message: string, error?: boolean) => void;
  reset: () => boolean;
};
const DemoContext = createContext<Context | null>(null);
function validState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const s = value as DemoState;
  const validFile = (file?: FileRef) =>
    !file ||
    (typeof file.id === "string" &&
      typeof file.name === "string" &&
      typeof file.size === "number" &&
      typeof file.type === "string");
  const validHistory = (items: History[]) =>
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (h) =>
        h &&
        ["at", "actor", "event", "note"].every(
          (k) => typeof h[k as keyof History] === "string",
        ),
    );
  const validDate = (date: string) =>
    typeof date === "string" && Number.isFinite(new Date(date).getTime());
  return (
    s.version === 1 &&
    !!profiles[s.role] &&
    [
      "courses",
      "enrollments",
      "requests",
      "actions",
      "inspections",
      "incidents",
      "notifications",
      "bookmarks",
      "guideSteps",
      "ledger",
      "members",
      "chat",
    ].every((k) => Array.isArray(s[k as keyof DemoState])) &&
    !!s.read &&
    typeof s.read === "object" &&
    !!s.assessment &&
    typeof s.assessment === "object" &&
    Object.values(s.read).every(
      (ids) => Array.isArray(ids) && ids.every((id) => typeof id === "string"),
    ) &&
    Object.values(s.assessment).every((v) =>
      ["예", "아니요", "모르겠어요"].includes(v),
    ) &&
    s.bookmarks.every((id) => typeof id === "string") &&
    s.guideSteps.every((id) => typeof id === "string") &&
    s.courses.length > 0 &&
    s.courses.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        validDate(c.due),
    ) &&
    s.requests.every(
      (r) =>
        r &&
        !!profiles[r.owner] &&
        typeof r.title === "string" &&
        typeof r.body === "string" &&
        typeof r.kind === "string" &&
        ["제출", "검토 중", "보완 요청", "승인", "반려"].includes(r.status) &&
        validHistory(r.history),
    ) &&
    s.actions.every(
      (a) =>
        a &&
        !!profiles[a.owner] &&
        typeof a.title === "string" &&
        typeof a.note === "string" &&
        validDate(a.due) &&
        ["조치 중", "검토 대기", "종결"].includes(a.status) &&
        validHistory(a.history) &&
        validFile(a.file),
    ) &&
    s.incidents.every(
      (i) =>
        i &&
        !!profiles[i.owner] &&
        typeof i.title === "string" &&
        typeof i.body === "string" &&
        typeof i.place === "string" &&
        typeof i.occurredAt === "string" &&
        ["접수", "확인 중", "종결"].includes(i.status) &&
        validHistory(i.history) &&
        validFile(i.file),
    ) &&
    s.enrollments.every(
      (e) =>
        e &&
        !!profiles[e.owner] &&
        typeof e.courseId === "string" &&
        validFile(e.file) &&
        (e.status !== "등록 완료" || !!e.file),
    ) &&
    s.inspections.every(
      (i) =>
        i && !!profiles[i.owner] && i.results && typeof i.results === "object",
    ) &&
    s.notifications.every(
      (n) =>
        n &&
        typeof n.title === "string" &&
        typeof n.detail === "string" &&
        typeof n.href === "string" &&
        n.href.startsWith("/demo"),
    ) &&
    s.members.every(
      (m) =>
        m &&
        typeof m.name === "string" &&
        typeof m.role === "string" &&
        typeof m.active === "boolean",
    ) &&
    s.ledger.every(
      (r) => r && typeof r.label === "string" && typeof r.quantity === "number",
    ) &&
    s.chat.every(
      (m) =>
        m &&
        typeof m.text === "string" &&
        ["user", "assistant"].includes(m.role) &&
        (!m.sources ||
          (Array.isArray(m.sources) &&
            m.sources.every((id) => typeof id === "string"))),
    )
  );
}
export function DemoProvider({ children, user }: { children: React.ReactNode; user: LocalUser }) {
  const storageScope = user.id;
  const storageKey = `${STORAGE_KEY}:user:${user.id}`;
  const [state, setState] = useState<DemoState>(createSeed);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  function notify(text: string, error = false) {
    setNotice({ text, error });
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (!validState(stored)) throw new Error("invalid");
        current.current = stored;
        setState(stored);
      }
    } catch {
      setNotice({
        text: "저장된 데모 데이터를 읽지 못했습니다. 초기 시나리오를 표시합니다. 변경 전 브라우저 저장 설정을 확인해 주세요.",
        error: true,
      });
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const value: unknown = JSON.parse(event.newValue);
          if (validState(value)) {
            current.current = value;
            setState(value);
          }
        } catch {
          /* 다른 탭의 불완전한 값은 사용하지 않는다. */
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  function update(change: (state: DemoState) => DemoState, message?: string) {
    try {
      const next = change(current.current);
      localStorage.setItem(storageKey, JSON.stringify(next));
      current.current = next;
      setState(next);
      if (message) notify(message);
      return true;
    } catch (error) {
      notify(
        error instanceof Error && error.name !== "QuotaExceededError"
          ? error.message
          : "저장 공간이 부족합니다. 데모 초기화 또는 브라우저 저장 공간을 확인해 주세요.",
        true,
      );
      return false;
    }
  }
  return (
    <DemoContext.Provider
      value={{
        user,
        storageScope,
        state,
        update,
        notify,
        reset: () =>
          update(() => createSeed(), "데모 시나리오를 초기화했습니다."),
      }}
    >
      {ready ? (
        children
      ) : (
        <div
          className="grid min-h-screen place-items-center text-brand-700"
          role="status"
        >
          데모를 불러오고 있어요…
        </div>
      )}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className="fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-xl items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-900 p-4 text-sm text-white shadow-lg"
        >
          <span>{notice.text}</span>
          <button
            aria-label="메시지 닫기"
            className="shrink-0 px-2"
            onClick={() => setNotice(null)}
          >
            ✕
          </button>
        </div>
      )}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider가 필요합니다.");
  return context;
}
export function pushNotification(
  state: DemoState,
  notification: Omit<Notification, "id" | "at">,
): DemoState {
  return {
    ...state,
    notifications: [
      {
        ...notification,
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
      },
      ...state.notifications,
    ],
  };
}
export function getNotifications(state: DemoState) {
  const courses: Notification[] = state.courses
    .filter(
      (c) =>
        !state.enrollments.some(
          (e) =>
            e.owner === state.role &&
            e.courseId === c.id &&
            e.status === "등록 완료",
        ),
    )
    .map((c) => ({
      id: `course-${state.role}-${c.id}`,
      title: `${c.title} 이수증을 등록해 주세요`,
      detail: `예제 기한 ${c.due}`,
      href: "/demo/training",
      target: state.role,
      at: c.due,
    }));
  const actions: Notification[] = state.actions
    .filter((a) => a.owner === state.role && a.status !== "종결")
    .map((a) => ({
      id: `action-${a.id}-${a.status}`,
      title: a.title,
      detail: `${a.status} · 예제 기한 ${a.due}`,
      href: "/demo/inspections",
      target: state.role,
      at: a.due,
    }));
  const reviews: Notification[] = state.requests
    .filter(
      (r) => canReview(state.role, r) && ["제출", "검토 중"].includes(r.status),
    )
    .map((r) => ({
      id: `review-${r.id}-${r.history.length}`,
      title: `${r.title} 검토가 필요해요`,
      detail: `${r.status} · ${profiles[r.owner].name}의 내부 요청`,
      href: "/demo/requests",
      target: state.role,
      at: r.history[r.history.length - 1].at,
    }));
  return [
    ...state.notifications.filter(
      (n) => n.target === "all" || n.target === state.role,
    ),
    ...actions,
    ...reviews,
    ...courses,
  ];
}
