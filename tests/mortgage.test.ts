import test from "node:test";
import assert from "node:assert/strict";
import { homeExample, mortgage } from "../src/mortgage.ts";
const rich = { ...homeExample, income: 700000000 };
test("area and first purchase change LTV without changing the DSR threshold", () => {
  for (const [area, ordinary, first] of [
    ["hot", 40, 70],
    ["regulated", 40, 70],
    ["metro", 70, 70],
    ["local", 70, 80],
  ] as const) {
    assert.equal(mortgage({ ...rich, area }).result?.ltv, ordinary);
    assert.equal(mortgage({ ...rich, area, first: true }).result?.ltv, first);
  }
  const a = mortgage({ ...rich, area: "hot" }).result!,
    b = mortgage({ ...rich, area: "hot", first: true }).result!;
  assert.equal(b.amount - a.amount, 240000000);
  assert.equal(a.cash - b.cash, 240000000);
});
test("appraised market value drives price bands at both inclusive boundaries", () => {
  for (const [price, cap] of [
    [15e8, 6e8],
    [15e8 + 1, 4e8],
    [25e8, 4e8],
    [25e8 + 1, 2e8],
  ]) {
    assert.equal(mortgage({ ...rich, price }).result?.propertyCap, cap);
  }
  assert.equal(
    mortgage({ ...rich, price: 15e8, appraisal: 16e8 }).result?.amount,
    4e8,
  );
  assert.equal(mortgage({ ...rich, area: "local" }).result?.propertyCap, null);
  assert.equal(
    mortgage({ ...rich, area: "local", first: true }).result?.propertyCap,
    6e8,
  );
});
test("existing debt and underwriting stress reduce DSR capacity, actual loan uses contract rate", () => {
  const dsrLimited = { ...homeExample, area: "metro" as const };
  const fixed = mortgage(dsrLimited).result!;
  const variable = mortgage({
    ...dsrLimited,
    floating: true,
    stress: 3,
  }).result!;
  assert.equal(mortgage({ ...homeExample, sector: "other" }).result?.dsr, 50);
  assert.ok(variable.amount < fixed.amount);
  assert.equal(variable.assessedRate, 7);
  assert.equal(variable.loan.rate, 4);
  assert.ok(variable.usedDsr <= 40);
  assert.equal(
    mortgage({ ...homeExample, debt: homeExample.income * 0.4 }).result?.amount,
    0,
  );
  assert.equal(mortgage({ ...homeExample, floating: true }).result, null);
  assert.equal(mortgage({ ...homeExample, years: 31 }).result, null);
  assert.ok(mortgage({ ...homeExample, area: "local", years: 31 }).result);
  assert.equal(mortgage({ ...homeExample, income: NaN }).result, null);
  assert.equal(mortgage({ ...homeExample, appraisal: 0 }).result, null);
});
