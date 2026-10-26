import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { d as walkLimit, s as costR } from "./engine-binLXLmb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/audit-3jOVYbgp.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var HOSTS = [
	"https://data-api.binance.vision",
	"https://api.binance.com",
	"https://api1.binance.com"
];
async function klines(symbol, start, end) {
	let last = "jaringan";
	for (const host of HOSTS) try {
		const url = `${host}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&startTime=${start}&endTime=${end}&limit=1000`;
		const res = await fetch(url, { signal: AbortSignal.timeout(12e3) });
		if (!res.ok) {
			last = String(res.status);
			continue;
		}
		const data = await res.json();
		if (!Array.isArray(data)) {
			last = "bukan daftar";
			continue;
		}
		return data.map((row) => {
			const k = row;
			return {
				t: Number(k[0]),
				h: Number(k[2]),
				l: Number(k[3])
			};
		});
	} catch (error) {
		last = error instanceof Error ? error.message : "jaringan";
	}
	throw new Error(`Harga tidak tersedia (${last}).`);
}
var auditCard_createServerFn_handler = createServerRpc({
	id: "2232c2004170b78498c258640217e050359b8ae445fd25717572cb3f0a1dd251",
	name: "auditCard",
	filename: "src/lib/meja/audit.ts"
}, (opts) => auditCard.__executeServer(opts));
var auditCard = createServerFn({ method: "GET" }).validator((input) => {
	const symbol = String(input.symbol ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
	if (!/^[A-Z0-9]{6,20}$/.test(symbol) || !symbol.endsWith("USDT")) throw new Error("Symbol harus pasangan USDT, contoh SANDUSDT.");
	const direction = input.direction === "SHORT" ? "SHORT" : "LONG";
	const entry = Number(input.entry);
	const tp = Number(input.tp);
	const sl = Number(input.sl);
	if (![
		entry,
		tp,
		sl
	].every((n) => Number.isFinite(n) && n > 0)) throw new Error("Entry, TP, dan SL harus angka di atas nol.");
	const analysisMs = Date.parse(String(input.analysisUtc ?? ""));
	if (Number.isNaN(analysisMs)) throw new Error("Waktu analisis tidak valid.");
	if (analysisMs > Date.now() + 36e5) throw new Error("Waktu analisis ada di masa depan.");
	if (Date.now() - analysisMs > 10368e6) throw new Error("Paling lama 120 hari ke belakang.");
	return {
		symbol,
		direction,
		entry,
		tp,
		sl,
		analysisMs
	};
}).handler(auditCard_createServerFn_handler, async ({ data }) => {
	const start = data.analysisMs - 2592e5;
	const end = Math.min(Date.now(), data.analysisMs + 18144e5);
	const candles = await klines(data.symbol, start, end);
	const walk = walkLimit({
		...data,
		now: Date.now(),
		candles
	});
	const fee = walk.grossR == null ? null : costR(data.entry, data.sl);
	return {
		result: walk.result,
		at: walk.at,
		note: walk.note,
		grossR: walk.grossR,
		costR: fee,
		netR: walk.grossR == null || fee == null ? walk.grossR : walk.grossR - fee,
		candles: candles.length,
		checkedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
});
//#endregion
export { auditCard_createServerFn_handler };
