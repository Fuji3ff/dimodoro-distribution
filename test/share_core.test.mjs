import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportEndpoint,
  buildShareRedirectTarget,
  classifyDevice,
  deriveCtaModel,
  deriveInstallState,
  deriveSummaryPresentation,
  isSupportedReportReason,
  normalizeReportResponse,
  normalizeSummaryPayload,
  resolveInitialLocale,
  resolveShareIdFromLocation,
} from '../docs/share/core.js';

test('resolveShareIdFromLocation は /share/{share_id} を優先する', () => {
  assert.equal(
    resolveShareIdFromLocation({
      pathname: '/share/rs_01JQ8VJ9WQYB2X7C6N5M4K3H2G',
      search: '',
    }),
    'rs_01JQ8VJ9WQYB2X7C6N5M4K3H2G'
  );
});

test('resolveShareIdFromLocation は query fallback を許可する', () => {
  assert.equal(
    resolveShareIdFromLocation({
      pathname: '/share/',
      search: '?share_id=rs_query_fallback',
    }),
    'rs_query_fallback'
  );
});

test('buildReportEndpoint は report API path を組み立てる', () => {
  assert.equal(
    buildReportEndpoint('https://api.dimodoro.app/', 'rs_report_01'),
    'https://api.dimodoro.app/routine-shares/rs_report_01/report'
  );
});

test('resolveShareIdFromLocation は不正エンコードでも white screen にせず query fallback を使える', () => {
  assert.equal(
    resolveShareIdFromLocation({
      pathname: '/share/%E0%A4%A',
      search: '?share_id=rs_query_fallback_after_invalid_path',
    }),
    'rs_query_fallback_after_invalid_path'
  );
});

test('buildShareRedirectTarget は GitHub Pages 配下でも /share/?share_id=... へ寄せる', () => {
  assert.equal(
    buildShareRedirectTarget({
      pathname: '/dimodoro-distribution/share/rs_redirect_target',
      search: '',
    }),
    '/dimodoro-distribution/share/?share_id=rs_redirect_target'
  );
});

test('buildShareRedirectTarget は不正エンコードの path を redirect 対象にしない', () => {
  assert.equal(
    buildShareRedirectTarget({
      pathname: '/dimodoro-distribution/share/%E0%A4%A',
      search: '',
    }),
    null
  );
});

test('normalizeSummaryPayload は required field を満たさない payload を reject する', () => {
  assert.equal(
    normalizeSummaryPayload({
      share_code: '7KQ9M2XZ',
      public_availability: 'available',
    }),
    null
  );
});

test('normalizeReportResponse は accepted payload を正規化する', () => {
  assert.deepEqual(
    normalizeReportResponse({
      status: 'accepted',
      source_status: 'active',
      reported_at: '2026-04-01T09:10:00Z',
      next_report_available_at: null,
    }),
    {
      status: 'accepted',
      sourceStatus: 'active',
      reportedAt: '2026-04-01T09:10:00Z',
      nextReportAvailableAt: null,
    }
  );
});

test('normalizeReportResponse は duplicate_report_suppressed payload を正規化する', () => {
  assert.deepEqual(
    normalizeReportResponse({
      status: 'duplicate_report_suppressed',
      source_status: 'stopped',
      reported_at: '2026-04-01T09:10:00Z',
      next_report_available_at: '2026-04-02T09:10:00Z',
    }),
    {
      status: 'duplicate_report_suppressed',
      sourceStatus: 'stopped',
      reportedAt: '2026-04-01T09:10:00Z',
      nextReportAvailableAt: '2026-04-02T09:10:00Z',
    }
  );
});

test('isSupportedReportReason は contract 定義済み reason のみを許可する', () => {
  assert.equal(isSupportedReportReason('dangerous_or_misleading'), true);
  assert.equal(isSupportedReportReason('free_text_is_not_allowed'), false);
});

test('normalizeSummaryPayload は valid unavailable payload を保持しつつ tags を 3 件へ制限する', () => {
  const payload = normalizeSummaryPayload({
    share_code: '7KQ9M2XZ',
    public_availability: 'unavailable',
    title: 'Night Focus Reset',
    tags: ['focus', 'evening', 'sleep', 'study'],
    benefits_sentence: '夜の集中準備を 25 分で整える routine です。',
    total_duration_sec: 1500,
    has_hue: true,
    time_hint: '夜に向く 25 分',
    step_summaries: [
      {
        step_number: 1,
        step_type: 'dimmer',
        title: 'Dim lights',
        duration_sec: null,
        summary_line: '画面減光を適用',
      },
    ],
  });

  assert.deepEqual(payload?.tags, ['focus', 'evening', 'sleep']);
  assert.equal(payload?.publicAvailability, 'unavailable');
  assert.equal(payload?.shareCode, '7KQ9M2XZ');
});

test('normalizeSummaryPayload は icon_key がなくても shell 表示に必要な payload を受け入れる', () => {
  const payload = normalizeSummaryPayload({
    share_code: '7KQ9M2XZ',
    public_availability: 'available',
    title: 'Night Focus Reset',
    benefits_sentence: '夜の集中準備を 25 分で整える routine です。',
    total_duration_sec: 1500,
    has_hue: false,
    time_hint: '夜に向く 25 分',
    tags: ['focus'],
    step_summaries: [],
  });

  assert.equal(payload?.title, 'Night Focus Reset');
  assert.equal(payload?.iconKey, '');
});

test('normalizeSummaryPayload は step required field 欠損を含む payload 全体を reject する', () => {
  assert.equal(
    normalizeSummaryPayload({
      share_code: '7KQ9M2XZ',
      public_availability: 'available',
      title: 'Night Focus Reset',
      icon_key: 'sparkles',
      tags: ['focus'],
      benefits_sentence: '夜の集中準備を 25 分で整える routine です。',
      total_duration_sec: 1500,
      has_hue: false,
      time_hint: '夜に向く 25 分',
      step_summaries: [
        {
          step_number: 1,
          step_type: 'dimmer',
          title: 'Dim lights',
          duration_sec: null,
          summary_line: '画面減光を適用',
        },
        {
          step_number: 2,
          step_type: 'timer',
          title: 'Missing summary',
          duration_sec: 300,
          summary_line: '',
        },
      ],
    }),
    null
  );
});

test('deriveSummaryPresentation は unavailable payload を残して banner 表示にする', () => {
  const payload = normalizeSummaryPayload({
    share_code: '7KQ9M2XZ',
    public_availability: 'unavailable',
    title: 'Night Focus Reset',
    icon_key: 'sparkles',
    tags: ['focus'],
    benefits_sentence: '夜の集中準備を 25 分で整える routine です。',
    total_duration_sec: 1500,
    has_hue: false,
    time_hint: '夜に向く 25 分',
    step_summaries: [],
  });

  assert.deepEqual(deriveSummaryPresentation({ status: 200, payload }), {
    kind: 'summary',
    availability: 'unavailable',
    hasPayload: true,
  });
});

test('deriveSummaryPresentation は 404 を payload なし unavailable shell にする', () => {
  assert.deepEqual(
    deriveSummaryPresentation({ status: 404, payload: null }),
    {
      kind: 'unavailable',
      availability: 'unavailable',
      hasPayload: false,
    }
  );
});

test('deriveInstallState は related apps supported かつ package 一致で installed と判定する', () => {
  assert.equal(
    deriveInstallState({
      relatedAppsSupported: true,
      relatedApps: [{ id: 'dev.dimodoro.app', platform: 'play' }],
    }),
    'installed'
  );
});

test('deriveInstallState は related apps supported だが一致なしなら not_installed と判定する', () => {
  assert.equal(
    deriveInstallState({
      relatedAppsSupported: true,
      relatedApps: [],
    }),
    'not_installed'
  );
});

test('deriveInstallState は API 非対応なら unknown にする', () => {
  assert.equal(
    deriveInstallState({
      relatedAppsSupported: false,
      relatedApps: [],
    }),
    'unknown'
  );
});

test('classifyDevice は Android mobile を識別する', () => {
  assert.deepEqual(
    classifyDevice(
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/135.0 Mobile Safari/537.36'
    ),
    {
      isAndroid: true,
      isMobile: true,
      isAndroidMobile: true,
    }
  );
});

test('classifyDevice は Android tablet を mobile 扱いしない', () => {
  assert.deepEqual(
    classifyDevice(
      'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/135.0 Safari/537.36'
    ),
    {
      isAndroid: true,
      isMobile: false,
      isAndroidMobile: false,
    }
  );
});

test('deriveCtaModel は Android mobile installed を Open primary / Get secondary にする', () => {
  assert.deepEqual(
    deriveCtaModel({
      installState: 'installed',
      device: { isAndroid: true, isMobile: true, isAndroidMobile: true },
    }),
    {
      primary: 'open',
      secondary: 'get',
    }
  );
});

test('deriveCtaModel は Android mobile unknown でも Open primary / Get secondary にする', () => {
  assert.deepEqual(
    deriveCtaModel({
      installState: 'unknown',
      device: { isAndroid: true, isMobile: true, isAndroidMobile: true },
    }),
    {
      primary: 'open',
      secondary: 'get',
    }
  );
});

test('deriveCtaModel は desktop を Get primary のみにする', () => {
  assert.deepEqual(
    deriveCtaModel({
      installState: 'installed',
      device: { isAndroid: false, isMobile: false, isAndroidMobile: false },
    }),
    {
      primary: 'get',
      secondary: null,
    }
  );
});

test('resolveInitialLocale は storage を優先し fallback で browser locale を使う', () => {
  assert.equal(
    resolveInitialLocale({
      storedLocale: 'en',
      browserLanguage: 'ja-JP',
    }),
    'en'
  );

  assert.equal(
    resolveInitialLocale({
      storedLocale: '',
      browserLanguage: 'ja-JP',
    }),
    'ja'
  );
});

test('404 fallback は相対 module import に依存せず単体で redirect 判定できる', () => {
  const html = readFileSync(new URL('../docs/404.html', import.meta.url), 'utf8');

  assert.match(html, /function buildShareRedirectTarget\(pathname, search\)/);
  assert.doesNotMatch(html, /import\s+\{\s*buildShareRedirectTarget\s*\}\s+from\s+'\.\/share\/core\.js'/);
});

test('mobile では summary card が CTA より先に並ぶ', () => {
  const css = readFileSync(new URL('../docs/share/styles.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /@media \(max-width: 899px\)\s*\{[\s\S]*?\.summary-card\s*\{\s*order:\s*1;\s*\}[\s\S]*?\.action-rail\s*\{\s*order:\s*2;\s*\}[\s\S]*?\}/
  );
});

test('Open attempt URL は canonical share URL がないときに組み立てない', () => {
  const appJs = readFileSync(new URL('../docs/share/app.js', import.meta.url), 'utf8');

  assert.match(
    appJs,
    /function buildOpenAttemptUrl\(\)\s*\{\s*const canonicalShareUrl = state\.canonicalShareUrl;\s*if \(typeof canonicalShareUrl !== 'string' \|\| !canonicalShareUrl\) \{\s*return null;/
  );
});

test('share_id 未解決時は Open ではなく Get fallback に倒す意図が app.js に明示されている', () => {
  const appJs = readFileSync(new URL('../docs/share/app.js', import.meta.url), 'utf8');

  assert.match(appJs, /const canOpenDirectly = Boolean\(state\.shareId && openAttemptUrl\);/);
  assert.match(appJs, /if \(ctaModel\.primary === 'open' && canOpenDirectly\)/);
});

test('share_id 未解決時は secondary Get CTA を重複表示しない', () => {
  const appJs = readFileSync(new URL('../docs/share/app.js', import.meta.url), 'utf8');

  assert.match(
    appJs,
    /const shouldShowSecondaryGet = ctaModel\.secondary === 'get' && canOpenDirectly;/
  );
  assert.match(appJs, /if \(shouldShowSecondaryGet\) \{/);
});

test('share config の install 導線は project pages 配下でも解決できる相対 path を使う', () => {
  const config = readFileSync(new URL('../docs/share/config.json', import.meta.url), 'utf8');

  assert.match(config, /"install_page_url"\s*:\s*"\.\.\/install\/"/);
  assert.match(config, /"report_enabled"\s*:\s*true/);
});

test('public share page は report 理由選択と submit/cancel を inline で持つ', () => {
  const html = readFileSync(new URL('../docs/share/index.html', import.meta.url), 'utf8');

  assert.match(html, /role="radiogroup"/);
  assert.match(html, /name="reportReason"/);
  assert.match(html, /id="reportSubmitButton"/);
  assert.match(html, /id="reportCancelButton"/);
});

test('report button は placeholder ではなく report API submit を呼ぶ', () => {
  const appJs = readFileSync(new URL('../docs/share/app.js', import.meta.url), 'utf8');

  assert.match(appJs, /buildReportEndpoint\(state\.config\.apiBaseUrl, state\.shareId\)/);
  assert.match(appJs, /'X-Anonymous-Reporter-Id': state\.report\.anonymousReporterId/);
  assert.match(appJs, /JSON\.stringify\(\{ reason: state\.report\.selectedReason \}\)/);
  assert.match(appJs, /reportResponse\.status === 'duplicate_report_suppressed'/);
});

test('404 fallback の戻り先リンクは project pages 配下でも base path を維持する', () => {
  const html = readFileSync(new URL('../docs/404.html', import.meta.url), 'utf8');

  assert.match(html, /function buildHomeHref\(pathname\)/);
  assert.match(html, /document\.getElementById\('topLink'\)\.href = buildHomeHref\(window\.location\.pathname\);/);
});
