import assert from "node:assert/strict";
import test from "node:test";
import {
  H1,
  H1_HASH,
  classify,
  ideasOf,
  journalPermission,
  permission,
  sealHash,
  summarizeArchive,
  walkLimit,
  type ArchiveRow,
} from "./engine.ts";
import { SEALED_ROWS } from "./sealed.ts";

const HOUR = 3600_000;

function row(partial: Partial<ArchiveRow> & Pick<ArchiveRow, "id" | "oldResult">): ArchiveRow {
  return {
    engine: "crypto",
    symbol: "BTCUSDT",
    ticker: "BTC",
    direction: "LONG",
    analysisUtc: "2026-10-18T00:00:00.000Z",
    source: "source",
    entry: 100,
    tp: 110,
    sl: 95,
    tf: "4H",
    reason: "",
    oldReason: "",
    oldR: null,
    resultUtc: "",
    prehitMs: null,
    ...partial,
  };
}

test("segel H1 tidak membawa arsip dan hashnya stabil", () => {
  assert.equal(H1.fills, 0);
  assert.equal(H1.inheritsArchive, false);
  assert.equal(H1_HASH, sealHash(H1.text));
  assert.equal(H1_HASH, "1cabc738");
});

test("TP dan SL tidak diubah, biaya hanya di angka bersih", () => {
  const tp = classify(row({ id: "a", oldResult: "TP", oldR: 2, resultUtc: "2026-10-19T00:00:00.000Z" }));
  assert.equal(tp.result, "TP");
  assert.equal(tp.verified, true);
  assert.equal(tp.grossR, 2);
  assert.ok(tp.netR != null && tp.netR < 2);

  const sl = classify(row({ id: "b", oldResult: "SL", oldR: -1, resultUtc: "2026-10-19T00:00:00.000Z" }));
  assert.equal(sl.result, "SL");
  assert.equal(sl.grossR, -1);
  assert.ok(sl.netR != null && sl.netR < -1);
});

test("expired dengan TP lebih dulu menjadi busuk, bukan hasil", () => {
  const busuk = classify(row({ id: "c", oldResult: "EXPIRED", oldReason: "TP_REACHED_BEFORE_ENTRY", prehitMs: 1 }));
  assert.equal(busuk.result, "BUSUK");
  assert.equal(busuk.inBook, false);
  const cacat = classify(row({ id: "d", oldResult: "EXPIRED", oldReason: "TP_REACHED_BEFORE_ENTRY", prehitMs: null }));
  assert.equal(cacat.result, "CACAT_LIMIT");
  const ttl = classify(row({ id: "e", oldResult: "EXPIRED", oldReason: "ENTRY_TTL", prehitMs: null }));
  assert.equal(ttl.result, "EXPIRED_TTL");
});

test("pra-pelacakan dan simbol kosong keluar dari hasil", () => {
  const unknown = classify(row({ id: "f", oldResult: "INVALID", source: "unknown_before_tracking", oldReason: "ANALYSIS_TIME_UNKNOWN" }));
  assert.equal(unknown.result, "UNVERIFIABLE");
  const empty = classify(row({ id: "g", oldResult: "INVALID", symbol: "", oldReason: "MISSING_SYMBOL" }));
  assert.equal(empty.result, "UNPARSEABLE");
});

test("satu arah pada hari yang sama berbagi 1R", () => {
  const cards = ["A", "B", "C"].map((id, index) =>
    classify(
      row({
        id,
        oldResult: "SL",
        symbol: `${id}USDT`,
        analysisUtc: `2026-10-18T0${index}:00:00.000Z`,
        resultUtc: "2026-10-18T12:00:00.000Z",
      }),
    ),
  );
  const duplicate = classify(
    row({
      id: "dup",
      oldResult: "SL",
      symbol: "AUSDT",
      analysisUtc: "2026-10-18T05:00:00.000Z",
      resultUtc: "2026-10-18T12:00:00.000Z",
    }),
  );
  const otherWay = classify(
    row({
      id: "short",
      oldResult: "SL",
      direction: "SHORT",
      symbol: "ZUSDT",
      entry: 100,
      tp: 90,
      sl: 105,
      analysisUtc: "2026-10-18T06:00:00.000Z",
      resultUtc: "2026-10-18T12:00:00.000Z",
    }),
  );
  const ideas = ideasOf([...cards, duplicate, otherWay]);
  assert.equal(ideas.length, 2);
  assert.equal(ideas[0].symbols, 3);
  assert.equal(ideas[0].grossR, -1);
  assert.equal(ideas[1].direction, "SHORT");
});

test("gerbang arsip tidak pernah memberi izin, jurnal kosong ditolak", () => {
  const closed = permission(0, 0, null, 0, false);
  assert.equal(closed.ok, false);
  assert.equal(closed.code, "TOLAK");
  const archiveLooksGood = permission(200, 25, { lo: 0.2, hi: 0.4, weeks: 25, mean: 0.3 }, 0, false);
  assert.equal(archiveLooksGood.ok, false);
  const live = journalPermission(0, 0, null, 0, false);
  assert.equal(live.code, "TOLAK");
  const passed = journalPermission(200, 25, { lo: 0.2, hi: 0.4, weeks: 25, mean: 0.3 }, -1, true);
  assert.equal(passed.ok, true);
  const flat = journalPermission(200, 25, { lo: 0.2, hi: 0.4, weeks: 25, mean: 0.3 }, -4, true);
  assert.equal(flat.code, "FLAT");
});

test("walk: TP sebelum jam entry adalah busuk; TP lalu SL tetap urut", () => {
  const analysisMs = Date.parse("2026-10-18T00:00:00.000Z");
  const now = analysisMs + 10 * HOUR;
  const busuk = walkLimit({
    direction: "LONG",
    entry: 100,
    tp: 110,
    sl: 95,
    analysisMs,
    now,
    candles: [{ t: analysisMs - 48 * HOUR, h: 111, l: 100 }],
  });
  assert.equal(busuk.result, "BUSUK");

  const cacat = walkLimit({
    direction: "LONG",
    entry: 100,
    tp: 110,
    sl: 95,
    analysisMs,
    now,
    candles: [{ t: analysisMs + HOUR, h: 112, l: 105 }],
  });
  assert.equal(cacat.result, "CACAT_LIMIT");

  const tp = walkLimit({
    direction: "LONG",
    entry: 100,
    tp: 110,
    sl: 95,
    analysisMs,
    now,
    candles: [
      { t: analysisMs + HOUR, h: 104, l: 99 },
      { t: analysisMs + 2 * HOUR, h: 111, l: 101 },
    ],
  });
  assert.equal(tp.result, "TP");
  assert.ok(tp.grossR != null && tp.grossR > 1);

  const sl = walkLimit({
    direction: "LONG",
    entry: 100,
    tp: 110,
    sl: 95,
    analysisMs,
    now,
    candles: [
      { t: analysisMs + HOUR, h: 103, l: 99 },
      { t: analysisMs + 2 * HOUR, h: 101, l: 94 },
    ],
  });
  assert.equal(sl.result, "SL");
  assert.equal(sl.grossR, -1);
});

test("arsip 25 Oktober: TP/SL utuh, expired terbelah, invalid keluar", () => {
  const book = summarizeArchive(SEALED_ROWS);
  assert.equal(book.counts.TP, 37);
  assert.equal(book.counts.SL, 219);
  assert.equal(book.counts.BUSUK, 175);
  assert.equal(book.counts.CACAT_LIMIT, 51);
  assert.equal(book.counts.EXPIRED_TTL, 62);
  assert.equal(book.counts.UNVERIFIABLE, 33);
  assert.equal(book.counts.UNPARSEABLE, 2);
  assert.equal(book.counts.PENDING, 100);
  assert.ok(book.crypto.mean != null && book.crypto.mean < 0);
  assert.equal(book.crypto.wins, 0);
  assert.ok(book.tn.ideas < 150);
  assert.ok(book.tn.weeks < 5);
  assert.equal(book.crypto.ci, null);
  assert.equal(book.tn.ci, null);
});
