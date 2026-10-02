// Release check for Pediatric ER Companion — run before every push:
//   node tests/check.mjs            (checks index.html)
//   node tests/check.mjs preview    (checks preview.html)
// No dependencies. Recomputes key doses and volumes with the app's own dose code, checks that
// drug-library doses match the protocols, and that version numbers are in sync. Exit 1 on failure.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const page = process.argv[2] === "preview" ? "preview.html" : "index.html";
const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const cut = (a, b) => { const i = js.indexOf(a); if (i < 0) throw new Error("missing " + a); return js.slice(i, js.indexOf(b, i)); };
const ctx = { W: null };
vm.createContext(ctx);
vm.runInContext(
  cut("const P = [", "const groupOf").replace(/(^|\n)const /g, "$1var ") +
  cut("function f(n)", "function esc(") + cut("function doseCalc", "function doseHTML") +
  cut("function doseNums", "function useHTML") + "\nthis.out={P,DRUGS,SCORES,G,KW,REFS};", ctx);
const { P, DRUGS, SCORES, G, KW, REFS } = ctx.out;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("FAIL  " + msg); } };
const prot = id => P.find(p => p.id === id), drug = id => DRUGS.find(d => d.id === id);
const items = p => p.phases.flatMap(ph => ph.items);
const dose = (it, w) => { ctx.W = w; return vm.runInContext("doseCalc", ctx)(it).calc; };
const vols = (d, u, w) => { ctx.W = w; const [a, b] = vm.runInContext("doseNums", ctx)(u);
  const keys = u.f ? [].concat(u.f) : Object.keys(d.forms || {});
  return keys.map(k => d.forms[k]).filter(fm => fm && fm.u === u.u).map(fm => ctx.f(a / fm.c) + (b && b !== a ? "–" + ctx.f(b / fm.c) : "") + " ml"); };

// 1. Golden doses (12 kg unless stated) — change only with a deliberate, reviewed dose change.
const golden = [
  ["resus", "Adrenaline 0.1 mg/ml", 12, "0.12 mg = 1.2 ml"],
  ["ana", "Adrenaline 1 mg/ml", 12, "0.12 mg = 0.12 ml"],
  ["ana", "Adrenaline 1 mg/ml", 60, "0.5 mg = 0.5 ml"],
  ["se", "Lorazepam", 12, "1.2 mg"],
  ["se", "Levetiracetam", 12, "480–720 mg"],
  ["dka", "Regular insulin infusion", 20, "1–2 U/h"],
  ["svt", "Adenosine 1st dose", 12, "1.2 mg"],
  ["hyperk", "Calcium gluconate 10%", 12, "6 ml"],
  ["brady", "Atropine", 12, "0.24 mg"],
  ["pcm", "NAC bag 1", 12, "1,800 mg"],
  ["na", "3% saline", 12, "24 ml"],
  ["mening", "Dexamethasone", 12, "1.8 mg"],
];
for (const [pid, name, w, want] of golden) {
  const it = items(prot(pid)).find(i => i.d && i.d.startsWith(name));
  ok(it, `${pid}: no item "${name}"`); if (it) ok(dose(it, w) === want, `${pid} ${name} @${w} kg = "${dose(it, w)}", expected "${want}"`);
}
const gv = [["adr", 0, 12, ["1.2 ml"]], ["adr", 1, 12, ["0.12 ml"]], ["mdz", 0, 12, ["0.48 ml", "2.4 ml"]],
            ["bicarb", 0, 12, ["12 ml", "13.3 ml"]], ["mann", 0, 12, ["30–60 ml"]], ["pcm", 0, 12, ["7.5 ml", "3.6 ml"]]];
for (const [id, ui, w, want] of gv) { const got = vols(drug(id), drug(id).uses[ui], w);
  ok(JSON.stringify(got) === JSON.stringify(want), `${id} use ${ui} volumes @${w} kg = ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); }
ctx.W = 12; ok(ctx.hs(12) === 44, "maintenance 12 kg should be 44 ml/h");

// 2. Data integrity
for (const p of P) { ok(KW[p.id], `protocol ${p.id} has no keywords`); ok(REFS[p.id] && REFS[p.id].length, `protocol ${p.id} has no references`);
  ok(G.some(g => g.ids.includes(p.id)), `protocol ${p.id} is in no group`); }
for (const d of DRUGS) { for (const id of d.p || []) ok(prot(id), `drug ${d.id} links missing protocol ${id}`);
  for (const u of d.uses) for (const k of [].concat(u.f || [])) ok(d.forms && d.forms[k] && d.forms[k].u === u.u, `drug ${d.id}: form ${k} missing or unit ≠ ${u.u}`); }
for (const s of SCORES) ok(s.calc || (s.items && s.res), `score ${s.id} incomplete`);

// 3. Library doses match protocol doses (same drug name, same per/unit/max/min). Bicarbonate is
//    written as ml of 8.4% in protocols and mEq in the library (1 mEq = 1 ml), so units are normalised.
const key = it => JSON.stringify([it.per, it.u === "mEq" ? "ml" : it.u, it.max || null, it.min || null]);
for (const d of DRUGS) { const nm = d.n.toLowerCase();
  for (const pid of d.p || []) for (const it of items(prot(pid) || { phases: [] })) {
    if (!it.d || it.per == null) continue; const dn = it.d.toLowerCase();
    if (!(dn === nm || dn.startsWith(nm + " ") || dn.startsWith(nm + "(") || (nm.split(" ")[0].length > 4 && dn.split(" ")[0] === nm.split(" ")[0] && !/polystyrene|gluconate/.test(nm + dn) ))) continue;
    ok(d.uses.some(u => u.per != null && key(u) === key(it)), `${d.n} in "${prot(pid).name}" (${key(it)}) has no matching library dose`); } }

// 4. Versions in sync (index/preview text, about.html badge, sw.js cache)
const vers = [...new Set([...html.matchAll(/v(\d+\.\d+\.\d+)/g)].map(m => m[1]))];
ok(vers.length === 1, `${page} has several versions: ${vers}`);
if (page === "index.html") {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8").match(/perc-v(\d+\.\d+\.\d+)/)[1];
  const ab = readFileSync(new URL("../about.html", import.meta.url), "utf8").match(/class="ver">v(\d+\.\d+\.\d+)/)[1];
  ok(sw === vers[0], `sw.js cache v${sw} ≠ index v${vers[0]}`); ok(ab === vers[0], `about.html v${ab} ≠ index v${vers[0]}`);
  ok(!/const PREVIEW = true/.test(html) && !/class="pvbanner"/.test(html) && !/name="robots"/.test(html), "index.html still has preview markers");
}
console.log(fails ? `\n${fails} check(s) FAILED in ${page}` : `All checks passed for ${page} — ${P.length} protocols, ${DRUGS.length} drugs, ${SCORES.length} scores, v${vers[0]}`);
process.exit(fails ? 1 : 0);
