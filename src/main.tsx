import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, CopyPlus, NotebookPen, Wallet, Coins } from "lucide-react";
import { Inputs, Field, DEFAULT_RANGE } from "./Inputs";
import { Comparison, Results, Heading, Summary } from "./Results";
import {
  budgetPrincipal,
  evaluate,
  won,
  initial,
  type Loan,
  LIMIT,
  MAX_MONTHS,
} from "./loan";
import "./style.css";

function Budget({ apply }: { apply: (s: Loan) => void }) {
  const [payment, setPayment] = useState(1000000),
    [rate, setRate] = useState(5),
    [months, setMonths] = useState(12);
  const principal = budgetPrincipal(payment, rate, months);
  const monthsOK =
    Number.isInteger(months) && months >= 1 && months <= MAX_MONTHS;
  const rateOK = Number.isFinite(rate) && rate >= 0 && rate <= 100;
  const budgetOK =
    Number.isInteger(payment) && payment >= 1 && payment <= LIMIT;
  return (
    <div className="workspace budget">
      <section className="panel controls">
        <Heading icon={Wallet}>월 예산 입력</Heading>
        <Field
          label="월 납입 예산"
          value={payment}
          unit="원"
          onChange={setPayment}
          error={
            budgetOK ? undefined : "1원~1조 원 사이의 정수를 입력해 주세요."
          }
        />
        <div className="pair">
          <Field
            label="연 금리"
            value={rate}
            unit="%"
            onChange={setRate}
            error={rateOK ? undefined : "0~100% 사이로 입력해 주세요."}
          />
          <Field
            label="전체 기간"
            value={months}
            unit="개월"
            onChange={setMonths}
            error={monthsOK ? undefined : "1~600개월의 정수를 입력해 주세요."}
          />
        </div>
      </section>
      <section className="summary">
        <div className="summaryTitle">
          <span>
            <Coins size={18} />월 예산 기준 대출금
          </span>
        </div>
        <div className="heroValue">{principal ? won(principal) : "—"}</div>
        <p>고정금리 · 거치 없음 · 원리금균등상환</p>
        <p>
          마지막 회차까지 월 예산 안에서 갚을 수 있는 원금입니다. 계산 범위는
          최대 1조 원입니다.
        </p>
        <button
          className="lightBtn"
          disabled={!principal}
          onClick={() => apply({ ...initial, amount: principal, rate, months })}
        >
          이 금액으로 상세 계산
        </button>
      </section>
    </div>
  );
}
function App() {
  const [page, setPage] = useState<"loan" | "budget">("loan"),
    [a, setA] = useState<Loan>({ ...initial }),
    [b, setB] = useState<Loan | null>(null),
    [active, setActive] = useState<"A" | "B">("A"),
    [help, setHelp] = useState(false);
  const [ranges, setRanges] = useState({ A: DEFAULT_RANGE, B: DEFAULT_RANGE });
  const current = active === "B" && b ? b : a;
  const ar = evaluate(a),
    br = b ? evaluate(b) : null;
  const result = active === "B" && br ? br : ar;
  function apply(s: Loan) {
    if (active === "B" && b) setB(s);
    else setA(s);
    setPage("loan");
  }
  return (
    <>
      <header>
        <div className="headerInner">
          <a className="brand" href="./" aria-label="상환노트 홈">
            <img src="./mark.svg" width="34" height="34" alt="" />
            상환노트
          </a>
          <nav aria-label="계산기 선택">
            <button
              aria-current={page === "loan" ? "page" : undefined}
              onClick={() => setPage("loan")}
            >
              대출 계산
            </button>
            <button
              aria-current={page === "budget" ? "page" : undefined}
              onClick={() => setPage("budget")}
            >
              월 예산 역산
            </button>
          </nav>
          <button
            className="guide"
            aria-label="계산 기준"
            aria-expanded={help}
            onClick={() => setHelp(!help)}
          >
            <BookOpen size={16} />
            <span>계산 기준</span>
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <h1>{page === "loan" ? "대출 상환 계산기" : "월 예산 역산"}</h1>
            <p>
              {page === "loan"
                ? "대출 조건을 조정하고, 매달 낼 금액과 남은 원금을 확인하세요."
                : "매달 낼 수 있는 금액으로 대출원금을 계산하세요."}
            </p>
          </div>
          {page === "loan" && !b && (
            <button
              className="secondary"
              onClick={() => {
                setB(structuredClone(a));
                setRanges({ ...ranges, B: ranges.A });
                setActive("B");
              }}
            >
              <CopyPlus size={17} />
              비교안 추가
            </button>
          )}
        </div>
        {help && (
          <section className="panel help">
            <Heading icon={BookOpen}>계산 기준</Heading>
            <p>
              월 이율은 연 금리 ÷ 12로 계산하며 이자는 매회 가장 가까운 원으로
              반올림합니다. 원리금균등은 만기 안에 완납할 수 있는 최소 정수 월
              납입액을 적용하고 마지막 회차에 잔액을 정산합니다.
            </p>
            <p>
              같은 달에는 변경 금리 적용, 정기 납입, 중도상환과 수수료 반영
              순으로 처리합니다. 새 상환 일정은 다음 회차부터 적용됩니다.
            </p>
          </section>
        )}
        {page === "budget" ? (
          <Budget apply={apply} />
        ) : (
          <>
            {b && (
              <div className="caseTabs" aria-label="수정할 조건">
                {(["A", "B"] as const).map((k) => (
                  <button
                    key={k}
                    aria-pressed={active === k}
                    onClick={() => setActive(k)}
                  >
                    {k}안 수정
                  </button>
                ))}
                {ar.rows.length > 0 && br && br.rows.length > 0 && (
                  <a href="#compare-results">비교 결과 보기</a>
                )}
              </div>
            )}
            <div className="workspace simulator">
              {result.rows.length > 0 ? (
                <Summary s={current} rows={result.rows} />
              ) : (
                <section className="panel emptyResult">
                  <Wallet size={24} />
                  <h2>
                    {result.errors.amount ?? "입력 조건을 확인해 주세요."}
                  </h2>
                </section>
              )}
              <section className="panel controls">
                <div className="panelHead">
                  <Heading icon={NotebookPen}>대출 조건</Heading>
                  <span className="meta">{b ? active + "안" : ""}</span>
                </div>
                <Inputs
                  key={active}
                  chosen={ranges[active]}
                  setChosen={(upper) =>
                    setRanges({ ...ranges, [active]: upper })
                  }
                  s={current}
                  update={active === "A" ? setA : setB}
                  errors={result.errors}
                />
              </section>
              <Results
                key={active}
                s={current}
                rows={result.rows}
                comparison={
                  b &&
                  br && <Comparison a={a} b={b} ar={ar.rows} br={br.rows} />
                }
              />
            </div>
          </>
        )}
      </main>
      <footer>
        <span>
          <img src="./mark.svg" width="21" height="21" alt="" />
          상환노트
        </span>
        <span>대출 상환 계산기</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
