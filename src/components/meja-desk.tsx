import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, ShieldOff } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auditCard } from "@/lib/meja/audit";
import {
  DROPPED,
  H1,
  H1_HASH,
  KEPT,
  PROTOCOL,
  VONIS,
  journalPermission,
  resultDay,
  summarizeArchive,
  type BookSide,
  type FreshResult,
  type Idea,
} from "@/lib/meja/engine";
import { SEALED_ROWS } from "@/lib/meja/sealed";

const FILTERS: { id: FreshResult | "ALL"; label: string }[] = [
  { id: "BUSUK", label: "Busuk" },
  { id: "UNVERIFIABLE", label: "Tak terukur" },
  { id: "UNPARSEABLE", label: "Simbol kosong" },
  { id: "CACAT_LIMIT", label: "Cacat limit" },
  { id: "TP", label: "TP" },
  { id: "SL", label: "SL" },
  { id: "ALL", label: "Semua" },
];

const RESULT_LABEL: Record<string, string> = {
  BUSUK: "Busuk",
  CACAT_LIMIT: "Cacat limit",
  EXPIRED_TTL: "Lewat waktu",
  UNVERIFIABLE: "Tak terukur",
  UNPARSEABLE: "Simbol kosong",
  TP: "TP",
  SL: "SL",
  PENDING: "Menunggu",
  AMBIGUOUS: "Ambigu",
  OTHER: "Lain",
};

function rFmt(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits })}R`;
}

function pctFmt(value: number | null) {
  if (value == null) return "—";
  return `${(value * 100).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function pxFmt(value: number | null) {
  if (value == null) return "—";
  if (value >= 100) return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}

function wib(value: string | number | null) {
  if (value == null || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)} WIB`;
}

function hoursBefore(analysisUtc: string, prehitMs: number | null) {
  if (prehitMs == null) return null;
  return (Date.parse(analysisUtc) - prehitMs) / 3600_000;
}

function BookCard({
  title,
  side,
  ideas,
  tone,
  note,
}: {
  title: string;
  side: BookSide;
  ideas: Idea[];
  tone: "loss" | "noise";
  note?: string;
}) {
  const long = ideas.filter((idea) => idea.direction === "LONG");
  const short = ideas.filter((idea) => idea.direction === "SHORT");
  const sum = (list: Idea[]) => list.reduce((total, idea) => total + idea.netR, 0);
  return (
    <article className="rounded-card border border-line bg-surface p-4">
      <h3 className="text-2xl">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted">Ide / yang di atas nol</dt><dd className="tabular-nums">{side.ideas} / {side.wins}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Kartu TP / SL</dt><dd className="tabular-nums">{side.tp} / {side.sl}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Porsi ide di atas nol</dt><dd className="tabular-nums">{pctFmt(side.winRate)}</dd></div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Rata bersih</dt>
          <dd className={`tabular-nums ${tone === "loss" ? "text-seal" : "text-amber"}`}>{rFmt(side.mean)}</dd>
        </div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Total bersih</dt><dd className="tabular-nums">{rFmt(side.net)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Drawdown</dt><dd className="tabular-nums">{rFmt(side.maxDD)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Minggu</dt><dd className="tabular-nums">{side.weeks}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Long {long.length} ide, {rFmt(sum(long))}. Short {short.length} ide, {rFmt(sum(short))}. Arah ini deskriptif. Sel yang hijau tidak mematikan sisi yang lain.
      </p>
      {note && <p className="mt-2 text-xs text-amber">{note}</p>}
    </article>
  );
}

export function Desk() {
  const book = useMemo(() => summarizeArchive(SEALED_ROWS), []);
  const gate = journalPermission(0, 0, null, 0, false);
  const [filter, setFilter] = useState<FreshResult | "ALL">("BUSUK");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(8);
  const [equity, setEquity] = useState("1000");
  const [symbol, setSymbol] = useState("SANDUSDT");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("0.0438");
  const [tp, setTp] = useState("0.048397");
  const [sl, setSl] = useState("0.041501");
  const [analysisUtc, setAnalysisUtc] = useState("2026-10-04T11:08:59.056Z");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [checked, setChecked] = useState<Awaited<ReturnType<typeof auditCard>> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("meja-equity");
    if (saved) setEquity(saved);
  }, []);

  const rows = book.classified.filter((row) => {
    if (filter !== "ALL" && row.result !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${row.ticker} ${row.symbol}`.toLowerCase().includes(q);
  });

  const pile = resultDay(book.classified, "crypto", "2026-10-18");
  const pileBaskets = useMemo(() => {
    const cards = book.classified.filter(
      (row) => row.engine === "crypto" && row.resultUtc.slice(0, 10) === "2026-10-18" && (row.result === "TP" || row.result === "SL"),
    );
    const groups = new Map<string, typeof cards>();
    for (const card of cards) {
      const key = `${card.analysisUtc.slice(0, 10)} ${card.direction}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(card);
      else groups.set(key, [card]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, bucket]) => ({
        key,
        n: bucket.length,
        grossR: bucket.reduce((sum, card) => sum + (card.grossR ?? 0), 0) / bucket.length,
      }));
  }, [book.classified]);

  const chart = useMemo(() => {
    const days = [...new Set(book.ideas.map((idea) => idea.day))].sort();
    let crypto = 0;
    let tn = 0;
    return days.map((day) => {
      crypto += book.ideas.filter((idea) => idea.engine === "crypto" && idea.day === day).reduce((sum, idea) => sum + idea.netR, 0);
      tn += book.ideas.filter((idea) => idea.engine === "tn" && idea.day === day).reduce((sum, idea) => sum + idea.netR, 0);
      return { day: day.slice(5), crypto, tn };
    });
  }, [book.ideas]);

  const equityN = Number(equity.replace(",", ".")) || 0;
  const perIdea = equityN * PROTOCOL.riskUntilGate;
  const oldBurn = equityN * 0.01 * pile.cards;

  async function onCheck() {
    setChecking(true);
    setCheckError("");
    setChecked(null);
    try {
      const result = await auditCard({
        data: {
          symbol,
          direction,
          entry: Number(entry),
          tp: Number(tp),
          sl: Number(sl),
          analysisUtc,
        },
      });
      setChecked(result);
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : "Pemeriksaan gagal.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs font-medium tracking-[0.18em] text-amber uppercase">Epoch {PROTOCOL.id}</p>
            <h1 className="mt-1 text-4xl text-fg sm:text-5xl">Meja</h1>
            <p className="mt-2 max-w-xl text-base text-muted">Satu mesin dari empat yang lama. Bukan sinyal kelima. Yang dikeluarkan hanya izin, dan izinnya tertutup.</p>
          </div>
          <div className="flex items-center gap-3 rounded-card border border-seal bg-surface px-4 py-3">
            <LockKeyhole className="size-5 text-seal" aria-hidden="true" />
            <div>
              <p className="font-serif text-lg text-seal">Uang dikunci</p>
              <p className="text-sm text-muted">{gate.label}</p>
            </div>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Bagian">
          {[
            ["vonis", "Vonis"],
            ["koreksi", "Koreksi"],
            ["buku", "Buku"],
            ["arsip", "Diambil"],
            ["protokol", "Protokol"],
            ["github", "GitHub"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-fg">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section id="vonis" className="scroll-mt-6 py-8">
        <h2 className="text-3xl">Vonis yang sudah ada</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Angka ini dari laporan 25 Oktober, kohort independen. Tidak digabung dengan kartu 100% dan tidak dipilih dari sel yang kebetulan hijau.
        </p>
        <div className="mt-4 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Mesin</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Angka yang sah</th>
              </tr>
            </thead>
            <tbody>
              {VONIS.map((row) => (
                <tr key={row.engine} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{row.engine}</td>
                  <td className="px-4 py-3 text-seal">{row.status}</td>
                  <td className="px-4 py-3 text-muted">{row.figure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden="true" />
          Keduanya yang terukur tidak hampir untung. DeepSeek dan TN satu garis keturunan. Buku lama dan kartu 100% tidak boleh digabung.
        </p>
      </section>

      <section id="koreksi" className="scroll-mt-6 border-t border-line py-8">
        <h2 className="text-3xl">Koreksi 25 Oktober</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          TP dan SL tidak disentuh. Yang salah adalah kedaluwarsa — harga dan tanggal entry jatuh sesudah TP sudah tercetak — dan baris invalid yang tidak pernah dievaluasi.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-card border border-line bg-surface p-4">
            <p className="text-xs tracking-wide text-muted uppercase">Expired yang busuk</p>
            <p className="mt-1 font-serif text-4xl tabular-nums text-seal">{book.counts.BUSUK}</p>
            <p className="mt-2 text-sm text-muted">dari 288 kedaluwarsa. TP sudah tercetak dalam 72 jam sebelum jam entry. Median sekitar 62 jam.</p>
          </article>
          <article className="rounded-card border border-line bg-surface p-4">
            <p className="text-xs tracking-wide text-muted uppercase">Keluar dari hasil</p>
            <p className="mt-1 font-serif text-4xl tabular-nums text-amber">{book.counts.UNVERIFIABLE + book.counts.UNPARSEABLE}</p>
            <p className="mt-2 text-sm text-muted">{book.counts.UNVERIFIABLE} pra-pelacakan, waktu tidak diketahui. {book.counts.UNPARSEABLE} simbol kosong. Bukan INVALID.</p>
          </article>
          <article className="rounded-card border border-line bg-surface p-4">
            <p className="text-xs tracking-wide text-muted uppercase">TP dan SL</p>
            <p className="mt-1 font-serif text-4xl tabular-nums text-paper">{book.counts.TP} / {book.counts.SL}</p>
            <p className="mt-2 text-sm text-muted">Tidak diubah. Sisanya: {book.counts.CACAT_LIMIT} cacat limit, {book.counts.EXPIRED_TTL} lewat waktu, {book.counts.PENDING} menunggu.</p>
          </article>
        </div>

        <div className="mt-4 rounded-card border border-line bg-raised p-4">
          <h3 className="text-xl">18 Oktober, crypto</h3>
          <p className="mt-2 text-sm text-muted">
            {pile.cards} kartu selesai hari itu, {rFmt(pile.grossR, 0)} kalau tiap kartu dihitung 1R. Pada ekuitas di bawah, risiko lama 1% per kartu menghabiskan{" "}
            <span className="tabular-nums text-fg">{oldBurn.toLocaleString("id-ID", { maximumFractionDigits: 0 })} USDT</span>.
            Keranjang di bawah berbagi satu R tiap hari dan tiap arah, bukan satu R tiap kartu.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {pileBaskets.map((basket) => (
              <li key={basket.key} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span>{basket.key}</span>
                <span className="tabular-nums text-muted">{basket.n} kartu · ide {rFmt(basket.grossR, 1)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={`min-h-11 rounded-full border px-4 text-sm ${filter === item.id ? "border-paper bg-paper text-bg" : "border-line bg-surface text-fg"}`}
              onClick={() => {
                setFilter(item.id);
                setShown(8);
              }}
            >
              {item.label}
            </button>
          ))}
          <label className="sr-only" htmlFor="cari">Cari koin</label>
          <input
            id="cari"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(8);
            }}
            placeholder="Cari koin"
            className="min-h-11 min-w-36 rounded-full border border-line bg-surface px-4 text-sm text-fg"
          />
        </div>
        <div className="mt-3 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Mesin</th>
                <th className="px-3 py-3 font-medium">Koin</th>
                <th className="px-3 py-3 font-medium">Arah</th>
                <th className="px-3 py-3 font-medium">Entry</th>
                <th className="px-3 py-3 font-medium">TP</th>
                <th className="px-3 py-3 font-medium">Hasil</th>
                <th className="px-3 py-3 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((row) => {
                const hours = hoursBefore(row.analysisUtc, row.prehitMs);
                return (
                  <tr key={row.id} className="border-t border-line align-top">
                    <td className="px-3 py-3">{row.engine === "crypto" ? "Crypto" : "TN"}</td>
                    <td className="px-3 py-3">{row.ticker || "—"}</td>
                    <td className="px-3 py-3">{row.direction}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {pxFmt(row.entry)}
                      <span className="block text-xs text-muted">{wib(row.analysisUtc)}</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {pxFmt(row.tp)}
                      {hours != null && <span className="block text-xs text-seal">TP {hours.toLocaleString("id-ID", { maximumFractionDigits: 0 })} jam lebih dulu</span>}
                    </td>
                    <td className="px-3 py-3">{RESULT_LABEL[row.result]}</td>
                    <td className="px-3 py-3 text-muted">{row.note}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-muted">Tidak ada baris.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {shown < rows.length && (
          <button type="button" className="mt-3 min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => setShown((value) => value + 12)}>
            Tampilkan lagi ({rows.length - shown} tersisa)
          </button>
        )}

        <form
          className="mt-6 rounded-card border border-line bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onCheck();
          }}
        >
          <h3 className="text-xl">Periksa satu kartu</h3>
          <p className="mt-1 text-sm text-muted">
            Contoh SAND sudah terisi: analisis 4 Oktober, TP-nya tercetak sebelumnya. Ini pemeriksaan, bukan order. Candle 1 jam; kalau TP dan SL satu candle, hasilnya ambigu.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted">
              Symbol
              <input value={symbol} onChange={(event) => setSymbol(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg" />
            </label>
            <label className="text-xs text-muted">
              Arah
              <select value={direction} onChange={(event) => setDirection(event.target.value === "SHORT" ? "SHORT" : "LONG")} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg">
                <option>LONG</option>
                <option>SHORT</option>
              </select>
            </label>
            <label className="text-xs text-muted">
              Waktu analisis (UTC)
              <input value={analysisUtc} onChange={(event) => setAnalysisUtc(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg" />
            </label>
            <label className="text-xs text-muted">
              Entry
              <input value={entry} onChange={(event) => setEntry(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg" />
            </label>
            <label className="text-xs text-muted">
              TP
              <input value={tp} onChange={(event) => setTp(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg" />
            </label>
            <label className="text-xs text-muted">
              SL
              <input value={sl} onChange={(event) => setSl(event.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg" />
            </label>
          </div>
          <button type="submit" disabled={checking} className="mt-3 min-h-11 rounded-full bg-paper px-5 text-sm font-medium text-bg disabled:opacity-60">
            {checking ? "Memeriksa…" : "Periksa"}
          </button>
          {checkError && <p className="mt-3 text-sm text-seal">{checkError}</p>}
          {checked && (
            <p className="mt-3 text-sm">
              <span className="text-paper">{RESULT_LABEL[checked.result] ?? checked.result}.</span>{" "}
              <span className="text-muted">{checked.note}</span>
              {checked.at != null && <span className="mt-1 block text-muted">Jam harga: {wib(checked.at)}. Candle dipakai: {checked.candles}.</span>}
            </p>
          )}
        </form>
      </section>

      <section id="buku" className="scroll-mt-6 border-t border-line py-8">
        <h2 className="text-3xl">Buku ide, setelah biaya</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Satu tiket per simbol per 24 jam. Sinyal searah pada hari terbit yang sama berbagi 1R. Biaya 0,15% dari harga entry, dibagi jarak stop. Ini uji kepekaan pada arsip, bukan jejak Meja dan bukan angka izin. Meja punya 0 isi. Interval mingguan tidak diterbitkan: minggu independen masih di bawah lima.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BookCard title="Crypto" side={book.crypto} ideas={book.ideas.filter((idea) => idea.engine === "crypto")} tone="loss" />
          <BookCard
            title="TN"
            side={book.tn}
            ideas={book.ideas.filter((idea) => idea.engine === "tn")}
            tone="noise"
            note="Titik tengah tipis di atas nol pada tiga minggu bukan edge. Vonis resmi kohort kartu tetap −18R. Gerbang tidak membukanya."
          />
        </div>
        <div className="mt-4 h-64 rounded-card border border-line bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={36} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", color: "var(--color-fg)" }} />
              <Line type="monotone" dataKey="crypto" name="Crypto" stroke="var(--color-seal)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="tn" name="TN" stroke="var(--color-amber)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted">Kurva kumulatif R bersih per hari terbit. Merah crypto, kuning TN. Bukan izin.</p>

        <label className="mt-5 block max-w-xs text-xs text-muted">
          Ekuitas contoh, USDT
          <input
            value={equity}
            inputMode="decimal"
            onChange={(event) => {
              setEquity(event.target.value);
              localStorage.setItem("meja-equity", event.target.value);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg"
          />
        </label>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Sampai gerbang lulus, risiko yang tertulis adalah 0,25% per ide (
          <span className="tabular-nums text-fg">{perIdea.toLocaleString("id-ID", { maximumFractionDigits: 2 })} USDT</span>
          ). Izin hari ini 0. Setelah lulus, paling besar 0,5%. Minggu yang ≤ −4R membuat mesin flat sampai Senin.
        </p>
      </section>

      <section id="arsip" className="scroll-mt-6 border-t border-line py-8">
        <h2 className="text-3xl">Yang diwarisi, yang dibuang</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xl text-paper">Diambil</h3>
            <ul className="mt-3 space-y-3">
              {KEPT.map((item) => (
                <li key={item.name} className="rounded-card border border-line bg-surface p-3">
                  <p className="text-xs text-muted">{item.from}</p>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.why}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl text-seal">Dibuang</h3>
            <ul className="mt-3 space-y-3">
              {DROPPED.map((item) => (
                <li key={item.name} className="rounded-card border border-line bg-surface p-3">
                  <p className="text-xs text-muted">{item.from}</p>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.why}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="protokol" className="scroll-mt-6 border-t border-line py-8">
        <h2 className="text-3xl">Uji yang boleh dibuka</h2>
        <p className="mt-2 text-sm text-amber">{H1.id} · hash {H1_HASH} · {H1.fills} isi · arsip tidak dibawa</p>
        <blockquote className="mt-4 max-w-3xl border-l-2 border-paper pl-4 font-serif text-xl leading-snug">{H1.text}</blockquote>
        <p className="mt-4 max-w-3xl text-sm text-muted">
          Didaftarkan {wib(H1.registeredAt)}, sebelum hasil uji ini ada. Mengubah kalimat itu atau kode gerbang berarti protokol lain. Baris di atas tidak ikut pindah.
        </p>
      </section>

      <section id="github" className="scroll-mt-6 border-t border-line py-8">
        <h2 className="text-3xl">Jalurnya GitHub, bukan laptop</h2>
        <ol className="mt-4 max-w-3xl list-decimal space-y-3 pl-5 text-sm text-muted">
          <li>Unggah repo ini. Tidak ada secret dan tidak ada proses yang harus hidup di komputer sendiri.</li>
          <li>Di situs GitHub: Actions → Meja → Run workflow. Itu pemeriksaan yang sama dengan meja ini.</li>
          <li>
            Kartu baru ditambah lewat editor web, file <span className="text-fg">data/inbox.json</span>. Satu objek: symbol, direction, entry, tp, sl, analysisUtc. Commit, lalu jalankan workflow lagi.
          </li>
          <li>Laporan ada di artefak run. Jurnal kosong tetap ditolak. Workflow tidak memasang order.</li>
        </ol>
        <p className="mt-4 text-xs text-muted">Bukan saran keuangan. Hasil arsip teoretis dari candle, bukan rekening yang sudah berdagang.</p>
      </section>
    </main>
  );
}
