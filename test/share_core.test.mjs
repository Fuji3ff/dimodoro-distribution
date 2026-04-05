import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildShareRedirectTarget,
  classifyDevice,
  deriveCtaModel,
  deriveInstallState,
  deriveSummaryPresentation,
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

test('normalizeSummaryPayload は valid unavailable payload を保持しつつ tags を 3 件へ制限する', () => {
  const payload = normalizeSummaryPayload({
    share_code: '7KQ9M2XZ',
    public_availability: 'unavailable',
    title: 'Night Focus Reset',
    icon_key: 'sparkles',
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
