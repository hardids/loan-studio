import { useId, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Info,
  Layers,
  Wallet,
  TrendingDown,
} from "lucide-react";
import {
  fmt,
  won,
  korean,
  totals,
  schedule,
  methods,
  type Loan,
  type Row,
} from "./loan";
export function Heading({
  icon: Icon,
  children,
}: {
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <h2>
      <Icon size={20} strokeWidth={1.8} />
      {children}
    </h2>
  );
}
function Summary({ s, rows }: { s: Loan; rows: Row[] }) {
  const sum = totals(rows),
    first = rows[0],
    last = rows.at(-1)!;
  const grace = s.method === "bullet" ? 0 : s.grace;
  const share = Math.round((s.amount / sum.total) * 1000) / 10;
  const main = s.method === "bullet" ? first.interest : first.regular;
  const label = grace
    ? "거치 중 첫 납입액"
    : s.method === "bullet"
      ? "첫 달 이자"
      : s.method === "principal" || s.change || s.extra
        ? "첫 달 정기 납입액"
        : "예상 월 납입액";
  const second = grace
    ? rows[grace]
    : s.method === "annuity"
      ? undefined
      : last;
  return (
    <section className="summary">
      <div className="summaryTitle">
        <span>
          <Wallet size={17} />
          상환 요약
        </span>
        <span className="pill">{methods[s.method]}상환</span>
      </div>
      <div className="heroRow">
        <div>
          <div className="heroLabel">{label}</div>
          <div className="heroValue">
            {fmt(main)}
            <b>원</b>
          </div>
          {second && (
            <div className="secondaryPay">
              {grace ? "거치 종료 후 첫 납입액" : "마지막 달 납입액"}{" "}
              <b>{won(second.regular)}</b>
            </div>
          )}
        </div>
        <div
          className="donut"
          style={{
            background:
              "conic-gradient(#a7e3b4 0 " +
              share +
              "%,#4a7361 " +
              share +
              "% 100%)",
          }}
        >
          <div>
            <strong>{share}%</strong>
            <small>원금 비중</small>
          </div>
        </div>
      </div>
      <dl className="summaryStats">
        <div>
          <dt>총이자</dt>
          <dd>{won(sum.interest)}</dd>
        </div>
        <div>
          <dt>총수수료</dt>
          <dd>{won(sum.fee)}</dd>
        </div>
        <div>
          <dt>총지출</dt>
          <dd>{won(sum.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
function Events({ s, rows }: { s: Loan; rows: Row[] }) {
  const total = totals(rows);
  const x = s.extra,
    c = s.change;
  const base = x ? schedule({ ...s, extra: undefined }) : [];
  const savings = x ? totals(base).interest - total.interest : 0;
  const rateBase = c ? schedule({ ...s, change: undefined }) : [];
  const rateDiff = c ? total.interest - totals(rateBase).interest : 0;
  const changeRow = c ? rows[c.month - 1] : undefined;
  return (
    <>
      {x && (
        <section className="panel effect">
          <Heading icon={TrendingDown}>중도상환 효과</Heading>
          {rows[x.month - 1] ? (
            <>
              <p>
                순절감액 <strong>{won(savings - total.fee)}</strong>
              </p>
              <small>
                추가 상환을 하지 않을 때와 비교해 이자 {won(savings)} 절감 ·
                수수료 {won(total.fee)}
              </small>
              <small>
                {base.length - rows.length}개월 단축 ·{" "}
                {rows[x.month]
                  ? "다음 정기 납입액 " + won(rows[x.month].regular)
                  : "해당 회차에 완납"}
              </small>
            </>
          ) : (
            <p>이미 상환이 끝나 적용되지 않음</p>
          )}
        </section>
      )}
      {c && (
        <section className="panel effect">
          <Heading icon={Activity}>금리 변경 효과</Heading>
          {changeRow ? (
            <>
              <p>
                {c.month}회차 정기 납입액{" "}
                <strong>{won(changeRow.regular)}</strong>
              </p>
              <small>
                {c.month > 1
                  ? "직전 회차 " + won(rows[c.month - 2].regular)
                  : "첫 회차부터 변경 금리 적용"}{" "}
                · 기존 금리 유지 시 대비 총이자 {won(Math.abs(rateDiff))}{" "}
                {rateDiff > 0 ? "증가" : rateDiff < 0 ? "감소" : "차이"}
              </small>
            </>
          ) : (
            <p>이미 상환이 끝나 적용되지 않음</p>
          )}
        </section>
      )}
    </>
  );
}
function Chart({
  s,
  rows,
  pick,
}: {
  s: Loan;
  rows: Row[];
  pick: (n: number) => void;
}) {
  const id = useId();
  const count = rows.length,
    years = Math.ceil(count / 12);
  const xx = (month: number) => 8 + (month / count) * 484;
  const yy = (balance: number) => 8 + 90 * (1 - balance / s.amount);
  const path =
    "M8,8 " +
    rows.map((r) => "L" + xx(r.month) + "," + yy(r.balance)).join(" ");
  const marks = [...new Set([s.change?.month, s.extra?.month])].filter(
    (v): v is number => !!v && v <= count,
  );
  return (
    <section className="panel chart">
      <div className="panelHead">
        <Heading icon={Activity}>남은 대출금 추이</Heading>
        <span className="legend">대출잔액</span>
      </div>
      <div className="plot">
        <div className="ylabels">
          <span>{korean(s.amount)}</span>
          <span>{korean(Math.round(s.amount / 2))}</span>
          <span>0원</span>
        </div>
        <div className="graph">
          <svg
            role="img"
            aria-label={
              "대출잔액이 " +
              korean(s.amount) +
              "에서 " +
              count +
              "회차에 0원으로 감소"
            }
            viewBox="0 0 500 105"
            preserveAspectRatio="none"
            onClick={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              pick(
                Math.max(
                  1,
                  Math.min(
                    years,
                    Math.ceil((((e.clientX - b.left) / b.width) * count) / 12),
                  ),
                ),
              );
            }}
          >
            <defs>
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#43a774" stopOpacity=".24" />
                <stop offset="100%" stopColor="#43a774" stopOpacity=".025" />
              </linearGradient>
            </defs>
            {[8, 53, 98].map((y) => (
              <line
                key={y}
                x1="0"
                x2="500"
                y1={y}
                y2={y}
                stroke="#dce5e0"
                strokeDasharray="4 5"
              />
            ))}
            <path d={path + " L492,98 L8,98 Z"} fill={"url(#" + id + ")"} />
            <path
              d={path}
              fill="none"
              stroke="#218458"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            {[0, ...marks, count].map((m, i) => (
              <circle
                key={i}
                cx={xx(m)}
                cy={yy(m ? rows[m - 1].balance : s.amount)}
                r="3.6"
                fill="#218458"
              >
                <title>
                  {m}회차 {m ? won(rows[m - 1].balance) : won(s.amount)}
                </title>
              </circle>
            ))}
          </svg>
          <div className="ticks">
            <span>시작</span>
            <span>{Math.ceil(count / 2)}개월</span>
            <span>{count}개월</span>
          </div>
        </div>
      </div>
      <div className="chartFoot">
        <span>
          {marks.length
            ? marks
                .map(
                  (m) =>
                    m +
                    "회차 " +
                    [cLabel(s, m), s.extra?.month === m ? "중도상환" : ""]
                      .filter(Boolean)
                      .join(" · "),
                )
                .join(" / ")
            : "회차별 납입 내역"}
        </span>
        <select
          aria-label="그래프 연도 선택"
          value=""
          onChange={(e) => pick(+e.target.value)}
        >
          <option value="" disabled>
            연도 선택
          </option>
          {Array.from({ length: years }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}년차
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
function cLabel(s: Loan, m: number) {
  return s.change?.month === m ? "금리 변경" : "";
}
export function Results({
  s,
  rows,
  invalid,
}: {
  s: Loan;
  rows: Row[];
  invalid: string;
}) {
  const [year, setYear] = useState(0);
  const id = useId();
  if (!rows.length)
    return (
      <section className="panel emptyResult">
        <Wallet size={30} />
        <h2>{invalid}</h2>
      </section>
    );
  const max = Math.ceil(rows.length / 12);
  function pick(n: number) {
    setYear(n);
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: "nearest" }),
    );
  }
  return (
    <>
      <Summary s={s} rows={rows} />
      <Chart s={s} rows={rows} pick={pick} />
      <Events s={s} rows={rows} />
      <section className="panel schedule" id={id}>
        <div className="panelHead">
          <Heading icon={CalendarDays}>월별 상환표</Heading>
          <span className="meta">총 {rows.length}회</span>
        </div>
        {Array.from({ length: max }, (_, i) => {
          const group = rows.slice(i * 12, (i + 1) * 12);
          return (
            <div key={i}>
              <button
                className="yearRow"
                aria-expanded={year === i + 1}
                onClick={() => setYear(year === i + 1 ? 0 : i + 1)}
              >
                <b>{i + 1}년차</b>
                <span>
                  {group[0].month}~{group.at(-1)!.month}회차
                </span>
                <ChevronDown size={15} />
              </button>
              {year === i + 1 && (
                <div
                  className="tableScroll"
                  tabIndex={0}
                  aria-label="월별 상환표 가로 스크롤"
                >
                  <table>
                    <caption>단위 원</caption>
                    <thead>
                      <tr>
                        {[
                          "회차",
                          "정기 납입액",
                          "정기 상환원금",
                          "이자",
                          "추가 상환원금",
                          "수수료",
                          "이달 총지출",
                          "남은 원금",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((r) => (
                        <tr key={r.month}>
                          {[
                            r.month,
                            r.regular,
                            r.principal,
                            r.interest,
                            r.extra,
                            r.fee,
                            r.total,
                            r.balance,
                          ].map((v, k) => (
                            <td key={k}>{fmt(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </section>
      <p className="note">
        <Info size={15} />월 단위 추정값으로, 실제 납입액은 금융기관의 일할
        계산과 원 단위 처리에 따라 달라질 수 있습니다.
      </p>
    </>
  );
}
export function Comparison({
  a,
  b,
  ar,
  br,
}: {
  a: Loan;
  b: Loan;
  ar: Row[];
  br: Row[];
}) {
  if (!ar.length || !br.length)
    return (
      <div className="panel">두 비교안에 유효한 조건을 입력해 주세요.</div>
    );
  const at = totals(ar),
    bt = totals(br);
  const diff = (v: number) =>
    v === 0
      ? "같습니다"
      : won(Math.abs(v)) + (v > 0 ? " 증가합니다" : " 감소합니다");
  const uniform = [a, b].every(
    (s) => s.method === "annuity" && !s.extra && !s.change && !s.grace,
  );
  const extra = (x: Loan["extra"]) =>
    x
      ? [
          x.month + "회차",
          x.full ? "전액" : won(x.amount),
          x.feeMode === "rate" ? x.fee + "%" : won(x.fee),
          x.shorten ? "기간 단축" : "만기 유지",
        ].join(" · ")
      : "없음";
  const change = (x: Loan["change"]) =>
    x ? x.month + "회차부터 " + x.rate + "%" : "없음";
  const data = [
    ["대출금", won(a.amount), won(b.amount)],
    ["연 금리", a.rate + "%", b.rate + "%"],
    ["전체 기간", a.months + "개월", b.months + "개월"],
    [
      "거치기간",
      (a.method === "bullet" ? 0 : a.grace) + "개월",
      (b.method === "bullet" ? 0 : b.grace) + "개월",
    ],
    ["상환방식", methods[a.method], methods[b.method]],
    ["중도상환", extra(a.extra), extra(b.extra)],
    ["금리 변경", change(a.change), change(b.change)],
    ["첫 정기 납입액", won(ar[0].regular), won(br[0].regular)],
    [
      "가장 많이 지출하는 달",
      at.peak.month + "회 · " + won(at.peak.total),
      bt.peak.month + "회 · " + won(bt.peak.total),
    ],
    ["총이자", won(at.interest), won(bt.interest)],
    ["총지출 (수수료 포함)", won(at.total), won(bt.total)],
  ];
  return (
    <section className="panel compare">
      <Heading icon={Layers}>조건 비교</Heading>
      <p>
        B안의 {uniform ? "월" : "첫 달"} 정기 납입액은 A안 대비{" "}
        {diff(br[0].regular - ar[0].regular)}. 총이자는{" "}
        {diff(bt.interest - at.interest)}.
      </p>
      <table>
        <thead>
          <tr>
            <th>비교 항목</th>
            <th>A안</th>
            <th>B안</th>
          </tr>
        </thead>
        <tbody>
          {data.map(([key, av, bv]) => (
            <tr key={key} className={av !== bv ? "different" : ""}>
              <th>{key}</th>
              <td>{av}</td>
              <td>{bv}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
