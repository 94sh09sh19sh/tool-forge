// tool-forge 測試：授權分類、可採用判斷、去重合併、輸出分組
'use strict';
const assert = require('assert');
const S = require('./scout');

const NOW = Date.parse('2026-10-25T00:00:00Z');
const repo = (fullName, stars, key, extra = {}) => ({ fullName, stargazersCount: stars, license: key ? { key } : null, pushedAt: '2026-09-01T00:00:00Z', isArchived: false, isFork: false, description: '', ...extra });

assert.strictEqual(S.licenseClass('MIT'), 'ok');
assert.strictEqual(S.licenseClass('agpl-3.0'), 'copyleft');
assert.strictEqual(S.licenseClass('other'), 'check');
assert.strictEqual(S.licenseClass(''), 'none');
assert.strictEqual(S.licenseClass(undefined), 'none');

assert.ok(S.adoptable(repo('a/ok', 1000, 'mit'), 1000));
assert.ok(S.adoptable(repo('a/gpl', 5000, 'gpl-3.0'), 1000));
assert.ok(!S.adoptable(repo('a/few', 999, 'mit'), 1000));
assert.ok(!S.adoptable(repo('a/nolic', 9000, ''), 1000));
assert.ok(!S.adoptable(repo('a/other', 9000, 'other'), 1000));
assert.ok(!S.adoptable(repo('a/arch', 9000, 'mit', { isArchived: true }), 1000));
assert.ok(!S.adoptable(repo('a/fork', 9000, 'mit', { isFork: true }), 1000));

assert.deepStrictEqual(S.flags(repo('a/old', 10, 'mit', { pushedAt: '2024-01-01T00:00:00Z' }), NOW), ['兩年沒更新']);
assert.deepStrictEqual(S.flags(repo('a/x', 10, ''), NOW), ['無授權：只能參考']);

const merged = S.merge([
  { query: 'q1', items: [repo('a/one', 10, 'mit'), repo('a/two', 2000, 'mit')] },
  { query: 'q2', items: [repo('a/one', 10, 'mit')] },
  { query: 'q1', items: [repo('a/two', 2000, 'mit')] },
]);
assert.deepStrictEqual(merged.map((r) => r.fullName), ['a/two', 'a/one']);
assert.deepStrictEqual(merged[1].hits, ['q1', 'q2']);
assert.deepStrictEqual(merged[0].hits, ['q1']);

const out = S.render([...merged, { ...repo('a/nolic', 3000, ''), hits: ['q1'] }], 1000, NOW);
const sections = out.split('## ').filter(Boolean);
assert.match(sections[0], /可直接採用候選.*：1\n2\.0k｜a\/two/);
assert.match(sections[1], /不能直接採用：1\n3\.0k｜a\/nolic｜無｜2026-09｜無授權：只能參考｜命中 1/);
assert.match(sections[2], /<1000 星.*：1\n10｜a\/one｜mit｜2026-09｜命中 2/);

console.log('tool-forge 測試通過');
