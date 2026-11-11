/** @file Bounded linear DC nodal analysis. Ideal voltage sources, resistors and shunts only. */
export interface DcBranch {
  id: string;
  a: string;
  b: string;
  ohms: number;
}
/** @brief Solve each connected resistive island separately; floating/conflicting islands remain unknown.
 * @param nodes Stable net identifiers. @param drivers Ideal source voltages per net.
 * @param branches Passive resistance branches; positive finite resistance is mandatory.
 */
export function solveDc(
  nodes: string[],
  drivers: Readonly<Record<string, readonly number[]>>,
  branches: DcBranch[],
  limit = 256,
) {
  const volts: Record<string, number | null> = Object.fromEntries(
      nodes.map((n) => [n, null]),
    ),
    currents: Record<string, number | null> = {},
    issues: string[] = [];
  const edges = new Map(nodes.map((n) => [n, [] as DcBranch[]]));
  for (const b of branches) {
    currents[b.id] = null;
    if (!Number.isFinite(b.ohms) || b.ohms < 1e-6 || b.ohms > 1e12) {
      issues.push(`Invalid resistance ${b.id}`);
      continue;
    }
    edges.get(b.a)?.push(b);
    edges.get(b.b)?.push(b);
  }
  const seen = new Set<string>();
  for (const seed of nodes) {
    if (seen.has(seed)) continue;
    const island: string[] = [],
      pending = [seed];
    while (pending.length) {
      const n = pending.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      island.push(n);
      for (const b of edges.get(n) ?? []) pending.push(b.a === n ? b.b : b.a);
    }
    const fixed = new Map<string, number>();
    let conflict = false;
    for (const n of island) {
      const ds = drivers[n] ?? [];
      if (ds.length) {
        if (ds.some((v) => !Number.isFinite(v) || Math.abs(v - ds[0]) > 0.1))
          conflict = true;
        else fixed.set(n, ds[0]);
      }
    }
    if (conflict) {
      issues.push("Conflicting ideal voltage sources in resistive island");
      continue;
    }
    if (!fixed.size) continue;
    const unknown = island.filter((n) => !fixed.has(n));
    if (unknown.length > limit) {
      issues.push(`DC solver island exceeds ${limit} unknown nodes`);
      continue;
    }
    const index = new Map(unknown.map((n, i) => [n, i])),
      a = unknown.map(() => new Float64Array(unknown.length + 1));
    for (const n of unknown) {
      const row = a[index.get(n)!];
      for (const b of edges.get(n) ?? []) {
        const other = b.a === n ? b.b : b.a;
        if (other === n) continue;
        const g = 1 / b.ohms;
        row[index.get(n)!] += g;
        if (fixed.has(other)) row[unknown.length] += g * fixed.get(other)!;
        else row[index.get(other)!] -= g;
      }
    }
    let singular = false;
    for (let i = 0; i < unknown.length; i++) {
      let pivot = i;
      for (let j = i + 1; j < unknown.length; j++)
        if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
      if (Math.abs(a[pivot][i]) < 1e-15) {
        singular = true;
        break;
      }
      [a[i], a[pivot]] = [a[pivot], a[i]];
      const d = a[i][i];
      for (let k = i; k <= unknown.length; k++) a[i][k] /= d;
      for (let j = 0; j < unknown.length; j++) {
        if (j === i) continue;
        const f = a[j][i];
        for (let k = i; k <= unknown.length; k++) a[j][k] -= f * a[i][k];
      }
    }
    if (singular) {
      issues.push("Singular DC island");
      continue;
    }
    for (const [n, v] of fixed) volts[n] = v;
    for (const [n, i] of index) volts[n] = a[i][unknown.length];
  }
  for (const b of branches)
    if (
      volts[b.a] != null &&
      volts[b.b] != null &&
      Number.isFinite(b.ohms) &&
      b.ohms >= 1e-6 &&
      b.ohms <= 1e12
    )
      currents[b.id] = (volts[b.a]! - volts[b.b]!) / b.ohms;
  return { volts, currents, issues };
}
