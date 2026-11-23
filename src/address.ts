import type { Mortgage } from "./mortgage";
export const zoneSource =
  "https://rt.molit.go.kr/pt/gis/gis.do?mobileAt=&srhThingSecd=E";
export const zoneChecked = "2026.11.23";
export type PostcodeAddress = {
  address: string;
  sido: string;
  sigungu: string;
  buildingName?: string;
};
export type HousingAddress = {
  label: string;
  district: string;
  resolved: boolean;
};
// MOLIT designation list, including the 2026-07-01 additions. Match administrative names only.
const hotCities = new Set(["과천시", "광명시", "구리시", "의왕시", "하남시"]);
const splitCities: Record<string, readonly string[]> = {
  성남시: ["분당구", "수정구", "중원구"],
  수원시: ["영통구", "장안구", "팔달구"],
  안양시: ["동안구"],
  용인시: ["기흥구", "수지구"],
  화성시: ["동탄구"],
};
const adjacentWards = new Set([
  "수원시 권선구",
  "안양시 만안구",
  "용인시 처인구",
  "화성시 만세구",
  "화성시 효행구",
  "화성시 병점구",
]);
const otherGyeonggi = new Set(
  "고양시 부천시 남양주시 안산시 평택시 시흥시 파주시 김포시 의정부시 광주시 양주시 군포시 오산시 이천시 안성시 포천시 양평군 여주시 동두천시 가평군 연천군".split(
    " ",
  ),
);
const provincialNames = new Set(
  "부산 부산광역시 대구 대구광역시 대전 대전광역시 광주 광주광역시 울산 울산광역시 세종 세종특별자치시 강원 강원도 강원특별자치도 충북 충청북도 충남 충청남도 전북 전라북도 전북특별자치도 전남 전라남도 경북 경상북도 경남 경상남도 제주 제주도 제주특별자치도 전남광주통합특별시 전남광주".split(
    " ",
  ),
);
export function resolveArea(data: PostcodeAddress): Mortgage["area"] | null {
  const province = data.sido?.trim(),
    district = data.sigungu
      ?.trim()
      .replace(/특례시/g, "시")
      .replace(/\s+/g, " ");
  if (!data.address?.trim() || !province) return null;
  if (province === "서울" || province === "서울특별시") return "hot";
  if (province === "인천" || province === "인천광역시") return "metro";
  if (province !== "경기" && province !== "경기도")
    return provincialNames.has(province) ? "local" : null;
  if (!district) return null;
  const [city, ward] = district.split(" ");
  if (hotCities.has(city)) return "hot";
  if (splitCities[city]) {
    if (splitCities[city].includes(ward)) return "hot";
    return adjacentWards.has(district) ? "metro" : null;
  }
  return otherGyeonggi.has(city) ? "metro" : null;
}
