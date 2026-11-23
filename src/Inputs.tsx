import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, Plus, Minus } from "lucide-react";
import {
  fmt,
  korean,
  methods,
  LIMIT,
  type Loan,
  type Errors,
  type Method,
  type Extra,
} from "./loan";
export function Field({
  label,
  value,
  onChange,
  unit,
  error,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="numfield">
        <input
          type="number"
          step="any"
          aria-invalid={!!error}
          disabled={disabled}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        {unit && <i>{unit}</i>}
      </span>
      {error && <small className="error">{error}</small>}
    </label>
  );
}
export const DEFAULT_RANGE = 3e9;
const caps = [1e8, 5e8, 1e9, DEFAULT_RANGE];
type RangeChoice = { chosen: number; setChosen: (upper: number) => void };
function limitFor(n: number) {
  return (
    caps.find((cap) => cap >= n) ?? Math.ceil(Math.min(n, LIMIT) / 1e9) * 1e9
  );
}
function Amount({
  value,
  change,
  error,
  chosen,
  setChosen,
}: RangeChoice & {
  value: number;
  change: (n: number) => void;
  error?: string;
}) {
  const [empty, setEmpty] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const limit = Math.max(chosen, limitFor(Number.isFinite(value) ? value : 0));
  const step = limit === DEFAULT_RANGE ? 1e6 : limit / 100;
  const percent = Math.min(100, ((value || 0) / limit) * 100);
  useLayoutEffect(() => {
    if (caret.current !== null && input.current) {
      const text = input.current.value;
      let pos = 0,
        count = 0;
      while (pos < text.length && count < caret.current)
        if (/\d/.test(text[pos++])) count++;
      input.current.setSelectionRange(pos, pos);
      caret.current = null;
    }
  });
  function update(n: number) {
    setEmpty(false);
    setRaw(null);
    change(n);
    if (n > chosen) setChosen(limitFor(n));
  }
  return (
    <div className="amount">
      <div className="fieldtop">
        <label htmlFor="amount">대출금</label>
        <label className="selectShell">
          조절 범위{" "}
          <select
            aria-label="슬라이더 범위"
            value={limit}
            onChange={(e) => setChosen(+e.target.value)}
          >
            {[...new Set([...caps, limit])].map((c) => (
              <option key={c} value={c} disabled={c < value}>
                {fmt(c / 1e8)}억
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </label>
      </div>
      <div className="amountInput">
        <input
          id="amount"
          ref={input}
          inputMode="numeric"
          aria-invalid={!!error}
          value={raw ?? (empty && !value ? "" : fmt(value))}
          onChange={(e) => {
            const stripped = e.target.value.replace(/[,\s원]/g, "");
            if (!/^\d*$/.test(stripped)) return;
            const digits = e.target.value
              .slice(0, e.target.selectionStart ?? 0)
              .replace(/\D/g, "").length;
            caret.current = digits;
            const n = Number(stripped);
            setRaw(stripped && n > 1e12 ? stripped : null);
            setEmpty(!stripped);
            change(n);
            if (n > chosen && n <= 1e12) setChosen(limitFor(n));
          }}
        />
        <span>원</span>
      </div>
      <div className={error ? "error" : "krAmount"}>
        {error || korean(value)}
      </div>
      <div className="rangeWrap">
        <output
          style={{
            left: "clamp(3.4rem, " + percent + "%, calc(100% - 3.4rem))",
          }}
        >
          {korean(value || 0)}
        </output>
        <input
          className="range"
          aria-label="대출금 슬라이더"
          aria-valuetext={korean(value || 0)}
          type="range"
          min="0"
          max={limit}
          step="any"
          value={Math.min(value || 0, limit)}
          style={{
            background:
              "linear-gradient(to right, var(--green) " +
              percent +
              "%, #dfe9e3 " +
              percent +
              "%) center / 100% 6px no-repeat",
          }}
          onChange={(e) => update(Math.round(+e.target.value / step) * step)}
          onKeyDown={(e) => {
            const v = value || 0;
            if (
              [
                "ArrowLeft",
                "ArrowDown",
                "ArrowRight",
                "ArrowUp",
                "Home",
                "End",
              ].includes(e.key)
            ) {
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? limit
                    : ["ArrowRight", "ArrowUp"].includes(e.key)
                      ? (Math.floor(v / step) + 1) * step
                      : (Math.ceil(v / step) - 1) * step;
              update(Math.min(limit, Math.max(0, next)));
            }
          }}
        />
        <div className="ticks rangeTicks">
          {(limit === DEFAULT_RANGE ? [0, 1 / 3, 2 / 3, 1] : [0, 0.5, 1]).map(
            (fraction) => (
              <span key={fraction}>{korean(Math.round(limit * fraction))}</span>
            ),
          )}
        </div>
      </div>
      <div className="quick">
        {[
          [-1e7, "1,000만"],
          [1e6, "100만"],
          [1e7, "1,000만"],
          [1e8, "1억"],
        ].map(([v, t]) => (
          <button
            key={v}
            aria-label={(Number(v) < 0 ? "−" : "+") + t}
            onClick={() => update(Math.max(0, (value || 0) + Number(v)))}
          >
            {Number(v) < 0 ? <Minus size={12} /> : <Plus size={12} />} {t}
          </button>
        ))}
      </div>
    </div>
  );
}
const descriptions: Record<Method, string> = {
  annuity: "원금과 이자를 합쳐 매달 비슷한 금액을 냅니다.",
  principal: "매달 같은 원금을 갚아 납입액이 점차 줄어듭니다.",
  bullet: "매달 이자를 내고 마지막 달에 원금을 갚습니다.",
};
export function Inputs({
  s,
  update,
  errors,
  chosen,
  setChosen,
}: RangeChoice & {
  s: Loan;
  update: (s: Loan) => void;
  errors: Errors;
}) {
  const [years, setYears] = useState(false);
  const set = (patch: Partial<Loan>) => update({ ...s, ...patch });
  const x = s.extra,
    c = s.change;
  const setX = (patch: Partial<Extra>) => {
    if (x) set({ extra: { ...x, ...patch } });
  };
  return (
    <>
      <Amount
        chosen={chosen}
        setChosen={setChosen}
        value={s.amount}
        change={(amount) => set({ amount })}
        error={errors.amount}
      />
      <div className="pair basefields">
        <Field
          label="연 금리"
          value={s.rate}
          onChange={(rate) => set({ rate })}
          unit="%"
          error={errors.rate}
        />
        <div>
          <Field
            label="전체 대출기간"
            value={years ? s.months / 12 : s.months}
            onChange={(v) =>
              set({ months: years ? Math.round(v * 12 * 1e8) / 1e8 : v })
            }
            error={errors.months}
          />
          <select
            className="overUnit"
            aria-label="기간 단위"
            value={years ? "년" : "개월"}
            onChange={(e) => setYears(e.target.value === "년")}
          >
            <option>개월</option>
            <option>년</option>
          </select>
        </div>
      </div>
      <div className="field">
        <span>상환방식</span>
        <div className="segments">
          {Object.entries(methods).map(([v, label]) => (
            <button
              key={v}
              aria-pressed={s.method === v}
              onClick={() => set({ method: v as Method })}
            >
              {label}
            </button>
          ))}
        </div>
        <small>{descriptions[s.method]}</small>
      </div>
      <details
        className="advanced"
        open={
          Object.keys(errors).some(
            (k) => !["amount", "months", "rate"].includes(k),
          ) || undefined
        }
      >
        <summary>
          <SlidersHorizontal size={16} />
          추가 조건 <span>거치 · 중도상환 · 금리 변경</span>
          <ChevronDown size={15} />
        </summary>
        <div className="advancedBody">
          <Field
            label="거치기간 (전체 기간에 포함)"
            disabled={s.method === "bullet"}
            value={s.method === "bullet" ? 0 : s.grace}
            onChange={(grace) => set({ grace })}
            unit="개월"
            error={errors.grace}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={!!x}
              onChange={(e) =>
                set({
                  extra: e.target.checked
                    ? {
                        month: 1,
                        amount: 1000000,
                        full: false,
                        feeMode: "rate",
                        fee: 0,
                        shorten: false,
                      }
                    : undefined,
                })
              }
            />
            중도상환 적용
          </label>
          {x && (
            <>
              <div className="pair">
                <Field
                  label="중도상환 회차"
                  value={x.month}
                  unit="회"
                  onChange={(month) => setX({ month })}
                  error={errors.extraMonth}
                />
                <Field
                  label="추가 상환원금"
                  value={x.amount}
                  disabled={x.full}
                  unit="원"
                  onChange={(amount) => setX({ amount })}
                  error={errors.extraAmount}
                />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={x.full}
                  onChange={(e) => setX({ full: e.target.checked })}
                />
                남은 원금 전액
              </label>
              <div className="pair">
                <label className="field">
                  수수료 방식
                  <select
                    value={x.feeMode}
                    onChange={(e) =>
                      setX({
                        feeMode: e.target.value as Extra["feeMode"],
                        fee: 0,
                      })
                    }
                  >
                    <option value="rate">수수료율</option>
                    <option value="fixed">금액 직접 입력</option>
                  </select>
                </label>
                <Field
                  label="중도상환수수료"
                  value={x.fee}
                  unit={x.feeMode === "rate" ? "%" : "원"}
                  onChange={(fee) => setX({ fee })}
                  error={errors.fee}
                />
              </div>
              {!x.full && (
                <label className="field">
                  상환 후 일정
                  <select
                    value={
                      s.method === "annuity" && x.month > s.grace && x.shorten
                        ? "short"
                        : "keep"
                    }
                    onChange={(e) =>
                      setX({ shorten: e.target.value === "short" })
                    }
                  >
                    <option value="keep">만기 유지 · 납입액 조정</option>
                    {s.method === "annuity" && x.month > s.grace && (
                      <option value="short">
                        월 납입액 유지 · 기간 줄이기
                      </option>
                    )}
                  </select>
                  {(s.method !== "annuity" || x.month <= s.grace) && (
                    <small>
                      이 조건은 기존 만기를 기준으로 남은 납입액을 조정합니다.
                    </small>
                  )}
                </label>
              )}
            </>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={!!c}
              onChange={(e) =>
                set({
                  change: e.target.checked
                    ? { month: Math.min(2, s.months) || 1, rate: s.rate + 1 }
                    : undefined,
                })
              }
            />
            금리 변경 적용
          </label>
          {c && (
            <>
              <div className="pair">
                <Field
                  label="변경 시작 회차"
                  value={c.month}
                  unit="회"
                  onChange={(month) => set({ change: { ...c, month } })}
                  error={errors.changeMonth}
                />
                <Field
                  label="변경 후 연 금리"
                  value={c.rate}
                  unit="%"
                  onChange={(rate) => set({ change: { ...c, rate } })}
                  error={errors.newRate}
                />
              </div>
              <div className="quick">
                {[0.5, 1, 2].map((d) => (
                  <button
                    key={d}
                    onClick={() => set({ change: { ...c, rate: s.rate + d } })}
                  >
                    +{d}%p
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </details>
    </>
  );
}
