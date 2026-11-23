import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("precise amount, slider range and independent comparison", async ({
  page,
}) => {
  const amount = page.getByLabel("대출금", { exact: true });
  const slider = page.getByRole("slider");
  await expect(slider).toHaveAttribute("max", "3000000000");
  await expect(amount).toHaveValue("30,000,000");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(amount).toHaveValue("31,000,000");
  await expect(page.locator(".krAmount")).toHaveText("3,100만 원");
  await amount.fill("123450000");
  await amount.press("Tab");
  await page.getByLabel("슬라이더 범위").selectOption("1000000000");
  await expect(amount).toHaveValue("123,450,000");
  await amount.fill("80000000");
  await page.getByLabel("슬라이더 범위").selectOption("100000000");
  await page.getByRole("button", { name: "+1억", exact: true }).click();
  await expect(amount).toHaveValue("180,000,000");
  await expect(page.getByLabel("슬라이더 범위")).toHaveValue("500000000");
  await page.getByRole("button", { name: "비교안 추가" }).click();
  await expect(page.locator(".compare p")).toContainText("같습니다");
  await page.getByRole("slider").press("ArrowRight");
  await expect(amount).toHaveValue("185,000,000");
  await page.getByRole("button", { name: "A안 수정" }).click();
  await expect(amount).toHaveValue("180,000,000");
  await amount.fill("");
  await expect(page.locator(".emptyResult")).toContainText(
    "대출금을 입력해 주세요",
  );
});
test("long schedule, combined events and budget transfer", async ({ page }) => {
  await page.getByLabel("전체 대출기간", { exact: true }).fill("360");
  for (let n = 0; n < 5; n++) await page.getByRole("slider").press("ArrowLeft");
  await expect(page.getByLabel("대출금", { exact: true })).toHaveValue(
    "25,000,000",
  );
  await page.getByText("추가 조건", { exact: false }).first().click();
  await page.getByLabel("중도상환 적용").check();
  await page.getByLabel("금리 변경 적용").check();
  await page.getByLabel("중도상환 회차").fill("2");
  await page.getByLabel("남은 원금 전액").check();
  await expect(page.locator(".schedule .meta")).toHaveText("총 2회");
  await expect(page.locator(".effect")).toHaveCount(2);
  await page.getByLabel("그래프 연도 선택").selectOption("1");
  await expect(
    page.locator(".schedule tbody tr").last().locator("td").last(),
  ).toHaveText("0");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "월 예산 역산" }).click();
  await page.getByLabel("연 금리").fill("0");
  await page.getByRole("button", { name: "이 금액으로 상세 계산" }).click();
  await expect(page.getByLabel("대출금", { exact: true })).toHaveValue(
    "12,000,000",
  );
  await expect(page.locator(".heroValue")).toHaveText("1,000,000원");
  await expect(page.locator(".effect")).toHaveCount(0);
});

test("30억 양 끝과 모바일 결과 읽기 순서", async ({ page }, testInfo) => {
  const slider = page.getByRole("slider");
  const amount = page.getByLabel("대출금", { exact: true });
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".heroValue")).toBeInViewport();
    const summary = await page.locator(".summary").boundingBox(),
      controls = await page.locator(".controls").boundingBox();
    expect(summary!.y + summary!.height).toBeLessThanOrEqual(controls!.y);
  }
  await slider.press("End");
  await expect(amount).toHaveValue("3,000,000,000");
  await slider.press("Home");
  await expect(page.locator(".emptyResult")).toBeVisible();
  await slider.press("ArrowRight");
  await expect(amount).toHaveValue("1,000,000");
  await amount.fill("3001234567");
  await expect(slider).toHaveAttribute("max", "4000000000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
