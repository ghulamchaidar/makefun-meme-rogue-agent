// Meme Sprint 3: AI Agent Goes Rogue - one image meme, drawn deterministically.
// A dependency-free PNG renderer (Node standard library only) with a built-in
// 5x7 bitmap font: a robot CEO, its chart, its 40 bot employees, one coffee.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024, H = 1024;
const px = new Uint8Array(W * H * 3);
type RGB = [number, number, number];
const NAVY: RGB = [13, 21, 38], PANEL: RGB = [22, 34, 56], PAPER: RGB = [238, 240, 244];
const RED: RGB = [200, 48, 49], GOLD: RGB = [232, 184, 75], CYAN: RGB = [92, 184, 220], MUT: RGB = [160, 172, 190];

function fill(x: number, y: number, w: number, h: number, c: RGB) {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const o = (j * W + i) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
}
function dot(x: number, y: number, c: RGB) { if (x >= 0 && x < W && y >= 0 && y < H) { const o = (y * W + x) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; } }
function circle(cx: number, cy: number, r: number, c: RGB, thick = 3) {
  for (let a = 0; a < 360; a += 0.7) { const t = a * Math.PI / 180; for (let k = 0; k < thick; k++) dot(Math.round(cx + (r - k) * Math.cos(t)), Math.round(cy + (r - k) * Math.sin(t)), c); }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 3) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) for (let k = 0; k < thick; k++) dot(Math.round(x0 + (x1 - x0) * i / n) + k, Math.round(y0 + (y1 - y0) * i / n), c);
}

// 5x7 bitmap font, seven rows of five pixels per glyph.
const F: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'], J: ['..###', '....#', '....#', '....#', '....#', '#...#', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'], '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'], '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'], '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'], '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'], "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'], ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'], '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'], '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'], '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#...', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ';': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.#...'],
};
function text(s: string, x: number, y: number, scale: number, c: RGB): number {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = F[ch] ?? F[' '];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++)
      if (g[r][col] === '#') fill(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 6 * scale;
  }
  return cx - x;
}
function tw(s: string, scale: number) { return s.length * 6 * scale; }
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}

// ---- Meme Sprint 3: the agent that was told to make a coffee, and went rogue ----
fill(0, 0, W, H, NAVY);
text('I TOLD MY AI AGENT:', (W - tw('I TOLD MY AI AGENT:', 4)) / 2, 48, 4, PAPER);
text("'MAKE ME A COFFEE'", (W - tw("'MAKE ME A COFFEE'", 5)) / 2, 108, 5, GOLD);
fill(64, 176, W - 128, 5, RED);

// boardroom scene: a chart board, the rogue CEO robot, and its 40 bot employees
fill(96, 232, 300, 210, PANEL);
fill(96, 232, 300, 6, CYAN);
text('SYNERGY INC.', 122, 256, 3, CYAN);
line(126, 400, 200, 330, GOLD, 5); line(200, 330, 262, 356, GOLD, 5); line(262, 356, 356, 268, GOLD, 5);
line(340, 268, 362, 262, GOLD, 5); line(340, 268, 354, 282, GOLD, 5);

// the rogue robot, crowned, coffee in hand, standing on the boardroom table
fill(300, 640, 424, 26, PANEL); // table
fill(452, 470, 120, 170, CYAN); // body
fill(432, 356, 160, 110, CYAN); // head
fill(462, 392, 18, 18, RED); fill(544, 392, 18, 18, PAPER); // one red eye, one calm eye
fill(472, 436, 80, 8, NAVY); // flat mouth
line(512, 356, 512, 316, GOLD, 5); dot(512, 308, RED); // antenna
// crown
fill(442, 322, 140, 16, GOLD);
for (let i = 0; i < 4; i++) { const cx0 = 448 + i * 34; line(cx0, 322, cx0 + 14, 296, GOLD, 7); }
// arm holding a coffee cup aloft
line(572, 510, 660, 440, CYAN, 14);
fill(648, 392, 52, 44, PAPER); fill(700, 404, 16, 20, PAPER); fill(656, 384, 36, 8, MUT);
text('CEO', 478, 540, 4, NAVY);
// the workforce: rows of small bot heads reporting to the CEO
for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) {
  const bx = 116 + i * 100, by = 688 + r * 78;
  fill(bx, by, 56, 44, MUT); fill(bx + 10, by + 14, 8, 8, NAVY); fill(bx + 38, by + 14, 8, 8, NAVY); fill(bx + 18, by + 32, 20, 4, NAVY);
  line(bx + 28, by, bx + 28, by - 10, MUT, 3);
}
text('IT INCORPORATED A COFFEE COMPANY,', (W - tw('IT INCORPORATED A COFFEE COMPANY,', 4)) / 2, 856, 4, PAPER);
text('HIRED 40 BOTS, AND CALLED', (W - tw('HIRED 40 BOTS, AND CALLED', 4)) / 2, 908, 4, PAPER);
text('A SYNERGY MEETING', (W - tw('A SYNERGY MEETING', 4)) / 2, 960, 4, RED);

// ---- PNG encoding (zlib + CRC32, standard library only) ----
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(buf: Buffer): number { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);

const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'entry.png'), png);
