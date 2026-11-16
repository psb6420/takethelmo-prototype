"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Empty, Field, inputClass, Panel } from "@/components/ui/DemoUI";
import { isAdmin, profiles, timeLabel, uid } from "./model";
import { useDemo } from "./Store";
import { downloadBlob } from "./files";
export function Labs() {
  const { state, update, notify } = useDemo();
  const [tab, setTab] = useState("시설 정보");
  const [adding, setAdding] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const membersEditable = state.role === "lab_manager" || isAdmin(state.role);
  const ledgerEditable = state.role === "lmo_manager" || isAdmin(state.role);
  function exportLedger() {
    const escape = (v: string | number) =>
      `"${String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csv = [
      ["일시", "유형", "대상", "수량", "단위", "기록자"],
      ...state.ledger.map((r) => [
        r.at,
        r.type,
        r.label,
        r.quantity,
        r.unit,
        r.actor,
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");
    downloadBlob(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      "가상_시설_관리대장.csv",
    );
  }
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <Badge>가상 연구실</Badge>
            <h2 className="mt-4 text-xl font-semibold">바이오융합연구실</h2>
            <p className="mt-2 text-sm text-gray-500">
              데모연구원 · 연구동 A 301호
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-brand-800">
              {state.members.filter((m) => m.active).length}
              <span className="ml-1 text-sm font-normal text-gray-400">명</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">활동 중인 구성원</p>
          </div>
        </div>
      </Panel>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="연구실 정보 구분"
      >
        {["시설 정보", "구성원", "관리대장", "안전 현황"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={t === tab}
            className={`rounded-full border px-4 py-2 text-sm ${t === tab ? "border-brand-700 bg-brand-700 text-white" : "border-gray-200 bg-white text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "시설 정보" && (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <Panel title="시설 기본 정보">
            <dl className="space-y-5 text-sm">
              {[
                ["시설명", "바이오융합 연구시설 (가상)"],
                ["시설 코드", "DEMO-LAB-01"],
                ["시설 유형", "LMO 연구시설 화면 예시"],
                ["안전관리 등급", "예시 2등급 · 실제 지정 아님"],
                ["신고·허가 상태", "공식 기록 미연동 · 확인 필요"],
                ["LMO 담당자", "정바이오 (가상 인물)"],
              ].map(([k, v]) => (
                <div className="grid grid-cols-[7rem_1fr] gap-3" key={k}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium leading-6">{v}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href="/demo/requests?kind=lmo" className="mt-6">
              시설 변경 검토 요청
            </ButtonLink>
          </Panel>
          <Panel title="시설 기록 확인">
            <p className="text-sm leading-7 text-gray-500">
              공식 신고·허가 기록을 연동하지 않은 가상 화면입니다. 실제 기록은
              기관 담당자와 공식 시스템에서 확인하세요.
            </p>
            <a
              className="mt-5 inline-block text-sm font-medium text-brand-700"
              href="https://www.lmosafety.or.kr/mps"
              target="_blank"
              rel="noreferrer"
            >
              LMO정보시스템 열기 ↗
            </a>
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-medium">최근 내부 업무</p>
              {state.requests
                .filter((r) => r.kind === "LMO 시설 변경")
                .slice(0, 3)
                .map((r) => (
                  <div
                    className="mt-4 flex flex-wrap justify-between gap-2"
                    key={r.id}
                  >
                    <span className="text-xs text-gray-500">{r.title}</span>
                    <Badge muted>{r.status}</Badge>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      )}
      {tab === "구성원" && (
        <Panel
          title="구성원 관리"
          aside={
            membersEditable ? (
              <Button onClick={() => setAdding(!adding)}>구성원 추가</Button>
            ) : (
              <Badge muted>담당자 역할에서 관리</Badge>
            )
          }
        >
          {adding && membersEditable && (
            <form
              className="mb-6 grid items-end gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const name = String(form.get("name")).trim();
                if (!name) {
                  notify("구성원 이름을 입력해 주세요.", true);
                  return;
                }
                if (
                  update(
                    (s) => ({
                      ...s,
                      members: [
                        ...s.members,
                        {
                          id: uid(),
                          name,
                          role: String(form.get("role")),
                          active: true,
                        },
                      ],
                    }),
                    "가상 구성원을 추가했습니다.",
                  )
                )
                  setAdding(false);
              }}
            >
              <Field label="구성원 이름">
                <input
                  className={inputClass}
                  name="name"
                  required
                  maxLength={30}
                  placeholder="가상 이름"
                />
              </Field>
              <Field label="구성원 역할">
                <select className={inputClass} name="role">
                  <option>일반 연구원</option>
                  <option>연구실 안전담당자</option>
                  <option>LMO 담당자</option>
                </select>
              </Field>
              <Button type="submit">구성원 저장</Button>
            </form>
          )}
          <div className="divide-y divide-gray-100">
            {state.members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="ml-3 text-xs text-gray-500">{m.role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge muted={!m.active}>
                    {m.active ? "활동 중" : "비활성"}
                  </Badge>
                  {membersEditable && (
                    <button
                      className="text-xs text-gray-500 underline underline-offset-4"
                      onClick={() =>
                        update(
                          (s) => ({
                            ...s,
                            members: s.members.map((row) =>
                              row.id === m.id
                                ? { ...row, active: !row.active }
                                : row,
                            ),
                          }),
                          "구성원 상태를 변경했습니다.",
                        )
                      }
                    >
                      {m.active ? "비활성화" : "복원"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "관리대장" && (
        <Panel
          title="시설 관리대장 예시"
          aside={
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportLedger}>
                CSV 다운로드
              </Button>
              {ledgerEditable && (
                <Button onClick={() => setLedgerOpen(!ledgerOpen)}>
                  기록 추가
                </Button>
              )}
            </div>
          }
        >
          <p className="mb-5 text-xs leading-6 text-gray-500">
            가상 관리기록을 입력하는 화면입니다. 법정 서식이나 실제 물질 재고가
            아닙니다. LMO 담당자·관리자 역할에서 입력할 수 있어요.
          </p>
          {ledgerOpen && ledgerEditable && (
            <form
              className="mb-6 space-y-4 rounded-xl bg-gray-50 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const label = String(form.get("label")).trim();
                if (!label) {
                  notify("대상 이름을 입력해 주세요.", true);
                  return;
                }
                const quantity = Number(form.get("quantity"));
                if (!Number.isFinite(quantity) || quantity <= 0) return;
                if (
                  update(
                    (s) => ({
                      ...s,
                      ledger: [
                        {
                          id: uid(),
                          type: String(form.get("type")),
                          label,
                          quantity,
                          unit: String(form.get("unit")),
                          at: new Date().toISOString(),
                          actor: profiles[s.role].name,
                        },
                        ...s.ledger,
                      ],
                    }),
                    "가상 관리기록을 저장했습니다.",
                  )
                )
                  setLedgerOpen(false);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="기록 유형">
                  <select name="type" className={inputClass}>
                    <option>확인</option>
                    <option>반입</option>
                    <option>반출</option>
                    <option>폐기 기록</option>
                  </select>
                </Field>
                <Field label="대상 이름">
                  <input
                    name="label"
                    className={inputClass}
                    required
                    maxLength={100}
                    placeholder="가상 대상 이름"
                  />
                </Field>
                <Field label="수량">
                  <input
                    type="number"
                    name="quantity"
                    className={inputClass}
                    required
                    min={0.01}
                    max={1000000}
                    step={0.01}
                  />
                </Field>
                <Field label="단위">
                  <select name="unit" className={inputClass}>
                    <option>건</option>
                    <option>개</option>
                    <option>상자</option>
                  </select>
                </Field>
              </div>
              <Button type="submit">관리기록 저장</Button>
            </form>
          )}
          <div className="space-y-3">
            {state.ledger.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <Badge muted>{r.type}</Badge>
                  <p className="mt-3 text-sm font-medium">{r.label}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {timeLabel(r.at)} · {r.actor}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {r.quantity} {r.unit}
                </span>
              </div>
            ))}
            {!state.ledger.length && <Empty>등록된 관리기록이 없습니다.</Empty>}
          </div>
        </Panel>
      )}
      {tab === "안전 현황" && (
        <Panel title="연구실 안전 현황">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["기록된 점검", state.inspections.length, "건"],
              [
                "미종결 개선조치",
                state.actions.filter((a) => a.status !== "종결").length,
                "건",
              ],
              [
                "미종결 사고 기록",
                state.incidents.filter((i) => i.status !== "종결").length,
                "건",
              ],
            ].map(([label, count, unit]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-4 text-2xl font-semibold">
                  {count}
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    {unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/demo/inspections" variant="outline">
              점검·개선조치 확인
            </ButtonLink>
            <ButtonLink href="/demo/incidents" variant="outline">
              사고 기록 확인
            </ButtonLink>
          </div>
        </Panel>
      )}
    </div>
  );
}
