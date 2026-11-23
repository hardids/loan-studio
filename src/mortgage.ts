import { budgetPrincipal, initial, LIMIT, schedule } from "./loan.ts";
export const areas = {
  metro: "수도권 비규제지역",
  hot: "투기과열지구",
  regulated: "기타 규제지역",
  local: "지방 비규제지역",
} as const;
export type Mortgage = {
  sector: "bank" | "other";
  price: number;
  appraisal: number | null;
  area: keyof typeof areas;
  first: boolean;
  income: number;
  debt: number;
  rate: number;
  years: number;
  stress: number | null;
  floating: boolean;
};
export const homeExample: Mortgage = {
  sector: "bank",
  price: 800000000,
  appraisal: null,
  area: "metro",
  first: false,
  income: 70000000,
  debt: 0,
  rate: 4,
  years: 30,
  stress: null,
  floating: false,
};
export function mortgage(s: Mortgage) {
  const local = s.area === "local";
  const collateral = s.appraisal ?? s.price;
  const range = (n: number, min: number, max: number) =>
    Number.isFinite(n) && n >= min && n <= max;
  const errors: Partial<Record<keyof Mortgage, string>> = {};
  if (!range(s.price, 1, LIMIT) || !Number.isInteger(s.price))
    errors.price = "1원~1조 원의 매매가를 입력해 주세요.";
  if (
    s.appraisal !== null &&
    (!range(collateral, 1, LIMIT) || !Number.isInteger(collateral))
  )
    errors.appraisal = "유효한 담보평가액을 입력해 주세요.";
  if (!range(s.income, 1, LIMIT))
    errors.income = "인정 연소득을 입력해 주세요.";
  if (!range(s.debt, 0, LIMIT))
    errors.debt = "0 이상의 연간 상환액을 입력해 주세요.";
  if (!range(s.years, 1, local ? 50 : 30) || !Number.isInteger(s.years))
    errors.years = local
      ? "1~50년 중 입력해 주세요."
      : "수도권·규제지역은 1~30년으로 입력해 주세요.";
  if (!range(s.rate, 0, 100)) errors.rate = "0~100% 사이로 입력해 주세요.";
  const stress = s.floating ? s.stress : 0;
  if (stress === null || !range(stress, 0, 100 - s.rate))
    errors.stress = "은행에서 확인한 최종 가산폭을 입력해 주세요.";
  if (Object.keys(errors).length || stress === null)
    return { errors, result: null };
  const regulated = s.area === "hot" || s.area === "regulated";
  const ltv = s.first ? (local ? 80 : 70) : regulated ? 40 : 70;
  const propertyCap = local
    ? s.first
      ? 600000000
      : null
    : collateral <= 1500000000
      ? 600000000
      : collateral <= 2500000000
        ? 400000000
        : 200000000;
  const dsr = s.sector === "bank" ? 40 : 50;
  const monthlyBudget = Math.max(
    0,
    Math.floor(((s.income * dsr) / 100 - s.debt) / 12),
  );
  const assessedRate = s.rate + stress;
  const dsrMax = budgetPrincipal(monthlyBudget, assessedRate, s.years * 12);
  const ltvMax = Math.floor((collateral * ltv) / 100);
  const limits = [
    { label: "담보 기준 (LTV)", amount: ltvMax },
    { label: "소득 기준 (DSR)", amount: dsrMax },
  ];
  if (propertyCap !== null)
    limits.push({
      label: local ? "생애최초 우대 상한" : "주택 시가별 상한",
      amount: propertyCap,
    });
  if (s.price < ltvMax) limits.push({ label: "매매대금", amount: s.price });
  const amount = Math.min(...limits.map((l) => l.amount));
  const loan = { ...initial, amount, rate: s.rate, months: s.years * 12 };
  const monthly = schedule(loan)[0]?.regular ?? 0;
  const assessedMonthly =
    stress === 0
      ? monthly
      : (schedule({ ...loan, rate: assessedRate })[0]?.regular ?? 0);
  return {
    errors,
    result: {
      dsr,
      ltv,
      ltvMax,
      dsrMax,
      propertyCap,
      limits,
      amount,
      monthly,
      assessedRate,
      monthlyBudget,
      usedDsr: ((assessedMonthly * 12 + s.debt) / s.income) * 100,
      cash: s.price - amount,
      loan,
    },
  };
}
