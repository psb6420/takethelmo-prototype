export type Role =
  | "researcher"
  | "lab_manager"
  | "lmo_manager"
  | "safety_admin"
  | "super_admin";
export const profiles: Record<
  Role,
  { name: string; label: string; scope: string }
> = {
  researcher: { name: "김연구", label: "일반 연구원", scope: "나의 업무" },
  lab_manager: {
    name: "이담당",
    label: "연구실 안전담당자",
    scope: "바이오융합연구실",
  },
  lmo_manager: {
    name: "정바이오",
    label: "LMO 담당자",
    scope: "LMO 시설 업무",
  },
  safety_admin: {
    name: "박안전",
    label: "기관 안전관리자",
    scope: "데모연구원 전체",
  },
  super_admin: {
    name: "최관리",
    label: "시스템 관리자",
    scope: "데모연구원 전체",
  },
};
export type History = {
  at: string;
  actor: string;
  event: string;
  note: string;
};
export type FileRef = { id: string; name: string; size: number; type: string };
export type RequestStatus = "제출" | "검토 중" | "보완 요청" | "승인" | "반려";
export type RequestItem = {
  id: string;
  title: string;
  kind: string;
  body: string;
  owner: Role;
  status: RequestStatus;
  history: History[];
};
export type Course = {
  id: string;
  title: string;
  category: string;
  duration: string;
  due: string;
  description: string;
};
export type Enrollment = {
  courseId: string;
  owner: Role;
  status: "수강 예정" | "등록 완료";
  file?: FileRef;
  completedAt?: string;
  at: string;
};
export type ActionItem = {
  id: string;
  title: string;
  note: string;
  status: "조치 중" | "검토 대기" | "종결";
  owner: Role;
  due: string;
  file?: FileRef;
  history: History[];
};
export type Inspection = {
  id: string;
  at: string;
  owner: Role;
  results: Record<string, string>;
  note: string;
};
export type Incident = {
  id: string;
  title: string;
  kind: string;
  place: string;
  body: string;
  occurredAt: string;
  owner: Role;
  status: "접수" | "확인 중" | "종결";
  file?: FileRef;
  history: History[];
};
export type Notification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  target: Role | "all";
  at: string;
};
export type Ledger = {
  id: string;
  type: string;
  label: string;
  quantity: number;
  unit: string;
  at: string;
  actor: string;
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
};
export type DemoState = {
  version: 1;
  role: Role;
  courses: Course[];
  enrollments: Enrollment[];
  requests: RequestItem[];
  actions: ActionItem[];
  inspections: Inspection[];
  incidents: Incident[];
  notifications: Notification[];
  read: Record<string, string[]>;
  bookmarks: string[];
  guideSteps: string[];
  ledger: Ledger[];
  members: { id: string; name: string; role: string; active: boolean }[];
  chat: ChatMessage[];
  assessment: Record<string, string>;
};
export function uid() {
  return crypto.randomUUID();
}
export function history(role: Role, event: string, note: string): History {
  return {
    at: new Date().toISOString(),
    actor: profiles[role].name,
    event,
    note,
  };
}
export function isAdmin(role: Role) {
  return role === "safety_admin" || role === "super_admin";
}
export function canReview(role: Role, item: RequestItem) {
  if (role === item.owner || role === "researcher") return false;
  return (
    isAdmin(role) ||
    (role === "lmo_manager"
      ? item.kind === "LMO 시설 변경"
      : item.kind !== "LMO 시설 변경")
  );
}
export function transitionRequest(
  item: RequestItem,
  role: Role,
  to: RequestStatus,
  note: string,
  body?: string,
): RequestItem {
  const resubmit =
    to === "제출" && item.status === "보완 요청" && role === item.owner;
  const review =
    canReview(role, item) &&
    ((item.status === "제출" && to === "검토 중") ||
      (item.status === "검토 중" &&
        ["승인", "반려", "보완 요청"].includes(to)));
  if (!resubmit && !review)
    throw new Error("현재 역할 또는 처리 상태에서는 이 작업을 할 수 없습니다.");
  if (!note.trim()) throw new Error("처리 의견을 입력해 주세요.");
  if (resubmit && !body?.trim())
    throw new Error("보완한 신청 내용을 입력해 주세요.");
  return {
    ...item,
    status: to,
    body: body?.trim() || item.body,
    history: [
      ...item.history,
      history(role, resubmit ? "보완 후 재제출" : to, note.trim()),
    ],
  };
}
export function transitionAction(
  item: ActionItem,
  role: Role,
  to: ActionItem["status"],
  note: string,
  file?: FileRef,
): ActionItem {
  const submit =
    item.status === "조치 중" && to === "검토 대기" && role === item.owner;
  const review =
    item.status === "검토 대기" &&
    (to === "종결" || to === "조치 중") &&
    role !== item.owner &&
    (isAdmin(role) || role === "lab_manager");
  if (!submit && !review)
    throw new Error("현재 역할 또는 처리 상태에서 변경할 수 없습니다.");
  if (!note.trim())
    throw new Error("조치 내용 또는 검토 의견을 입력해 주세요.");
  if (submit && !file && !item.file)
    throw new Error("조치 증빙 파일을 첨부해 주세요.");
  return {
    ...item,
    status: to,
    note: note.trim(),
    file: file || item.file,
    history: [...item.history, history(role, to, note.trim())],
  };
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
export function timeLabel(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function daysLeft(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(`${value.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) /
      86400000,
  );
}
export function deadline(value: string) {
  const d = daysLeft(value);
  return d < 0 ? `${-d}일 지남` : d === 0 ? "오늘 마감" : `D-${d}`;
}
