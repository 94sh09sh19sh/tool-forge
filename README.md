# tool-forge

Claude Code skill：把「說出痛點 → 做出新工具」變成固定流程。先獨立想解法，再到 GitHub 找 ≥1000 星、有授權、能完整解決的現成方案；找不到就吸收所有相關方案的優點自己做，建 repo 並推上 GitHub。

## 流程
1. 釘死痛點：一句話＋可驗證的必要需求 R1…Rn。
2. 獨立解法：搜尋前先寫好，避免被現成方案帶著走。
3. 偵查：先看自己既有的工具能不能擴充；再用 `scout.js` 多組關鍵字搜 GitHub、查 awesome 清單；切題的候選用 `--vet` 看授權檔與熱門未解 issue，逐條核對 R。
4. 判斷：≥1000 星＋授權可用＋未封存＋R 全部有證據滿足＋能在本機環境跑，才採用；否則自建。
5. 吸收優點：≥1000 與 <1000 星的方案都列優點與取捨；熱門未解 issue 當作要補的缺口；程式碼只從寬鬆授權搬，並保留聲明。
6. 用 toolkeeper `new` 建 repo → 測試 → `deploy` 試用 → `check` → commit → `gh repo create --public --push`。
7. 條列回報。

## scout.js
- `node scout.js "<關鍵字1>" "<關鍵字2>" … [--min 1000] [--limit 15] [--json]`
  - 每組關鍵字各用「星數排序」與「相關度排序」搜一次，前者抓熱門、後者抓星數少但切題的。
  - 去重後分三組：可直接採用候選（≥門檻星數、授權可用、未封存、不是 fork）、≥門檻但不能直接採用、<門檻。
  - 標示：已封存、fork、兩年沒更新、授權待查、無授權（只能參考）、copyleft（搬程式碼需同授權）、被幾組關鍵字命中。
- `node scout.js --vet <owner/repo> …`：授權 SPDX 與 LICENSE 檔、最後推送、未關 issue 數、頂層檔案、最多人按讚的 5 個未解 issue。
- 需要已登入的 `gh`。GitHub 搜尋 API 每分鐘 30 次，每組關鍵字用 2 次。

## 安裝
- 把 `SKILL.md`、`scout.js` 放到 `~/.claude/skills/tool-forge/`。
- 第 6 步用到 [toolkeeper](https://github.com/94sh09sh19sh/toolkeeper)；沒有的話照自己的方式建 repo 即可。

## 現成方案比較
2026-10 用本工具自己的流程查過；沒有 ≥1000 星的方案能完整解決，所以自建。

- [Emanuelel/dont-reinvent](https://github.com/Emanuelel/dont-reinvent)（39 星、MIT）：開源／自建／付費三選一的判斷。
  - 吸收：自己核對授權與品質、不把檢查丟回給使用者；無授權的 repo 只能參考不能當依賴；排名要寫出第二名為什麼輸；回報分「已驗證／未驗證」。
  - 不採用：強制先接兩個 MCP 連接器；付費方案比較（這裡只看開源）。
- [gaupoit/programming-advisor](https://github.com/gaupoit/programming-advisor)（14 星、MIT）：寫程式前先找現成方案。
  - 吸收：先抓出需求本質與限制；自建時拿現成程式當參考、子功能仍可用現成套件。
  - 不採用：token 成本估算表（數字不可靠）。
- [lilyco-42/lyco-skill](https://github.com/lilyco-42/lyco-skill)（12 星、MIT）：用 gh 近義詞搜尋做開工前調查。
  - 吸收：近義詞擴充（中英、上下位詞、社群叫法）；「連續兩輪沒新結果就停」的停止條件；自建時寫明是哪條限制逼出來的；簡短回報。
  - 不採用：「涵蓋 80% 就採用」——這裡要求完整解決；論壇調查與 SDLC 全流程（超出範圍）。
- 自己補上的：搜尋前先寫獨立解法（防止定錨）；可驗證的 R 清單，逐條附證據才算「完整」；先檢查自己既有工具能否擴充；`scout.js` 把星數、授權、維護狀態的篩選變成固定規則；熱門未解 issue 當作設計缺口；直接接到建 repo 與發布。

## 設定
- 門檻星數用 `--min` 調整，預設 1000。
