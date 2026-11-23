import { test, expect } from "@playwright/test";
const sdk = "**/postcode/prod/postcode.v2.js";
test("select, compare, isolate unknown districts and recover by manual selection", async ({
  page,
}) => {
  await page.route(sdk, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.kakao={Postcode:class{constructor(o){this.o=o}embed(el){for(const district of ['수원시 영통구','수원시 권선구','화성시']){const btn=document.createElement('button');btn.textContent=district;btn.onclick=()=>this.o.oncomplete({sido:'경기',sigungu:district,address:'경기 '+district+' 예시로',buildingName:'테스트 아파트'});el.append(btn)}}}}`,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "주택 매매", exact: true }).click();
  const choose = async (district: string) => {
    await page
      .getByRole("button", { name: /^(아파트 주소 검색|주소 다시 검색)$/ })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: district, exact: true })
      .click();
  };
  await choose("수원시 영통구");
  await page.getByRole("button", { name: "비교안 추가" }).click();
  await choose("수원시 권선구");
  await expect(page.locator(".addressField [role=status]")).toContainText(
    "수도권 비규제지역",
  );
  await expect(page.locator(".limitDetails")).toContainText("70%");
  await page.getByRole("button", { name: "A안 수정" }).click();
  await expect(page.locator(".addressLabel")).toContainText("영통구");
  await expect(page.locator(".limitDetails")).toContainText("40%");
  await choose("화성시");
  await expect(page.locator(".homeSummary")).toHaveCount(0);
  await page.getByLabel("주택 소재 지역").selectOption("hot");
  await expect(page.locator(".addressField [role=status]")).toContainText(
    "직접 선택",
  );
  await expect(page.locator(".addressLabel")).toHaveCount(0);
});
test("when address provider is unavailable users can still select a zone", async ({
  page,
}) => {
  await page.route(sdk, (r) => r.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "주택 매매", exact: true }).click();
  await page.getByRole("button", { name: "아파트 주소 검색" }).click();
  await expect(page.getByRole("alert")).toContainText("불러오지 못했습니다");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "지역 직접 선택" }).click();
  await page.getByLabel("주택 소재 지역").selectOption("local");
  await expect(page.locator(".addressField [role=status]")).toContainText(
    "지방 비규제지역",
  );
});
