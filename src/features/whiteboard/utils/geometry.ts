export type VPt = { x: number; y: number };

export function clipVCell(poly: VPt[], sx: number, sy: number, ox: number, oy: number): VPt[] {
  const mx = (sx + ox) / 2, my = (sy + oy) / 2, dx = ox - sx, dy = oy - sy;
  const inside = (p: VPt) => (p.x - mx) * dx + (p.y - my) * dy <= 0;
  const out: VPt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i]!, n = poly[(i + 1) % poly.length]!;
    const ci = inside(c), ni = inside(n);
    if (ci) out.push(c);
    if (ci !== ni) {
      const ex = n.x - c.x, ey = n.y - c.y, dn = ex * dx + ey * dy;
      if (Math.abs(dn) > 1e-10) {
        const t = ((mx - c.x) * dx + (my - c.y) * dy) / dn;
        out.push({ x: c.x + t * ex, y: c.y + t * ey });
      }
    }
  }
  return out;
}

export const denX = (nx: number, w: number) => nx * w;
export const denY = (ny: number, h: number) => ny * h;
export const isNorm = (v: number) => v >= 0 && v <= 1;

export const normalizeX = (x: number, width: number) => x / width;
export const normalizeY = (y: number, height: number) => y / height;
