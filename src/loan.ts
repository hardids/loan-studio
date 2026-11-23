export type Method = "annuity" | "principal" | "bullet";
export const methods: Record<Method, string> = {
  annuity: "원리금균등",
  principal: "원금균등",
  bullet: "만기일시",
};
export const LIMIT = 1_000_000_000_000;
export const MAX_MONTHS = 600;
export type Extra = {
  month: number;
  amount: number;
  full: boolean;
  feeMode: "rate" | "fixed";
  fee: number;
  shorten: boolean;
};
export type Change = { month: number; rate: number };
export type Loan = {
  amount: number;
  rate: number;
  months: number;
  grace: number;
  method: Method;
  extra?: Extra;
  change?: Change;
};
export const initial: Loan = {
  amount: 30_000_000,
  rate: 5,
  months: 12,
  grace: 0,
  method: "annuity",
};
export type Row = {
  month: number;
  regular: number;
  principal: number;
  interest: number;
  extra: number;
  fee: number;
  total: number;
  balance: number;
  rate: number;
};
export const fmt = (n: number) => n.toLocaleString("ko-KR");
export const won = (n: number) => fmt(n) + "원";
export function korean(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (!n) return "0원";
  const parts = [
    Math.floor(n / 1e12),
    Math.floor(n / 1e8) % 10000,
    Math.floor(n / 1e4) % 10000,
    n % 10000,
  ];
  return (
    parts
      .map((x, i) => (x ? fmt(x) + ["조", "억", "만", ""][i] : ""))
      .filter(Boolean)
      .join(" ") + " 원"
  );
}
const valid = (n: number, min: number, max: number, integer = false) =>
  Number.isFinite(n) &&
  n >= min &&
  n <= max &&
  (!integer || Number.isInteger(n));
export type Errors = Partial<
  Record<
    | "amount"
    | "rate"
    | "months"
    | "grace"
    | "extraMonth"
    | "extraAmount"
    | "fee"
    | "changeMonth"
    | "newRate",
    string
  >
>;
export function validate(s: Loan): Errors {
  const e: Errors = {};
  if (!valid(s.amount, 1, LIMIT, true))
    e.amount =
      s.amount > LIMIT
        ? "1조 원 이하로 입력해 주세요."
        : "대출금을 입력해 주세요.";
  if (!valid(s.rate, 0, 100)) e.rate = "0~100% 사이의 연 금리를 입력해 주세요.";
  if (!valid(s.months, 1, MAX_MONTHS, true))
    e.months = "전체 기간은 1~600개월의 정수로 입력해 주세요.";
  if (s.method !== "bullet" && !valid(s.grace, 0, s.months - 1, true))
    e.grace = "거치기간은 전체 기간보다 짧은 0 이상의 정수여야 합니다.";
  if (s.change) {
    if (!valid(s.change.month, 1, s.months, true))
      e.changeMonth = "전체 기간 안의 회차를 입력해 주세요.";
    if (!valid(s.change.rate, 0, 100))
      e.newRate = "0~100% 사이의 연 금리를 입력해 주세요.";
  }
  if (s.extra) {
    if (!valid(s.extra.month, 1, s.months, true))
      e.extraMonth = "전체 기간 안의 회차를 입력해 주세요.";
    if (!s.extra.full && !valid(s.extra.amount, 1, LIMIT, true))
      e.extraAmount = "추가 상환할 원금을 입력해 주세요.";
    if (
      !valid(
        s.extra.fee,
        0,
        s.extra.feeMode === "rate" ? 100 : LIMIT,
        s.extra.feeMode === "fixed",
      )
    )
      e.fee = "유효한 수수료를 입력해 주세요.";
  }
  return e;
}
const interestOf = (balance: number, rate: number) =>
  Math.round((balance * rate) / 1200);
// A fixed whole-won payment is feasible if it retires the balance by maturity.
function affordable(
  balance: number,
  rate: number,
  months: number,
  payment: number,
) {
  for (let i = 0; i < months && balance > 0; i++) {
    const principal = payment - interestOf(balance, rate);
    if (principal <= 0) return false;
    balance -= principal;
  }
  return balance <= 0;
}
export function budgetPrincipal(payment: number, rate: number, months: number) {
  if (
    !valid(payment, 1, LIMIT, true) ||
    !valid(rate, 0, 100) ||
    !valid(months, 1, MAX_MONTHS, true)
  )
    return 0;
  let lo = 0,
    hi = Math.min(LIMIT, payment * months);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (affordable(mid, rate, months, payment)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
function installment(balance: number, rate: number, months: number) {
  let lo = Math.ceil(balance / months),
    hi = balance + interestOf(balance, rate);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (affordable(balance, rate, months, mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
export function schedule(s: Loan) {
  const rows: Row[] = [];
  let balance = s.amount,
    rate = s.rate,
    due = 0,
    end = s.months,
    reprice = true;
  const grace = s.method === "bullet" ? 0 : s.grace;
  for (let month = 1; month <= end && balance > 0; month++) {
    if (s.change?.month === month) {
      rate = s.change.rate;
      reprice = true;
    }
    const left = end - month + 1;
    const interest = interestOf(balance, rate);
    if (month > grace && reprice) {
      if (s.method === "annuity") due = installment(balance, rate, left);
      if (s.method === "principal") due = Math.floor(balance / left);
      reprice = false;
    }
    let principal = 0;
    if (month === end) principal = balance;
    else if (month > grace && s.method !== "bullet")
      principal = Math.min(
        balance,
        s.method === "annuity" ? Math.max(0, due - interest) : due,
      );
    const regular = principal + interest;
    balance -= principal;
    let extra = 0,
      fee = 0;
    if (s.extra?.month === month && balance > 0) {
      const x = s.extra;
      extra = x.full ? balance : Math.min(balance, x.amount);
      fee = x.feeMode === "rate" ? Math.round((extra * x.fee) / 100) : x.fee;
      balance -= extra;
      if (balance && x.shorten && s.method === "annuity" && month > grace) {
        let projected = balance,
          count = 0;
        while (projected > 0 && count < end - month) {
          projected -= due - interestOf(projected, rate);
          count++;
        }
        end = month + count;
      } else reprice = true;
    }
    rows.push({
      month,
      regular,
      principal,
      interest,
      extra,
      fee,
      total: regular + extra + fee,
      balance,
      rate,
    });
  }
  return rows;
}
export function evaluate(s: Loan) {
  const errors = validate(s);
  if (Object.keys(errors).length) return { errors, rows: [] as Row[] };
  const rows = schedule(s);
  if (s.extra) {
    const row = rows[s.extra.month - 1];
    if (row) {
      const available = row.balance + row.extra;
      if (!available || (!s.extra.full && s.extra.amount > available)) {
        errors.extraAmount =
          "이 회차의 정기 납입 후 상환 가능액은 " + won(available) + "입니다.";
        return { errors, rows: [] as Row[] };
      }
    }
  }
  return { errors, rows };
}
export function totals(rows: Row[]) {
  return rows.reduce(
    (sum, r) => ({
      interest: sum.interest + r.interest,
      fee: sum.fee + r.fee,
      total: sum.total + r.total,
      peak: r.total > sum.peak.total ? r : sum.peak,
    }),
    { interest: 0, fee: 0, total: 0, peak: rows[0] },
  );
}
