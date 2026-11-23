import { House, Scale, Layers } from "lucide-react";
import { Field } from "./Inputs";
import { Heading } from "./Results";
import { CompareTable, category, numeric } from "./CompareTable";
import { areas, mortgage, type Mortgage } from "./mortgage";
import { korean, won, type Loan } from "./loan";

export function Housing({
  homes,
  active,
  comparing,
  update,
  apply,
}: {
  homes: Record<"A" | "B", Mortgage>;
  active: "A" | "B";
  comparing: boolean;
  update: (next: Mortgage) => void;
  apply: (a: Loan, b?: Loan) => void;
}) {
  const s = homes[active],
    set = (patch: Partial<Mortgage>) => update({ ...s, ...patch });
  const a = mortgage(homes.A),
    b = comparing ? mortgage(homes.B) : null;
  const { errors, result: r } = active === "B" && b ? b : a;
  const canApply = !!a.result?.amount && (!comparing || !!b?.result?.amount);
  const moneyField = (
    key: "price" | "income" | "debt" | "appraisal",
    label: string,
  ) => (
    <Field
      label={label}
      unit="만원"
      value={(s[key] ?? NaN) / 10000}
      onChange={(v) => set({ [key]: Math.round(v * 10000) })}
      error={errors[key]}
    />
  );
  const ar = a.result,
    br = b?.result;
  return (
    <div className="housingLayout">
      <section className="panel homeForm" id="home-inputs">
        <Heading icon={House}>
          매매 조건{comparing ? " · " + active + "안" : ""}
        </Heading>
        <p className="homeHint">무주택 세대의 일반 주담대 · 원리금균등상환</p>
        {moneyField("price", "주택 매매가")}
        <small className="krAmount">{korean(s.price)}</small>
        <label className="check">
          <input
            type="checkbox"
            checked={s.appraisal !== null}
            onChange={(e) =>
              set({ appraisal: e.target.checked ? s.price : null })
            }
          />
          은행 담보평가액을 따로 입력
        </label>
        {s.appraisal !== null &&
          moneyField("appraisal", "은행 담보평가액 (시가)")}
        <label className="field">
          주택 소재 지역
          <select
            value={s.area}
            onChange={(e) => set({ area: e.target.value as Mortgage["area"] })}
          >
            {Object.entries(areas).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <small>
            매물 주소의 지정 여부를 확인해 선택하세요. 수도권은
            서울·인천·경기입니다.
          </small>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.first}
            onChange={(e) => set({ first: e.target.checked })}
          />
          생애최초 주택구입 우대 적용
        </label>
        <small>
          세대 구성원의 주택 보유 이력이 기준입니다. 예외 인정은 은행에
          확인하세요.
        </small>
        <div className="pair">
          {moneyField("income", "인정 연소득")}
          {moneyField("debt", "기존 대출 연간 원리금")}
        </div>
        <small>
          기존 대출은 은행의 DSR 심사에 반영되는 연간 원금과 이자의 합계입니다.
        </small>
        <div className="pair">
          <Field
            label="약정 연 금리"
            unit="%"
            value={s.rate}
            onChange={(rate) => set({ rate })}
            error={errors.rate}
          />
          <Field
            label="상환 기간"
            unit="년"
            value={s.years}
            onChange={(years) => set({ years })}
            error={errors.years}
          />
        </div>
        <div className="pair">
          <label className="field">
            금융권
            <select
              value={s.sector}
              onChange={(e) =>
                set({ sector: e.target.value as Mortgage["sector"] })
              }
            >
              <option value="bank">은행권 · DSR 40%</option>
              <option value="other">제2금융권 · DSR 50%</option>
            </select>
          </label>
          <label className="field">
            금리 유형
            <select
              value={s.floating ? "adjusted" : "fixed"}
              onChange={(e) => set({ floating: e.target.value === "adjusted" })}
            >
              <option value="fixed">전 기간 고정금리</option>
              <option value="adjusted">변동·혼합·주기형</option>
            </select>
          </label>
        </div>
        {s.floating && (
          <Field
            label="금융사 확인 스트레스 가산금리"
            unit="%p"
            value={s.stress ?? NaN}
            onChange={(stress) => set({ stress })}
            error={errors.stress}
          />
        )}
        <a className="homeJump" href="#home-limit">
          한도 결과 보기
        </a>
      </section>
      <div className="homeOutput">
        {r ? (
          <>
            <section className="summary homeSummary" id="home-limit">
              <div className="summaryTitle">
                <span>
                  <House size={17} />
                  예상 주택구입 대출한도
                </span>
                {comparing && <span className="pill">{active}안</span>}
              </div>
              <div className="heroValue">{korean(r.amount)}</div>
              <p>
                {r.limits
                  .filter((l) => l.amount === r.amount)
                  .map((l) => l.label)
                  .join(" · ")}
                에서 한도가 결정됩니다.
              </p>
              <dl className="summaryStats">
                <div>
                  <dt>필요 자기자금</dt>
                  <dd>{korean(r.cash)}</dd>
                </div>
                <div>
                  <dt>약정금리 월 납입액</dt>
                  <dd>{won(r.monthly)}</dd>
                </div>
              </dl>
            </section>
            <section className="panel limitDetails">
              <Heading icon={Scale}>무엇이 한도를 결정하나요?</Heading>
              <dl>
                {r.limits.map((l) => (
                  <div key={l.label}>
                    <dt>
                      {l.label}
                      {l.amount === r.amount && <small>한도 결정</small>}
                    </dt>
                    <dd>{korean(l.amount)}</dd>
                  </div>
                ))}
              </dl>
              <p>
                담보평가액 {korean(s.appraisal ?? s.price)}에 LTV{" "}
                <b>{r.ltv}%</b>를 적용했습니다.{" "}
                {s.sector === "bank" ? "은행권" : "제2금융권"} DSR {r.dsr}%를
                가정하면 기존 대출을 제외하고 월 <b>{won(r.monthlyBudget)}</b>
                까지 상환할 수 있습니다.
              </p>
              <p>
                심사금리 연 {r.assessedRate}% · 예상 DSR {r.usedDsr.toFixed(1)}%
                · 실제 납입 계산은 연 {s.rate}%
              </p>
              <button
                className="homeAction"
                disabled={!canApply}
                onClick={() => {
                  if (ar && canApply) apply(ar.loan, br?.loan);
                }}
              >
                {comparing ? "두 한도로 A/B 상환 비교" : "이 한도로 상환 계산"}
              </button>
              {!canApply && (
                <small>
                  상환 계산으로 이동하려면 각 안의 예상 한도가 0원보다 커야
                  합니다.
                </small>
              )}
            </section>
          </>
        ) : (
          <section className="panel emptyResult" id="home-limit">
            <Scale />
            <h2>입력 조건을 확인해 주세요.</h2>
            <p>{Object.values(errors)[0]}</p>
          </section>
        )}
        <details className="panel homeSources">
          <summary>계산 범위와 공식 근거</summary>
          <p>
            2026년 11월 23일 자료 확인. 입력한 지역 구분을 기준으로 일반 무주택
            세대와 생애최초 우대 시나리오를 비교합니다. 소재지와 자격은 직접
            확인해야 합니다.
          </p>
          <p>
            매매가를 담보 시가로 가정하며 은행 평가액을 별도로 입력할 수
            있습니다. 자기자금은 매매가에서 대출한도를 뺀 금액으로
            취득세·중개보수는 별도입니다.
          </p>
          <p>
            DSR은 면제 여부와 관계없이 선택한 금융권의 기준 비율을 적용한
            자금계획용 추정입니다. 변동·혼합·주기형은 금융사에서 확인한 최종
            가산폭으로 심사하며, 약정금리로 월 납입액을 계산합니다.
          </p>
          <p>
            DTI, 방공제·선순위채권, 정책대출, 서민·실수요자 별도 우대,
            유주택자·경과규정과 은행별 심사에 따라 실제 한도가 달라질 수
            있습니다.
          </p>
          <div className="sourceLinks">
            <a
              href="https://www.fsc.go.kr/no010101/78134"
              target="_blank"
              rel="noreferrer"
            >
              금융위 · 생애최초 우대 상한
            </a>
            <a
              href="https://www.fsc.go.kr/po020201/85466"
              target="_blank"
              rel="noreferrer"
            >
              금융위 · 지역별 LTV·DSR 및 가격 상한
            </a>
            <a
              href="https://www.fsc.go.kr/no010101/84824"
              target="_blank"
              rel="noreferrer"
            >
              금융위 · 생애최초·만기 기준
            </a>
            <a
              href="https://www.fsc.go.kr/no010101/87222"
              target="_blank"
              rel="noreferrer"
            >
              금융위 · 규제지역 지정 안내
            </a>
          </div>
        </details>
      </div>
      {comparing && (
        <section
          id="home-compare"
          className="panel compare homeCompare"
          tabIndex={-1}
        >
          <Heading icon={Layers}>주택 매매 조건 비교</Heading>
          {ar && br ? (
            <CompareTable
              rows={[
                numeric("매매가", homes.A.price, homes.B.price),
                numeric(
                  "담보평가액",
                  homes.A.appraisal ?? homes.A.price,
                  homes.B.appraisal ?? homes.B.price,
                ),
                category("소재 지역", areas[homes.A.area], areas[homes.B.area]),
                category(
                  "생애최초 우대",
                  homes.A.first ? "적용" : "미적용",
                  homes.B.first ? "적용" : "미적용",
                ),
                numeric("DSR 기준 비율", ar.dsr, br.dsr, "%", "%p"),
                numeric("적용 LTV", ar.ltv, br.ltv, "%", "%p"),
                numeric("인정 연소득", homes.A.income, homes.B.income),
                numeric("기존 연간 원리금", homes.A.debt, homes.B.debt),
                numeric(
                  "심사금리",
                  ar.assessedRate,
                  br.assessedRate,
                  "%",
                  "%p",
                ),
                numeric(
                  "예상 DSR",
                  Number(ar.usedDsr.toFixed(1)),
                  Number(br.usedDsr.toFixed(1)),
                  "%",
                  "%p",
                ),
                numeric("LTV 기준 한도", ar.ltvMax, br.ltvMax),
                numeric("DSR 기준 한도", ar.dsrMax, br.dsrMax),
                ar.propertyCap !== null && br.propertyCap !== null
                  ? numeric("금액 상한", ar.propertyCap, br.propertyCap)
                  : category(
                      "금액 상한",
                      ar.propertyCap === null
                        ? "별도 상한 없음"
                        : won(ar.propertyCap),
                      br.propertyCap === null
                        ? "별도 상한 없음"
                        : won(br.propertyCap),
                    ),
                numeric("최종 예상 한도", ar.amount, br.amount),
                numeric("필요 자기자금", ar.cash, br.cash),
                numeric("월 납입액", ar.monthly, br.monthly),
              ]}
            />
          ) : (
            <p>A안과 B안의 입력 조건을 확인해 주세요.</p>
          )}
        </section>
      )}
    </div>
  );
}
