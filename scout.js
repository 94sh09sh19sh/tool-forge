#!/usr/bin/env node
// tool-forge 的 GitHub 偵查：多組關鍵字搜尋 repo、依星數與授權分組，或深入檢查指定 repo
// 用法：node scout.js <關鍵字> [<關鍵字>...] [--min 1000] [--limit 15] [--json]
//       node scout.js --vet <owner/repo> [<owner/repo>...]
'use strict';
const { spawnSync } = require('child_process');

const PERMISSIVE = new Set(['mit', 'mit-0', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense', '0bsd', 'cc0-1.0', 'zlib', 'bsl-1.0', 'artistic-2.0', 'wtfpl', 'postgresql', 'ncsa', 'upl-1.0']);
const COPYLEFT = new Set(['gpl-2.0', 'gpl-3.0', 'agpl-3.0', 'lgpl-2.1', 'lgpl-3.0', 'mpl-2.0', 'epl-1.0', 'epl-2.0', 'eupl-1.2', 'cc-by-sa-4.0', 'osl-3.0']);
const STALE_DAYS = 730;
const FIELDS = 'fullName,stargazersCount,license,pushedAt,isArchived,isFork,description,url';

// 授權分類：ok＝寬鬆授權；copyleft＝可用，但搬程式碼進來要跟著同授權；check＝要讀 LICENSE 才知道；none＝沒有授權，只能參考想法
function licenseClass(key) {
  const k = (key || '').toLowerCase();
  if (!k) return 'none';
  if (PERMISSIVE.has(k)) return 'ok';
  if (COPYLEFT.has(k)) return 'copyleft';
  return 'check';
}

const LICENSE_NOTE = { ok: '', copyleft: '搬程式碼需同授權', check: '授權待查', none: '無授權：只能參考' };

function flags(r, now = Date.now()) {
  const out = [];
  if (r.isArchived) out.push('已封存');
  if (r.isFork) out.push('fork');
  if (r.pushedAt && now - Date.parse(r.pushedAt) > STALE_DAYS * 86400000) out.push('兩年沒更新');
  const note = LICENSE_NOTE[licenseClass(r.license?.key)];
  if (note) out.push(note);
  return out;
}

// 星數夠、授權可用、還在維護：才算「可直接採用」的候選，其餘只拿來吸收優點
function adoptable(r, min) {
  const lc = licenseClass(r.license?.key);
  return r.stargazersCount >= min && (lc === 'ok' || lc === 'copyleft') && !r.isArchived && !r.isFork;
}

// 多組搜尋結果去重，記下每個 repo 被哪些關鍵字找到
function merge(batches) {
  const map = new Map();
  for (const { query, items } of batches) {
    for (const r of items) {
      const cur = map.get(r.fullName) || { ...r, hits: [] };
      if (!cur.hits.includes(query)) cur.hits.push(query);
      map.set(r.fullName, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.stargazersCount - a.stargazersCount);
}

const kStars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function line(r, now) {
  const f = flags(r, now);
  const desc = (r.description || '').replace(/\s+/g, ' ').slice(0, 70);
  return `${kStars(r.stargazersCount)}｜${r.fullName}｜${r.license?.key || '無'}｜${(r.pushedAt || '').slice(0, 7)}${f.length ? `｜${f.join('、')}` : ''}｜命中 ${r.hits.length}｜${desc}`;
}

function render(repos, min, now = Date.now()) {
  const groups = [
    [`可直接採用候選（≥${min} 星、授權可用、維護中）`, repos.filter((r) => adoptable(r, min))],
    [`≥${min} 星但不能直接採用`, repos.filter((r) => r.stargazersCount >= min && !adoptable(r, min))],
    [`<${min} 星（只吸收優點）`, repos.filter((r) => r.stargazersCount < min)],
  ];
  const out = [];
  for (const [title, list] of groups) {
    out.push(`## ${title}：${list.length}`);
    for (const r of list) out.push(line(r, now));
  }
  return out.join('\n');
}

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error) throw new Error(`找不到 gh：${r.error.message}`);
  if (r.status !== 0) throw new Error((r.stderr || '').trim() || `gh 結束碼 ${r.status}`);
  return r.stdout;
}

function search(queries, limit) {
  const batches = [];
  for (const q of queries) {
    // 依星數抓熱門的，依相關度抓星數少但切題的
    for (const sort of [['--sort', 'stars'], []]) {
      try {
        batches.push({ query: q, items: JSON.parse(gh(['search', 'repos', q, ...sort, '--limit', String(limit), '--json', FIELDS])) });
      } catch (e) {
        console.error(`搜尋「${q}」失敗：${e.message}`);
      }
    }
  }
  return merge(batches);
}

function vet(full) {
  const api = (p) => JSON.parse(gh(['api', p]));
  const repo = api(`repos/${full}`);
  let spdx = repo.license?.spdx_id || '無';
  let licenseFile = '';
  try {
    licenseFile = api(`repos/${full}/license`).path;
  } catch {}
  const top = api(`repos/${full}/contents`).map((f) => (f.type === 'dir' ? `${f.name}/` : f.name));
  const issues = api(`search/issues?q=${encodeURIComponent(`repo:${full} is:issue is:open`)}&sort=reactions&per_page=5`).items || [];
  const out = [
    `## ${full}`,
    `${kStars(repo.stargazers_count)} 星｜授權 ${spdx}（${licenseFile || '找不到 LICENSE 檔'}）｜最後推送 ${repo.pushed_at.slice(0, 10)}${repo.archived ? '｜已封存' : ''}｜未關 issue ${repo.open_issues_count}`,
    `頂層：${top.join(' ')}`,
  ];
  if (issues.length) out.push('最多人按讚的未解 issue（自建時要補的缺口）：', ...issues.map((i) => `- #${i.number} ${i.title}（👍 ${i.reactions?.['+1'] || 0}）`));
  return out.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const opt = { min: 1000, limit: 15, json: false, vet: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min') opt.min = Number(argv[++i]);
    else if (a === '--limit') opt.limit = Number(argv[++i]);
    else if (a === '--json') opt.json = true;
    else if (a === '--vet') opt.vet = true;
    else rest.push(a);
  }
  if (!rest.length) {
    console.log('用法：node scout.js <關鍵字> [<關鍵字>...] [--min 1000] [--limit 15] [--json]\n      node scout.js --vet <owner/repo> [<owner/repo>...]');
    process.exit(1);
  }
  if (opt.vet) {
    for (const full of rest) {
      try {
        console.log(vet(full));
      } catch (e) {
        console.log(`## ${full}\n檢查失敗：${e.message}`);
      }
    }
    return;
  }
  // GitHub 搜尋 API 每分鐘 30 次，每組關鍵字用 2 次
  if (rest.length > 14) console.error('關鍵字超過 14 組，可能撞到每分鐘搜尋上限');
  const repos = search(rest, opt.limit);
  console.log(opt.json ? JSON.stringify(repos, null, 2) : render(repos, opt.min));
}

if (require.main === module) main();
module.exports = { licenseClass, flags, adoptable, merge, render };
