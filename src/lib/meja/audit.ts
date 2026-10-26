import { createServerFn } from "@tanstack/react-start";
import { costR, walkLimit, type Candle, type Direction } from "@/lib/meja/engine";

const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com"];

async function klines(symbol: string, start: number, end: number): Promise<Candle[]> {
  let last = "jaringan";
  for (const host of HOSTS) {
    try {
      const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&startTime=${start}&endTime=${end}&limit=1000`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        last = String(res.status);
        continue;
      }
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        last = "bukan daftar";
        continue;
      }
      return data.map((row) => {
        const k = row as (string | number)[];
        return { t: Number(k[0]), h: Number(k[2]), l: Number(k[3]) };
      });
    } catch (error) {
      last = error instanceof Error ? error.message : "jaringan";
    }
  }
  throw new Error(`Harga tidak tersedia (${last}).`);
}

export const auditCard = createServerFn({ method: "GET" }).validator((input: {
    symbol?: string;
    direction?: string;
    entry?: number;
    tp?: number;
    sl?: number;
    analysisUtc?: string;
  }) => {
    const symbol = String(input.symbol ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{6,20}$/.test(symbol) || !symbol.endsWith("USDT")) {
      throw new Error("Symbol harus pasangan USDT, contoh SANDUSDT.");
    }
    const direction: Direction = input.direction === "SHORT" ? "SHORT" : "LONG";
    const entry = Number(input.entry);
    const tp = Number(input.tp);
    const sl = Number(input.sl);
    if (![entry, tp, sl].every((n) => Number.isFinite(n) && n > 0)) {
      throw new Error("Entry, TP, dan SL harus angka di atas nol.");
    }
    const analysisMs = Date.parse(String(input.analysisUtc ?? ""));
    if (Number.isNaN(analysisMs)) throw new Error("Waktu analisis tidak valid.");
    if (analysisMs > Date.now() + 3600_000) throw new Error("Waktu analisis ada di masa depan.");
    if (Date.now() - analysisMs > 120 * 86400_000) throw new Error("Paling lama 120 hari ke belakang.");
    return { symbol, direction, entry, tp, sl, analysisMs };
  })
  .handler(async ({ data }) => {
    const start = data.analysisMs - 72 * 3600_000;
    const end = Math.min(Date.now(), data.analysisMs + 21 * 86400_000);
    const candles = await klines(data.symbol, start, end);
    const walk = walkLimit({ ...data, now: Date.now(), candles });
    const fee = walk.grossR == null ? null : costR(data.entry, data.sl);
    return {
      result: walk.result,
      at: walk.at,
      note: walk.note,
      grossR: walk.grossR,
      costR: fee,
      netR: walk.grossR == null || fee == null ? walk.grossR : walk.grossR - fee,
      candles: candles.length,
      checkedAt: new Date().toISOString(),
    };
  });
