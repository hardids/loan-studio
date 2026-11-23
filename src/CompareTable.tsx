import { fmt } from "./loan";
export type CompareRow = { label: string; a: string; b: string; delta: string };
export function numeric(
  label: string,
  a: number,
  b: number,
  unit = "원",
  deltaUnit = unit,
): CompareRow {
  const d = Number((b - a).toFixed(6));
  return {
    label,
    a: fmt(a) + unit,
    b: fmt(b) + unit,
    delta:
      d === 0 ? "동일" : (d > 0 ? "+" : "−") + fmt(Math.abs(d)) + deltaUnit,
  };
}
export function category(label: string, a: string, b: string): CompareRow {
  return { label, a, b, delta: a === b ? "동일" : "조건 변경" };
}
export function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <table className="deltaTable">
      <thead>
        <tr>
          <th scope="col">비교 항목</th>
          <th scope="col">A안</th>
          <th scope="col">B안</th>
          <th scope="col">차이 (B − A)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={row.delta === "동일" ? "" : "different"}
          >
            <th scope="row">{row.label}</th>
            <td>{row.a}</td>
            <td>{row.b}</td>
            <td>{row.delta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
