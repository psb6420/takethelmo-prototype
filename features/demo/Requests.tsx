"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Empty,
  Field,
  inputClass,
  Panel,
  Timeline,
} from "@/components/ui/DemoUI";
import {
  canReview,
  history,
  profiles,
  timeLabel,
  transitionRequest,
  uid,
  type RequestItem,
  type RequestStatus,
} from "./model";
import { pushNotification, useDemo } from "./Store";
export function Requests({ initialKind }: { initialKind?: string }) {
  const { state, update, notify } = useDemo();
  const [creating, setCreating] = useState(initialKind === "lmo");
  const [filter, setFilter] = useState("전체");
  const [kind, setKind] = useState(
    initialKind === "lmo" ? "LMO 시설 변경" : "연구실 출입",
  );
  const rows = state.requests
    .filter((r) =>
      state.role === "researcher"
        ? r.owner === state.role
        : r.owner === state.role || canReview(state.role, r),
    )
    .filter(
      (r) =>
        filter === "전체" ||
        (filter === "내 신청"
          ? r.owner === state.role
          : filter === "검토 대기"
            ? canReview(state.role, r) && ["제출", "검토 중"].includes(r.status)
            : ["승인", "반려"].includes(r.status)),
    );
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              작성자와 검토자 모두 경험해 보세요
            </h2>
            <p className="mt-2 text-xs leading-6 text-gray-500">
              일반 연구원으로 제출 → 상단에서 안전관리자 역할로 전환 → 검토 시작
              → 보완·승인·반려
            </p>
          </div>
          <Button
            onClick={() => setCreating(!creating)}
            aria-expanded={creating}
          >
            {creating ? "작성 닫기" : "+ 새 신청서"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          이곳의 승인은 가상 내부 업무 처리입니다. 공식 신고·허가를 대신하지
          않습니다.
        </p>
      </Panel>
      {creating && (
        <Panel title="새 검토 요청">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const title = String(form.get("title")).trim();
              const body = String(form.get("body")).trim();
              if (!title || !body) {
                notify("제목과 신청 내용을 공백 없이 입력해 주세요.", true);
                return;
              }
              const owner = state.role;
              const item: RequestItem = {
                id: `REQ-${uid().slice(0, 8)}`,
                title,
                kind,
                body,
                owner,
                status: "제출",
                history: [history(owner, "제출", "내부 검토를 요청합니다.")],
              };
              if (
                update(
                  (s) =>
                    pushNotification(
                      { ...s, requests: [item, ...s.requests] },
                      {
                        title: `새 검토 요청: ${title}`,
                        detail: "신청 내용을 확인하고 검토를 시작해 주세요.",
                        target: "safety_admin",
                        href: "/demo/requests",
                      },
                    ),
                  "신청서를 제출했습니다. 담당자 역할에서 검토할 수 있습니다.",
                )
              )
                setCreating(false);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="신청 유형">
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {[
                    "연구실 출입",
                    "LMO 시설 변경",
                    "문서 검토",
                    "기타 안전 업무",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="신청 제목">
                <input
                  className={inputClass}
                  name="title"
                  required
                  maxLength={100}
                  placeholder="검토받을 내용을 간단히 적어 주세요"
                />
              </Field>
            </div>
            <Field label="신청 내용">
              <textarea
                className={inputClass}
                name="body"
                required
                maxLength={4000}
                rows={5}
                placeholder="현재 상황, 변경 내용, 확인받고 싶은 사항"
              />
            </Field>
            <Button type="submit">검토 요청 제출</Button>
          </form>
        </Panel>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="신청 필터">
        {["전체", "내 신청", "검토 대기", "처리 완료"].map((f) => (
          <button
            className={`rounded-full border px-4 py-2 text-xs ${filter === f ? "border-brand-700 bg-brand-700 text-white" : "border-gray-200 bg-white text-gray-500"}`}
            aria-pressed={filter === f}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {rows.map((r) => (
          <RequestCard key={`${r.id}-${state.role}`} item={r} />
        ))}
        {!rows.length && <Empty>이 조건에 해당하는 신청서가 없습니다.</Empty>}
      </div>
    </div>
  );
}
function RequestCard({ item }: { item: RequestItem }) {
  const { state, update } = useDemo();
  const [note, setNote] = useState("");
  const [body, setBody] = useState(item.body);
  const [decision, setDecision] = useState<RequestStatus>("승인");
  const review = canReview(state.role, item);
  const resubmit = item.owner === state.role && item.status === "보완 요청";
  function change(to: RequestStatus, comment = note) {
    if (
      update(
        (s) => {
          const current = s.requests.find((r) => r.id === item.id)!;
          const next = transitionRequest(
            current,
            s.role,
            to,
            comment,
            resubmit ? body : undefined,
          );
          return pushNotification(
            {
              ...s,
              requests: s.requests.map((r) => (r.id === item.id ? next : r)),
            },
            {
              title: `${item.title} · ${resubmit ? "재제출" : to}`,
              detail: comment,
              href: "/demo/requests",
              target: resubmit ? "safety_admin" : item.owner,
            },
          );
        },
        `신청 상태를 '${resubmit ? "재제출" : to}'로 변경했습니다.`,
      )
    )
      setNote("");
  }
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge muted>{item.kind}</Badge>
            <Badge>{item.status}</Badge>
          </div>
          <h2 className="font-semibold">{item.title}</h2>
          <p className="mt-2 text-xs text-gray-400">
            {item.id} · {profiles[item.owner].name} ·{" "}
            {timeLabel(item.history[0].at)}
          </p>
        </div>
        {review && item.status === "제출" && (
          <Button
            onClick={() =>
              change("검토 중", "신청 내용을 확인하기 시작했습니다.")
            }
          >
            검토 시작
          </Button>
        )}
      </div>
      <p className="mt-5 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-600">
        {item.body}
      </p>
      {(resubmit || (review && item.status === "검토 중")) && (
        <form
          className="mt-5 space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            change(resubmit ? "제출" : decision);
          }}
        >
          <h3 className="text-sm font-semibold">
            {resubmit ? "보완 후 재제출" : "검토 결과 작성"}
          </h3>
          {resubmit ? (
            <Field label="보완한 신청 내용">
              <textarea
                rows={4}
                className={inputClass}
                required
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
          ) : (
            <Field label="처리 결과">
              <select
                className={inputClass}
                value={decision}
                onChange={(e) => setDecision(e.target.value as RequestStatus)}
              >
                {["승인", "보완 요청", "반려"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={resubmit ? "보완 설명" : "검토 의견"}>
            <textarea
              className={inputClass}
              required
              maxLength={2000}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="다음 담당자가 이해할 수 있도록 구체적으로 작성해 주세요"
            />
          </Field>
          <Button
            disabled={!note.trim() || (resubmit && !body.trim())}
            type="submit"
          >
            {resubmit ? "보완 후 재제출" : "검토 결과 저장"}
          </Button>
        </form>
      )}
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium text-brand-700">
          처리 이력 ({item.history.length})
        </summary>
        <div className="mt-5">
          <Timeline items={item.history} />
        </div>
      </details>
    </Panel>
  );
}
