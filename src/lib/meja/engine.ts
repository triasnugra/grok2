/** Meja — satu mesin. Bukan penerbit sinyal kelima. Hanya gerbang izin. */

export const PROTOCOL = {
  id: "meja-2026-10-25",
  sealedAt: "2026-10-25T14:40:00.000Z",
  lookbackHours: 72,
  entryTtlHours: 72,
  feePerSide: 0.0005,
  slippage: 0.0005,
  minFills: 150,
  minWeeks: 20,
  minWeeksForCi: 5,
  riskUntilGate: 0.0025,
  riskAfterGate: 0.005,
  weekStopR: -4,
  ticketHours: 24,
} as const;

export const H1 = {
  id: "H1-close-reclaim-4h",
  registeredAt: "2026-10-25T14:40:00.000Z",
  fills: 0,
  inheritsArchive: false,
  text: "Entry setelah close 4 jam kembali melewati level, lawan entry sentuh-limit. Stop hanya bila candle penutup timeframe setup melewati SL, bukan sumbu. Lulus hanya bila setelah biaya batas bawah interval per minggu di atas nol, dengan minimal 150 isi dan 20 minggu. Gagal berarti keduanya tetap di luar uang.",
} as const;

export function sealHash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const H1_HASH = sealHash(H1.text);

const DRAG = PROTOCOL.feePerSide * 2 + PROTOCOL.slippage;

export type Direction = "LONG" | "SHORT";
export type EngineName = "crypto" | "tn";

export type FreshResult =
  | "TP"
  | "SL"
  | "BUSUK"
  | "CACAT_LIMIT"
  | "EXPIRED_TTL"
  | "UNVERIFIABLE"
  | "UNPARSEABLE"
  | "PENDING"
  | "AMBIGUOUS"
  | "OTHER";

export type ArchiveRow = {
  id: string;
  engine: EngineName;
  symbol: string;
  ticker: string;
  direction: Direction;
  analysisUtc: string;
  source: string;
  entry: number | null;
  tp: number | null;
  sl: number | null;
  tf: string;
  reason: string;
  oldResult: string;
  oldReason: string;
  oldR: number | null;
  resultUtc: string;
  prehitMs: number | null;
};

export type Classified = ArchiveRow & {
  result: FreshResult;
  inBook: boolean;
  verified: boolean;
  note: string;
  grossR: number | null;
  costR: number | null;
  netR: number | null;
};

export type Idea = {
  engine: EngineName;
  day: string;
  direction: Direction;
  week: string;
  symbols: number;
  grossR: number;
  netR: number;
  resultUtc: string;
};

export type CI = { lo: number; hi: number; weeks: number; mean: number };

export type Candle = { t: number; h: number; l: number };

export const KEPT: { from: string; name: string; why: string }[] = [
  {
    from: "TN",
    name: "Status TP dan SL",
    why: "Tidak menebak urutan di dalam satu candle. Keduanya sudah dicek manual di TradingView, jadi tidak diubah.",
  },
  {
    from: "TN",
    name: "Interval Wilson dan klaster",
    why: "Win rate tidak ditulis sebagai angka tunggal. Kartu yang hampir sama tidak dihitung sebagai sampel baru.",
  },
  {
    from: "Crypto + DeepSeek",
    name: "Bootstrap per minggu",
    why: "Unit independen adalah minggu ISO, bukan kartu. Di bawah lima minggu, interval tidak diterbitkan.",
  },
  {
    from: "DeepSeek",
    name: "Segel protokol",
    why: "Ubah kode berarti protokol baru. Baris lama tidak dibawa. Jurnal yang direset 20 Oktober tetap nol isi.",
  },
  {
    from: "Crypto",
    name: "Biaya di dalam angka",
    why: "0,05% per sisi ditambah slippage 0,05%. Trade yang tidak terisi tidak kena biaya.",
  },
  {
    from: "Crypto",
    name: "Uji H1, close 4 jam",
    why: "Satu-satunya uji yang boleh dibuka. Didaftarkan sebelum ada hasil. Bukan tulis ulang buku lama.",
  },
  {
    from: "Grok",
    name: "Harga lewat server",
    why: "Binance Vision, lalu cadangan. Dipakai untuk memeriksa kartu, bukan untuk menerbitkan order.",
  },
  {
    from: "Audit",
    name: "Gerbang, bukan sinyal",
    why: "Satu tiket per simbol per 24 jam. Sinyal searah di hari yang sama berbagi 1R. Minggu ≤ −4R: flat sampai Senin.",
  },
];

export const DROPPED: { from: string; name: string; why: string }[] = [
  {
    from: "DeepSeek",
    name: "Filter yang dipasang setelah rugi",
    why: "Blok pola, skor kualitas, dan konfirmasi minimum dipasang sesudah melihat kerugian. Hash berubah. Tidak diwariskan.",
  },
  {
    from: "Empat mesin",
    name: "Empat dasbor",
    why: "Alur rangkap. Yang jalan satu workflow di GitHub.",
  },
  {
    from: "Crypto",
    name: "Stop sumbu sebagai aturan maju",
    why: "Mode close ada di kode, yang dijalankan sumbu. Buku lama tetap berlabel sumbu.",
  },
  {
    from: "Crypto",
    name: "Entry sentuh-limit ke depan",
    why: "Itu kontrol yang sudah gagal. H1 menunggu close 4 jam kembali melewati level.",
  },
  {
    from: "TN",
    name: "Label EXPIRED yang jamnya terbalik",
    why: "Sebagian besar kedaluwarsa: harga TP sudah tercetak dalam 72 jam sebelum tanggal entry.",
  },
  {
    from: "TN",
    name: "INVALID untuk pra-pelacakan dan simbol kosong",
    why: "Bukan hasil. Pra-pelacakan keluar dari buku. Simbol kosong dikarantina.",
  },
  {
    from: "Grok",
    name: "Kartu 100% pada n = 1",
    why: "Interval 21–100%. Bukan hasil dan tidak digabung.",
  },
  {
    from: "Semua",
    name: "Memilih sel yang hijau",
    why: "SHORT TN yang plus pada Oktober adalah satu rezim, bukan izin mematikan LONG.",
  },
  {
    from: "Semua",
    name: "Satu kartu sama dengan satu taruhan",
    why: "18 Oktober: 48 kartu crypto selesai −48R. Itu tumpukan, bukan 48 ide.",
  },
  {
    from: "Crypto + TN + Grok",
    name: "Penerbit pola sebagai sinyal baru",
    why: "Monday sweep, deviation, wolf, fib tetap terbaca di arsip. Meja tidak memasangnya lagi sebagai order.",
  },
];

export function riskFrac(entry: number | null, sl: number | null) {
  if (entry == null || sl == null || entry === 0 || entry === sl) return null;
  const frac = Math.abs(entry - sl) / Math.abs(entry);
  return frac > 0 ? frac : null;
}

export function costR(entry: number | null, sl: number | null) {
  const frac = riskFrac(entry, sl);
  if (frac == null) return null;
  return DRAG / frac;
}

export function levelsOk(direction: Direction, entry: number, tp: number, sl: number) {
  return direction === "LONG" ? sl < entry && entry < tp : tp < entry && entry < sl;
}

export function isoWeek(day: string) {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function withMoney(row: ArchiveRow, grossR: number | null): Pick<Classified, "grossR" | "costR" | "netR"> {
  const cost = grossR == null ? null : costR(row.entry, row.sl);
  return { grossR, costR: cost, netR: grossR == null || cost == null ? grossR : grossR - cost };
}

export function classify(row: ArchiveRow): Classified {
  const blank: Classified = {
    ...row,
    result: "OTHER",
    inBook: false,
    verified: false,
    note: "",
    grossR: null,
    costR: null,
    netR: null,
  };
  if (row.source === "unknown_before_tracking" || row.oldReason === "ANALYSIS_TIME_UNKNOWN") {
    return {
      ...blank,
      result: "UNVERIFIABLE",
      note: "Setup sudah ada sebelum pelacakan dimulai. Waktu analisis tidak diketahui, jadi tidak dievaluasi. Ini bukan hasil INVALID.",
    };
  }
  if (!row.symbol) {
    return {
      ...blank,
      result: "UNPARSEABLE",
      note: "Symbol kosong. Baris ini karantina parser, bukan hasil.",
    };
  }
  if (row.oldResult === "TP" || row.oldResult === "SL") {
    const grossR = row.oldResult === "SL" ? -1 : row.oldR;
    return {
      ...blank,
      ...withMoney(row, grossR),
      result: row.oldResult,
      verified: true,
      inBook: grossR != null,
      note:
        row.oldResult === "TP"
          ? "TP diverifikasi manual di TradingView. Level tidak diubah. Biaya hanya masuk angka bersih."
          : "SL diverifikasi manual di TradingView. Level tidak diubah. Biaya hanya masuk angka bersih.",
    };
  }
  if (row.oldResult === "EXPIRED") {
    if (row.prehitMs != null) {
      return {
        ...blank,
        result: "BUSUK",
        note: "Bukan kedaluwarsa. Harga TP sudah tercetak dalam 72 jam sebelum tanggal entry, jadi harga dan jam entry ada sesudah target.",
      };
    }
    if (row.oldReason === "TP_REACHED_BEFORE_ENTRY") {
      return {
        ...blank,
        result: "CACAT_LIMIT",
        note: "Setelah jam analisis, target tercapai sebelum entry terisi, dan TP tidak tercetak pada 72 jam sebelumnya. Bukan menang. Limit memilih yang kalah.",
      };
    }
    return {
      ...blank,
      result: "EXPIRED_TTL",
      note: "Entry tidak tersentuh sampai batas waktu. Bukan menang atau kalah.",
    };
  }
  if (row.oldResult === "INVALID") {
    return { ...blank, result: "UNPARSEABLE", note: "Invalid lama tanpa simbol atau level yang bisa dinilai. Keluar dari hasil." };
  }
  if (row.oldResult === "PENDING") {
    return { ...blank, result: "PENDING", note: "Masih berjalan. Bukan hasil." };
  }
  return { ...blank, note: row.oldResult || "Tidak dikenali." };
}

export function ideasOf(rows: Classified[]): Idea[] {
  const filled = rows.filter(
    (r): r is Classified & { grossR: number; netR: number } =>
      r.inBook && r.grossR != null && r.netR != null,
  );
  const sorted = [...filled].sort((a, b) => (a.analysisUtc < b.analysisUtc ? -1 : 1));
  const kept: typeof sorted = [];
  const last = new Map<string, number>();
  for (const row of sorted) {
    const key = `${row.engine}|${row.symbol}`;
    const t = Date.parse(row.analysisUtc);
    const prev = last.get(key);
    if (prev != null && t - prev < PROTOCOL.ticketHours * 3600_000) continue;
    last.set(key, t);
    kept.push(row);
  }
  const groups = new Map<string, typeof sorted>();
  for (const row of kept) {
    const day = row.analysisUtc.slice(0, 10);
    const key = `${row.engine}|${day}|${row.direction}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  const ideas: Idea[] = [];
  for (const [key, bucket] of groups) {
    const [engine, day, direction] = key.split("|") as [EngineName, string, Direction];
    ideas.push({
      engine,
      day,
      direction,
      week: isoWeek(day),
      symbols: bucket.length,
      grossR: bucket.reduce((sum, row) => sum + row.grossR, 0) / bucket.length,
      netR: bucket.reduce((sum, row) => sum + row.netR, 0) / bucket.length,
      resultUtc: bucket.map((row) => row.resultUtc).sort().at(-1) || bucket[0].analysisUtc,
    });
  }
  ideas.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.direction < b.direction ? -1 : 1));
  return ideas;
}

export function maxDrawdown(values: number[]) {
  let equity = 0;
  let peak = 0;
  let dd = 0;
  for (const value of values) {
    equity += value;
    peak = Math.max(peak, equity);
    dd = Math.max(dd, peak - equity);
  }
  return dd;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootCI(ideas: { day: string; netR: number }[], opts?: { B?: number; seed?: number }): CI | null {
  const groups = new Map<string, { s: number; n: number }>();
  for (const idea of ideas) {
    const key = isoWeek(idea.day);
    const bucket = groups.get(key) ?? { s: 0, n: 0 };
    bucket.s += idea.netR;
    bucket.n += 1;
    groups.set(key, bucket);
  }
  const clusters = [...groups.values()];
  if (clusters.length < PROTOCOL.minWeeksForCi) return null;
  const rounds = opts?.B ?? 4000;
  const rand = mulberry32(opts?.seed ?? 20261025);
  const means: number[] = [];
  for (let round = 0; round < rounds; round++) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < clusters.length; i++) {
      const pick = clusters[Math.floor(rand() * clusters.length)];
      sum += pick.s;
      n += pick.n;
    }
    means.push(n ? sum / n : 0);
  }
  means.sort((a, b) => a - b);
  const total = ideas.reduce((sum, idea) => sum + idea.netR, 0);
  return {
    lo: means[Math.floor(0.025 * rounds)],
    hi: means[Math.floor(0.975 * rounds)],
    weeks: clusters.length,
    mean: ideas.length ? total / ideas.length : 0,
  };
}

export type BookSide = {
  ideas: number;
  wins: number;
  winRate: number | null;
  gross: number;
  net: number;
  mean: number | null;
  maxDD: number;
  weeks: number;
  ci: CI | null;
  tp: number;
  sl: number;
};

function sideOf(ideas: Idea[], classified: Classified[], engine: EngineName): BookSide {
  const mine = ideas.filter((idea) => idea.engine === engine);
  const wins = mine.filter((idea) => idea.netR > 0).length;
  const net = mine.reduce((sum, idea) => sum + idea.netR, 0);
  const weeks = new Set(mine.map((idea) => idea.week)).size;
  return {
    ideas: mine.length,
    wins,
    winRate: mine.length ? wins / mine.length : null,
    gross: mine.reduce((sum, idea) => sum + idea.grossR, 0),
    net,
    mean: mine.length ? net / mine.length : null,
    maxDD: maxDrawdown(mine.map((idea) => idea.netR)),
    weeks,
    ci: bootCI(mine),
    tp: classified.filter((row) => row.engine === engine && row.result === "TP").length,
    sl: classified.filter((row) => row.engine === engine && row.result === "SL").length,
  };
}

export function summarizeArchive(rows: ArchiveRow[]) {
  const classified = rows.map(classify);
  const ideas = ideasOf(classified);
  const counts = {
    BUSUK: 0,
    CACAT_LIMIT: 0,
    EXPIRED_TTL: 0,
    UNVERIFIABLE: 0,
    UNPARSEABLE: 0,
    TP: 0,
    SL: 0,
    PENDING: 0,
    AMBIGUOUS: 0,
    OTHER: 0,
  };
  for (const row of classified) counts[row.result] += 1;
  return {
    classified,
    ideas,
    counts,
    crypto: sideOf(ideas, classified, "crypto"),
    tn: sideOf(ideas, classified, "tn"),
  };
}

export type Permission = { ok: false; code: "TOLAK" | "FLAT"; label: string } | { ok: true; code: "IZIN"; label: string };

export function permission(fills: number, weeks: number, ci: CI | null, weekSum: number, weekTraded: boolean): Permission {
  if (weekTraded && weekSum <= PROTOCOL.weekStopR) {
    return { ok: false, code: "FLAT", label: "Flat sampai Senin. Minggu ini sudah ≤ −4R." };
  }
  if (fills >= PROTOCOL.minFills && weeks >= PROTOCOL.minWeeks && ci != null && ci.lo > 0) {
    return { ok: false, code: "TOLAK", label: "Angka arsip bukan izin. Jurnal Meja masih kosong." };
  }
  return {
    ok: false,
    code: "TOLAK",
    label: "Tolak. Butuh 150 ide terisi, 20 minggu, dan batas bawah interval mingguan di atas nol setelah biaya.",
  };
}

/** Izin hanya untuk jurnal protokol ini. Arsip tidak pernah lulus fungsi ini. */
export function journalPermission(fills: number, weeks: number, ci: CI | null, weekSum: number, weekTraded: boolean): Permission {
  if (weekTraded && weekSum <= PROTOCOL.weekStopR) {
    return { ok: false, code: "FLAT", label: "Flat sampai Senin. Minggu ini sudah ≤ −4R." };
  }
  if (fills >= PROTOCOL.minFills && weeks >= PROTOCOL.minWeeks && ci != null && ci.lo > 0) {
    return { ok: true, code: "IZIN", label: "Gerbang angka lulus. Risiko paling besar 0,5% per ide. Bukan jaminan." };
  }
  return {
    ok: false,
    code: "TOLAK",
    label: "Tolak. Jurnal protokol ini belum punya 150 isi dan 20 minggu dengan interval di atas nol.",
  };
}

export type Walk = {
  result: FreshResult;
  at: number | null;
  note: string;
  grossR: number | null;
};

function tpHit(direction: Direction, tp: number, candle: Candle) {
  return direction === "LONG" ? candle.h >= tp : candle.l <= tp;
}
function slHit(direction: Direction, sl: number, candle: Candle) {
  return direction === "LONG" ? candle.l <= sl : candle.h >= sl;
}
function entryHit(direction: Direction, entry: number, candle: Candle) {
  return direction === "LONG" ? candle.l <= entry : candle.h >= entry;
}

export function walkLimit(input: {
  direction: Direction;
  entry: number;
  tp: number;
  sl: number;
  analysisMs: number;
  now: number;
  candles: Candle[];
}): Walk {
  const { direction, entry, tp, sl, analysisMs, now } = input;
  if (![entry, tp, sl, analysisMs, now].every(Number.isFinite) || !levelsOk(direction, entry, tp, sl)) {
    return {
      result: "UNPARSEABLE",
      at: null,
      note: "Level tidak konsisten dengan arah, atau angkanya bukan angka.",
      grossR: null,
    };
  }
  const lookFrom = analysisMs - PROTOCOL.lookbackHours * 3600_000;
  const candles = [...input.candles].sort((a, b) => a.t - b.t);
  const prior = candles.find((candle) => candle.t < analysisMs && candle.t >= lookFrom && tpHit(direction, tp, candle));
  if (prior) {
    return {
      result: "BUSUK",
      at: prior.t,
      note: "Harga TP sudah tercetak dalam 72 jam sebelum tanggal entry. Bukan kedaluwarsa yang sah.",
      grossR: null,
    };
  }
  let open = false;
  const planned = Math.abs(tp - entry) / Math.abs(entry - sl);
  for (const candle of candles) {
    if (candle.t < analysisMs || candle.t > now) continue;
    if (!open) {
      const touched = entryHit(direction, entry, candle);
      const target = tpHit(direction, tp, candle);
      if (!touched) {
        if (target) {
          return {
            result: "CACAT_LIMIT",
            at: candle.t,
            note: "Target tercapai sebelum entry terisi. Bukan menang.",
            grossR: null,
          };
        }
        continue;
      }
      if (target) {
        return {
          result: "AMBIGUOUS",
          at: candle.t,
          note: "Entry dan TP ada di candle yang sama. Urutan tidak diketahui, jadi bukan hasil.",
          grossR: null,
        };
      }
      open = true;
      if (slHit(direction, sl, candle)) {
        return { result: "SL", at: candle.t, note: "SL tersentuh pada candle entry.", grossR: -1 };
      }
      continue;
    }
    const target = tpHit(direction, tp, candle);
    const stop = slHit(direction, sl, candle);
    if (target && stop) {
      return {
        result: "AMBIGUOUS",
        at: candle.t,
        note: "TP dan SL ada di candle yang sama. Urutan tidak diketahui.",
        grossR: null,
      };
    }
    if (target) return { result: "TP", at: candle.t, note: "TP tersentuh setelah entry.", grossR: planned };
    if (stop) return { result: "SL", at: candle.t, note: "SL tersentuh setelah entry.", grossR: -1 };
  }
  if (!open && now - analysisMs > PROTOCOL.entryTtlHours * 3600_000) {
    return { result: "EXPIRED_TTL", at: analysisMs + PROTOCOL.entryTtlHours * 3600_000, note: "Entry tidak tersentuh sampai 72 jam.", grossR: null };
  }
  return {
    result: "PENDING",
    at: null,
    note: open ? "Entry terisi. TP dan SL belum." : "Menunggu entry. TP belum tercetak lebih dulu.",
    grossR: null,
  };
}

export function resultDay(rows: Classified[], engine: EngineName, day: string) {
  const cards = rows.filter(
    (row) => row.engine === engine && (row.result === "TP" || row.result === "SL") && row.resultUtc.slice(0, 10) === day,
  );
  return {
    cards: cards.length,
    grossR: cards.reduce((sum, row) => sum + (row.grossR ?? 0), 0),
  };
}

export const VONIS = [
  {
    engine: "Crypto",
    status: "Ditolak",
    figure: "4 menang / 75 stop. Win rate 5,1% (n=79). Expectancy −0,71R. Total −55,9R.",
  },
  {
    engine: "TN",
    status: "Belum layak",
    figure: "14 / 46. Win rate 23,3% (n=60). Expectancy −0,30R. Total −18R.",
  },
  {
    engine: "DeepSeek",
    status: "Tidak sah",
    figure: "Protokol direset 20 Oktober. Jurnal tersegel: 0 trade terisi. Kartu 100% adalah n=1.",
  },
  {
    engine: "Grok",
    status: "Tidak diukur",
    figure: "1 TP, n=1. Interval 21–100%. Bukan hasil.",
  },
] as const;
