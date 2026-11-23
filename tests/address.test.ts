import test from "node:test";
import assert from "node:assert/strict";
import { resolveArea } from "../src/address.ts";
import { homeExample, mortgage } from "../src/mortgage.ts";
test("MOLIT designation boundaries, including July 2026 additions", () => {
  const region = (sido: string, sigungu: string) =>
    resolveArea({ sido, sigungu, address: sido + " " + sigungu });
  for (const d of [
    "구리시",
    "과천시",
    "광명시",
    "의왕시",
    "하남시",
    "성남시 수정구",
    "성남시 중원구",
    "성남시 분당구",
    "수원시 영통구",
    "수원시 장안구",
    "수원시 팔달구",
    "안양시 동안구",
    "용인시 수지구",
    "용인시 기흥구",
    "화성시 동탄구",
  ])
    assert.equal(region("경기", d), "hot", d);
  for (const d of [
    "수원시 권선구",
    "안양시 만안구",
    "용인시 처인구",
    "화성시 병점구",
    "화성시 효행구",
    "화성시 만세구",
    "남양주시",
    "고양시 덕양구",
  ])
    assert.equal(region("경기도", d), "metro", d);
  assert.equal(region("서울특별시", "도봉구"), "hot");
  assert.equal(region("인천", "남동구"), "metro");
  assert.equal(region("부산", "해운대구"), "local");
  assert.equal(region("경기", "화성시"), null);
  assert.equal(region("경기", "수원시 미확인구"), null);
  assert.equal(region("미상", "기흥구"), null);
});
test("default area, unresolved address and first purchase price ceiling", () => {
  assert.equal(homeExample.area, "hot");
  assert.equal(
    mortgage({
      ...homeExample,
      address: { label: "불완전한 주소", district: "경기", resolved: false },
    }).result,
    null,
  );
  const r = mortgage({
    ...homeExample,
    first: true,
    price: 20e8,
    income: 3e8,
  }).result!;
  assert.equal(r.ltv, 70);
  assert.equal(r.amount, 4e8);
});
