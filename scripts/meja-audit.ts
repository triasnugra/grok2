import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { costR, journalPermission, summarizeArchive, walkLimit, H1, H1_HASH, PROTOCOL, type Direction } from "../src/lib/meja/engine.ts";
import { SEALED_ROWS } from "../src/lib/meja/sealed.ts";

type InboxCard = {
  id?: string;
  symbol?: string;
  direction?: string;
  entry?: number;
  tp?: number;
  sl?: number;
  analysisUtc?: string;
};

const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];

async function klines(symbol: string, start: number, end: number) {
  let last = "jaringan";
  for (const host of HOSTS) {
    const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&startTime=${start}&endTime=${end}&limit=1000`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        last = String(res.status);
        continue;
      }
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) continue;
      return data.map((row) => {
        const k = row as (string | number)[];
        return { t: Number(k[0]), h: Number(k[2]), l: Number(k[3]) };
      });
    } catch (error) {
      last = error instanceof Error ? error.message : "jaringan";
    }
  }
  throw new Error(last);
}

const book = summarizeArchive(SEALED_ROWS);
const gate = journalPermission(0, 0, null, 0, false);
const raw = readFileSync(new URL("../data/inbox.json", import.meta.url), "utf8");
const inbox = JSON.parse(raw) as unknown;
if (!Array.isArray(inbox)) throw new Error("data/inbox.json harus berupa array");

const lines = [
  "# Meja",
  "",
  `Protokol ${PROTOCOL.id}. Hash uji H1 \`${H1_HASH}\`. Isi H1: ${H1.fills}. Arsip tidak dibawa.`,
  "",
  `Izin: **${gate.code}**. ${gate.label}`,
  "",
  "## Arsip yang dikoreksi",
  "",
  `- Busuk (TP sudah tercetak sebelum jam entry): ${book.counts.BUSUK}`,
  `- Cacat limit: ${book.counts.CACAT_LIMIT}`,
  `- Lewat waktu: ${book.counts.EXPIRED_TTL}`,
  `- Tak terukur: ${book.counts.UNVERIFIABLE}`,
  `- Simbol kosong: ${book.counts.UNPARSEABLE}`,
  `- TP / SL tidak diubah: ${book.counts.TP} / ${book.counts.SL}`,
  `- Ide crypto ${book.crypto.ideas}, rata bersih ${book.crypto.mean?.toFixed(2) ?? "—"}R`,
  `- Ide TN ${book.tn.ideas}, rata bersih ${book.tn.mean?.toFixed(2) ?? "—"}R`,
  "",
  "## Inbox",
  "",
];

for (const item of inbox as InboxCard[]) {
  const symbol = String(item.symbol ?? "").toUpperCase();
  const direction: Direction = item.direction === "SHORT" ? "SHORT" : "LONG";
  const entry = Number(item.entry);
  const tp = Number(item.tp);
  const sl = Number(item.sl);
  const analysisMs = Date.parse(String(item.analysisUtc ?? ""));
  const id = item.id || symbol || "tanpa-id";
  if (!symbol.endsWith("USDT") || !Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl) || Number.isNaN(analysisMs)) {
    lines.push(`- ${id}: tidak bisa dibaca. Butuh symbol USDT, direction, entry, tp, sl, analysisUtc.`);
    continue;
  }
  try {
    const candles = await klines(symbol, analysisMs - 72 * 3600_000, Math.min(Date.now(), analysisMs + 21 * 86400_000));
    const walk = walkLimit({ direction, entry, tp, sl, analysisMs, now: Date.now(), candles });
    const fee = walk.grossR == null ? null : costR(entry, sl);
    const net = walk.grossR == null || fee == null ? walk.grossR : walk.grossR - fee;
    lines.push(`- ${id} ${symbol} ${direction}: ${walk.result}. ${walk.note} Bersih: ${net == null ? "—" : net.toFixed(2) + "R"}.`);
  } catch (error) {
    lines.push(`- ${id}: harga gagal (${error instanceof Error ? error.message : "jaringan"}).`);
  }
}

if (inbox.length === 0) lines.push("- Kosong. Jurnal protokol ini belum punya trade.");
lines.push("", "Workflow ini tidak memasang order.", "");

mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/meja-report.md", import.meta.url), lines.join("\n"));
console.log(lines.join("\n"));
