import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  schedule,
  totals,
  budgetPrincipal,
  evaluate,
  validate,
  type Loan,
  type Extra,
} from "../src/loan.ts";

const extra: Extra = {
  month: 3,
  amount: 1000000,
  full: false,
  feeMode: "rate",
  fee: 1,
  shorten: false,
};
test("interest-free schedule", () => {
  const rows = schedule({ ...initial, amount: 12000000, rate: 0 });
  assert.equal(rows.length, 12);
  assert.ok(rows.every((r) => r.regular === 1000000 && r.interest === 0));
  assert.equal(rows.at(-1)?.balance, 0);
});
test("bullet loan settles the principal and last interest together", () => {
  const rows = schedule({
    ...initial,
    method: "bullet",
    amount: 12000000,
    rate: 12,
  });
  assert.ok(rows.slice(0, 11).every((r) => r.regular === 120000));
  assert.equal(rows[11].total, 12120000);
  assert.equal(totals(rows).interest, 1440000);
});
test("grace boundary and repricing in grace", () => {
  const rows = schedule({
    ...initial,
    months: 24,
    grace: 6,
    change: { month: 4, rate: 6 },
  });
  assert.ok(rows.slice(0, 6).every((r) => r.principal === 0));
  assert.equal(rows[2].interest, 125000);
  assert.equal(rows[3].interest, 150000);
  assert.ok(rows[6].principal > 0);
  assert.equal(rows.length, 24);
});
test("term reduction preserves installment; payment reduction preserves maturity", () => {
  const s = { ...initial, extra: { ...extra, amount: 6000000 } };
  const keep = schedule(s),
    short = schedule({ ...s, extra: { ...s.extra, shorten: true } });
  assert.equal(keep.length, 12);
  assert.ok(keep[3].regular < keep[2].regular);
  assert.equal(short[3].regular, short[2].regular);
  assert.ok(short.length < 12);
  assert.equal(short[2].fee, 60000);
});
test("full payment uses remaining principal after regular due and new rate", () => {
  const rows = schedule({
    ...initial,
    extra: { ...extra, full: true },
    change: { month: 3, rate: 12 },
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[2].interest, Math.round(rows[1].balance * 0.01));
  assert.equal(rows[2].extra, rows[1].balance - rows[2].principal);
  assert.equal(rows[2].balance, 0);
  assert.equal(
    schedule({
      ...initial,
      extra: { ...extra, full: true },
      change: { month: 4, rate: 90 },
    }).length,
    3,
  );
});
test("negative net savings and validation of excess or zero remaining balance", () => {
  const rows = schedule({
    ...initial,
    extra: { ...extra, feeMode: "fixed", fee: 2000000 },
  });
  assert.ok(
    totals(schedule(initial)).interest -
      totals(rows).interest -
      totals(rows).fee <
      0,
  );
  assert.ok(
    evaluate({ ...initial, extra: { ...extra, amount: initial.amount } }).errors
      .extraAmount,
  );
  assert.ok(
    evaluate({ ...initial, extra: { ...extra, month: 12, full: true } }).errors
      .extraAmount,
  );
  assert.ok(validate({ ...initial, months: 6, grace: 6 }).grace);
});
test("accounting invariants across methods, durations, events and rates", () => {
  for (const method of ["annuity", "principal", "bullet"] as const)
    for (const rate of [0, 3.95, 12])
      for (const months of [2, 24, 360])
        for (const shorten of [true, false]) {
          const s: Loan = {
            ...initial,
            method,
            rate,
            months,
            grace: 1,
            extra: { ...extra, month: 1, shorten },
            change: { month: 2, rate: 2.9 },
          };
          const { rows, errors } = evaluate(s);
          assert.deepEqual(errors, {});
          assert.equal(rows.at(-1)?.balance, 0);
          assert.equal(
            rows.reduce((v, r) => v + r.principal + r.extra, 0),
            s.amount,
          );
          assert.equal(
            totals(rows).total,
            s.amount + totals(rows).interest + totals(rows).fee,
          );
          for (const r of rows)
            assert.equal(r.total, r.principal + r.interest + r.extra + r.fee);
        }
});
test("budget inversion gives a feasible maximum including the final installment", () => {
  for (const months of [1, 12, 360])
    for (const rate of [0, 5, 15])
      for (const budget of [1, 100, 1000000]) {
        const amount = budgetPrincipal(budget, rate, months);
        const rows = schedule({ ...initial, amount, rate, months });
        assert.ok(rows.every((r) => r.regular <= budget));
        assert.ok(
          schedule({ ...initial, amount: amount + 1, rate, months }).some(
            (r) => r.regular > budget,
          ),
        );
      }
});
