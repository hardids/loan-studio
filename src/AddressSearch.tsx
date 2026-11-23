import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { areas, type Mortgage } from "./mortgage";
import {
  resolveArea,
  zoneChecked,
  zoneSource,
  type PostcodeAddress,
} from "./address";
type PostcodeConstructor = new (options: {
  oncomplete: (address: PostcodeAddress) => void;
  width: string;
  height: string;
}) => { embed: (element: HTMLElement) => void };
declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor };
    daum?: { Postcode?: PostcodeConstructor };
  }
}
let loading: Promise<PostcodeConstructor> | undefined;
function loadPostcode() {
  const api = () => window.kakao?.Postcode ?? window.daum?.Postcode;
  const existing = api();
  if (existing) return Promise.resolve(existing);
  if (!loading)
    loading = new Promise<PostcodeConstructor>((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => {
        window.clearTimeout(timer);
        script.remove();
        loading = undefined;
        reject(new Error("address lookup unavailable"));
      };
      const timer = window.setTimeout(fail, 15000);
      script.src =
        "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = () => {
        const ctor = api();
        if (!ctor) {
          fail();
          return;
        }
        window.clearTimeout(timer);
        resolve(ctor);
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  return loading;
}
function LookupDialog({
  close,
  select,
}: {
  close: () => void;
  select: (data: PostcodeAddress) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const onSelect = useRef(select);
  onSelect.current = select;
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    const target = host.current!;
    let alive = true;
    loadPostcode()
      .then((Ctor) => {
        if (alive)
          new Ctor({
            width: "100%",
            height: "100%",
            oncomplete: (data) => {
              if (alive) onSelect.current(data);
            },
          }).embed(target);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      target.replaceChildren();
    };
  }, [attempt]);
  return (
    <dialog
      ref={dialog}
      className="lookupDialog"
      aria-labelledby="lookup-title"
      onCancel={close}
    >
      <div className="lookupHead">
        <h2 id="lookup-title">아파트 주소 검색</h2>
        <button type="button" onClick={close} aria-label="주소 검색 닫기">
          <X size={20} />
        </button>
      </div>
      {failed ? (
        <div role="alert">
          <p>주소 검색을 불러오지 못했습니다.</p>
          <button
            className="secondary"
            onClick={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          >
            다시 시도
          </button>{" "}
          <button onClick={close}>닫기</button>
        </div>
      ) : (
        <p>도로명, 지번 또는 아파트 이름으로 검색하세요.</p>
      )}
      <div className="lookupHost" ref={host} hidden={failed} />
    </dialog>
  );
}
export function AddressSearch({
  home,
  change,
}: {
  home: Mortgage;
  change: (patch: Partial<Mortgage>) => void;
}) {
  const [open, setOpen] = useState(false),
    [manual, setManual] = useState(false);
  function select(data: PostcodeAddress) {
    const area = resolveArea(data);
    change({
      area: area ?? home.area,
      address: {
        label: [data.address, data.buildingName].filter(Boolean).join(" · "),
        district: [data.sido, data.sigungu].filter(Boolean).join(" "),
        resolved: area !== null,
      },
      manualArea: false,
    });
    setManual(false);
    setOpen(false);
  }
  const unresolved = home.address && !home.address.resolved;
  return (
    <div className="addressField">
      <label>아파트 주소</label>
      <button
        className="addressButton"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Search size={18} />
        {home.address ? "주소 다시 검색" : "아파트 주소 검색"}
      </button>
      {home.address && (
        <strong className="addressLabel">
          <MapPin size={15} />
          {home.address.label}
        </strong>
      )}
      <p role="status">
        {unresolved ? (
          "주소의 행정구역을 확인할 수 없습니다. 주소를 다시 검색하거나 지역을 직접 선택하세요."
        ) : (
          <>
            <b>{areas[home.area]}</b> ·{" "}
            {home.manualArea
              ? "직접 선택"
              : home.address
                ? home.address.district + " 자동 판정"
                : "검색 전 기본값"}
          </>
        )}
      </p>
      <div className="zoneLinks">
        <a href={zoneSource} target="_blank" rel="noreferrer">
          국토부 지정 현황 · {zoneChecked} 기준
        </a>
        <button
          type="button"
          aria-expanded={manual}
          onClick={() => setManual(!manual)}
        >
          지역 직접 선택
        </button>
      </div>
      {(manual || unresolved) && (
        <label className="field">
          주택 소재 지역
          <select
            value={home.manualArea ? home.area : ""}
            onChange={(e) => {
              change({
                area: e.target.value as Mortgage["area"],
                address: undefined,
                manualArea: true,
              });
              setManual(false);
            }}
          >
            <option value="" disabled>
              직접 적용할 지역 선택
            </option>
            {Object.entries(areas).map(([v, n]) => (
              <option value={v} key={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      {open && <LookupDialog close={() => setOpen(false)} select={select} />}
    </div>
  );
}
