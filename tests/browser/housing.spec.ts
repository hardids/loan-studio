import { test, expect } from "@playwright/test";
test("compare a first purchase with an ordinary purchase and carry both limits into repayment", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "주택 매매", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "검색 전 기본값" }),
  ).toContainText("투기과열지구");
  await page.getByLabel("인정 연소득").fill("70000");
  await expect(page.locator(".homeSummary .heroValue")).toHaveText(
    "3억 2,000만 원",
  );
  await page.getByRole("button", { name: "비교안 추가" }).click();
  await page.getByLabel("생애최초 주택구입 우대 적용").check();
  const row = page.locator("#home-compare tr").filter({
    has: page.getByRole("rowheader", { name: "최종 예상 한도", exact: true }),
  });
  await expect(row.locator("td").last()).toHaveText("+240,000,000원");
  await page.getByLabel("금리 유형").selectOption("adjusted");
  await expect(page.locator(".emptyResult")).toBeVisible();
  await page.getByLabel("금융사 확인 스트레스 가산금리").fill("3");
  await page.getByRole("button", { name: "두 한도로 A/B 상환 비교" }).click();
  await expect(page.locator("#amount")).toHaveValue("560,000,000");
  const diff = page.locator("#compare-results tr").filter({
    has: page.getByRole("rowheader", { name: "대출금", exact: true }),
  });
  await expect(diff.locator("td").last()).toHaveText("+240,000,000원");
  await page.getByRole("button", { name: "A안 수정" }).click();
  await expect(page.locator("#amount")).toHaveValue("320,000,000");
  await page.getByLabel("연 금리", { exact: false }).first().fill("4.5");
  const rateRow = page.locator("#compare-results tr").filter({
    has: page.getByRole("rowheader", { name: "연 금리", exact: true }),
  });
  await expect(rateRow.locator("td").last()).toHaveText("−0.5%p");
  await page.getByRole("button", { name: "주택 매매", exact: true }).click();
  await expect(
    page.getByLabel("생애최초 주택구입 우대 적용"),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
