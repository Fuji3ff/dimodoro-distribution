import { qrcode } from './vendor/qrcode.js';

import {
  buildCanonicalShareUrl,
  buildReportEndpoint,
  buildSummaryEndpoint,
  classifyDevice,
  deriveCtaModel,
  deriveInstallState,
  deriveSummaryPresentation,
  formatDurationCompact,
  formatStepDuration,
  isSupportedReportReason,
  normalizeSummaryPayload,
  normalizeReportResponse,
  resolveInitialLocale,
  resolveShareIdFromLocation,
} from './core.js';

const DEFAULT_CONFIG = {
  apiBaseUrl: 'https://api.dimodoro.app',
  installPageUrl: '../install/',
  reportEnabled: true,
};

const STORAGE_KEY = 'dimodoro-share-locale';
const REPORTER_ID_STORAGE_KEY = 'dimodoro-share-anonymous-reporter-id';
const REPORT_REASON_INPUT_SELECTOR = 'input[name="reportReason"]';

const FALLBACK_MESSAGES = {
  ja: {
    brand_name: 'Dimodoro',
    brand_pill: 'Public Share',
    summary_eyebrow: 'Public routine preview',
    page_title_default: 'Dimodoro Routine Share',
    page_title_with_title: '{{title}} | Dimodoro',
    meta_description_default: 'Dimodoro routine share の公開 summary です。',
    meta_description_with_title: '{{title}} の公開 routine summary です。',
    loading_status: 'routine を読み込んでいます。',
    loading_title: 'routine summary を準備しています',
    loading_benefits:
      'title / tags / benefits / steps を読み込み後に表示します。',
    unavailable_banner:
      'この share は今は利用できません。必要なら Get からアプリを用意してください。',
    unavailable_shell_title: 'この share は今は開けません',
    unavailable_shell_body:
      'リンク先の routine 情報を取得できませんでした。アプリを入れておくと、次の share をすぐ開けます。',
    open_label: 'Open',
    get_label: 'Get',
    cta_hint_open: 'アプリが入っていれば Open で直接開けます。',
    cta_hint_unknown:
      'Open でアプリ起動を試し、開かない場合は Get を使ってください。',
    cta_hint_get: 'この端末ではまずアプリを用意します。',
    open_fallback: 'アプリが開かない場合は Get を使ってください。',
    language_label: 'Language',
    locale_ja: '日本語',
    locale_en: 'English',
    tags_label: 'Tags',
    step_section_title: 'Step summary',
    step_duration_label: '所要',
    duration_chip: '合計 {{value}}',
    time_hint_chip: '時間帯 {{value}}',
    hue_chip: 'Hue を含む',
    share_code_label: 'Share code',
    share_code_hint: 'アプリ内 manual import fallback 用の code です。',
    report_label: 'Report',
    report_disabled: '通報導線は今は使えません。',
    report_idle: '不適切な公開 share を sign-in なしで通報できます。',
    report_reason_label: '通報理由',
    report_reason_inappropriate: '不適切な内容',
    report_reason_spam: 'スパム',
    report_reason_dangerous_or_misleading: '危険または誤解を招く内容',
    report_reason_other: 'その他',
    report_submit: '送信',
    report_cancel: '閉じる',
    report_missing_share: 'share を特定できないため通報を送信できません。',
    report_submitting: '通報を送信しています。',
    report_success: '通報を受け付けました。ご協力ありがとうございます。',
    report_duplicate: 'このブラウザからの再通報は {{time}} 以降に再開できます。',
    report_duplicate_no_time: 'このブラウザからの再通報は 24 時間後に再開できます。',
    report_error: '通報を送信できませんでした。時間をおいて再試行してください。',
    qr_title: '別端末で開く',
    qr_caption: 'QR の中身は公開 share URL そのものです。',
    qr_url_label: '公開URL',
    no_duration: '時間指定なし',
    step_type_dimmer: '減光',
    step_type_timer: 'タイマー',
    step_type_pomodoro: 'ポモドーロ',
    step_type_hue_wake_up: 'Hue Wake-up',
  },
  en: {
    brand_name: 'Dimodoro',
    brand_pill: 'Public Share',
    summary_eyebrow: 'Public routine preview',
    page_title_default: 'Dimodoro Routine Share',
    page_title_with_title: '{{title}} | Dimodoro',
    meta_description_default: 'Public summary page for a Dimodoro routine share.',
    meta_description_with_title: 'Public routine summary for {{title}}.',
    loading_status: 'Loading the routine summary.',
    loading_title: 'Preparing the routine preview',
    loading_benefits:
      'Title, tags, benefits, and steps will appear after the summary loads.',
    unavailable_banner:
      'This share is unavailable right now. You can still use Get to install the app.',
    unavailable_shell_title: 'This share is unavailable right now',
    unavailable_shell_body:
      'We could not load the routine details from this link. Install the app now so the next share opens immediately.',
    open_label: 'Open',
    get_label: 'Get',
    cta_hint_open: 'If the app is installed, Open should launch it directly.',
    cta_hint_unknown: 'Try Open first. If the app does not launch, use Get.',
    cta_hint_get: 'Use Get to prepare the app on this device.',
    open_fallback: 'If the app does not open, use Get instead.',
    language_label: 'Language',
    locale_ja: '日本語',
    locale_en: 'English',
    tags_label: 'Tags',
    step_section_title: 'Step summary',
    step_duration_label: 'Duration',
    duration_chip: 'Total {{value}}',
    time_hint_chip: 'Best at {{value}}',
    hue_chip: 'Includes Hue',
    share_code_label: 'Share code',
    share_code_hint:
      'Use this code as the manual import fallback inside the app.',
    report_label: 'Report',
    report_disabled: 'The report flow is unavailable right now.',
    report_idle: 'You can report an inappropriate public share without signing in.',
    report_reason_label: 'Reason',
    report_reason_inappropriate: 'Inappropriate content',
    report_reason_spam: 'Spam',
    report_reason_dangerous_or_misleading: 'Dangerous or misleading',
    report_reason_other: 'Other',
    report_submit: 'Submit',
    report_cancel: 'Cancel',
    report_missing_share: 'We could not identify this share for reporting.',
    report_submitting: 'Submitting your report.',
    report_success: 'Your report was received. Thank you.',
    report_duplicate: 'You can report this share again after {{time}} from this browser.',
    report_duplicate_no_time: 'You can report this share again after 24 hours from this browser.',
    report_error: 'We could not submit the report. Please try again later.',
    qr_title: 'Open on another device',
    qr_caption: 'This QR encodes the public share URL itself.',
    qr_url_label: 'Public URL',
    no_duration: 'No fixed duration',
    step_type_dimmer: 'Dimmer',
    step_type_timer: 'Timer',
    step_type_pomodoro: 'Pomodoro',
    step_type_hue_wake_up: 'Hue Wake-up',
  },
};

const state = {
  config: { ...DEFAULT_CONFIG },
  locale: 'ja',
  messages: FALLBACK_MESSAGES.ja,
  shareId: null,
  canonicalShareUrl: null,
  payload: null,
  presentation: {
    kind: 'unavailable',
    availability: 'unavailable',
    hasPayload: false,
  },
  device: classifyDevice(globalThis.navigator?.userAgent ?? ''),
  installState: 'unknown',
  shouldShowOpenFallback: false,
  report: {
    anonymousReporterId: '',
    isOpen: false,
    isSubmitting: false,
    selectedReason: 'inappropriate',
    feedbackKind: 'idle',
    feedbackNextReportAvailableAt: null,
  },
};

const elements = {
  shell: document.getElementById('shareShell'),
  statusBanner: document.getElementById('statusBanner'),
  liveRegion: document.getElementById('liveRegion'),
  brandPill: document.getElementById('brandPill'),
  summaryEyebrow: document.getElementById('summaryEyebrow'),
  loadingTitle: document.getElementById('loadingTitle'),
  loadingBenefits: document.getElementById('loadingBenefits'),
  primaryCta: document.getElementById('primaryCta'),
  secondaryCta: document.getElementById('secondaryCta'),
  ctaHint: document.getElementById('ctaHint'),
  languageLabel: document.getElementById('languageLabel'),
  localeJa: document.getElementById('localeJa'),
  localeEn: document.getElementById('localeEn'),
  shareCodeCard: document.getElementById('shareCodeCard'),
  shareCodeLabel: document.getElementById('shareCodeLabel'),
  shareCodeValue: document.getElementById('shareCodeValue'),
  shareCodeHint: document.getElementById('shareCodeHint'),
  qrCard: document.getElementById('qrCard'),
  qrCanvas: document.getElementById('qrCanvas'),
  qrTitle: document.getElementById('qrTitle'),
  qrCaption: document.getElementById('qrCaption'),
  qrUrlLabel: document.getElementById('qrUrlLabel'),
  canonicalUrlText: document.getElementById('canonicalUrlText'),
  reportButton: document.getElementById('reportButton'),
  reportPanel: document.getElementById('reportPanel'),
  reportReasonLabel: document.getElementById('reportReasonLabel'),
  reportReasonInappropriateText: document.getElementById('reportReasonInappropriateText'),
  reportReasonSpamText: document.getElementById('reportReasonSpamText'),
  reportReasonDangerousText: document.getElementById('reportReasonDangerousText'),
  reportReasonOtherText: document.getElementById('reportReasonOtherText'),
  reportSubmitButton: document.getElementById('reportSubmitButton'),
  reportCancelButton: document.getElementById('reportCancelButton'),
  reportHint: document.getElementById('reportHint'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryBenefits: document.getElementById('summaryBenefits'),
  summaryPill: document.getElementById('summaryPill'),
  chipGroup: document.getElementById('chipGroup'),
  stepSectionTitle: document.getElementById('stepSectionTitle'),
  tagsLabel: document.getElementById('tagsLabel'),
  stepList: document.getElementById('stepList'),
  metaDescription: document.querySelector('meta[name="description"]'),
  reportReasonInputs: Array.from(
    document.querySelectorAll(REPORT_REASON_INPUT_SELECTOR)
  ),
};

function formatMessage(key, replacements = {}) {
  const template = state.messages[key] ?? FALLBACK_MESSAGES[state.locale][key] ?? '';
  return Object.entries(replacements).reduce(
    (value, [token, replacement]) =>
      value.replaceAll(`{{${token}}}`, String(replacement)),
    template
  );
}

function setVisibility(element, visible) {
  if (!element) {
    return;
  }
  element.classList.toggle('is-hidden', !visible);
}

function setText(element, value) {
  if (!element) {
    return;
  }
  element.textContent = value;
}

function setStatus(message, visible = true) {
  setText(elements.statusBanner, message);
  setText(elements.liveRegion, message);
  elements.statusBanner.classList.toggle('is-visible', Boolean(visible && message));
}

function readStorageLocale() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // WHY: storage 非対応でも locale 切替自体は成立させる。
  }
}

function readStoredAnonymousReporterId() {
  try {
    return localStorage.getItem(REPORTER_ID_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistAnonymousReporterId(reporterId) {
  try {
    localStorage.setItem(REPORTER_ID_STORAGE_KEY, reporterId);
  } catch {
    // WHY: storage 非対応時でも page session 中の report を止めない。
  }
}

function generateAnonymousReporterId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web_${crypto.randomUUID()}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `web_${hex}`;
  }

  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function ensureAnonymousReporterId() {
  const storedReporterId = readStoredAnonymousReporterId();
  if (storedReporterId && storedReporterId.length >= 16) {
    return storedReporterId;
  }

  const reporterId = generateAnonymousReporterId();
  persistAnonymousReporterId(reporterId);
  return reporterId;
}

function setLocaleButtons() {
  elements.localeJa.setAttribute('aria-pressed', String(state.locale === 'ja'));
  elements.localeEn.setAttribute('aria-pressed', String(state.locale === 'en'));
}

function applyStaticCopy() {
  document.documentElement.lang = state.locale;

  setText(elements.brandPill, state.messages.brand_pill);
  setText(elements.summaryEyebrow, state.messages.summary_eyebrow);
  setText(elements.summaryPill, state.messages.summary_eyebrow);
  setText(elements.loadingTitle, state.messages.loading_title);
  setText(elements.loadingBenefits, state.messages.loading_benefits);
  setText(elements.languageLabel, state.messages.language_label);
  setText(elements.localeJa, state.messages.locale_ja);
  setText(elements.localeEn, state.messages.locale_en);
  setText(elements.shareCodeLabel, state.messages.share_code_label);
  setText(elements.shareCodeHint, state.messages.share_code_hint);
  setText(elements.qrTitle, state.messages.qr_title);
  setText(elements.qrCaption, state.messages.qr_caption);
  setText(elements.qrUrlLabel, state.messages.qr_url_label);
  setText(elements.reportButton, state.messages.report_label);
  setText(elements.reportReasonLabel, state.messages.report_reason_label);
  setText(
    elements.reportReasonInappropriateText,
    state.messages.report_reason_inappropriate
  );
  setText(elements.reportReasonSpamText, state.messages.report_reason_spam);
  setText(
    elements.reportReasonDangerousText,
    state.messages.report_reason_dangerous_or_misleading
  );
  setText(elements.reportReasonOtherText, state.messages.report_reason_other);
  setText(elements.reportSubmitButton, state.messages.report_submit);
  setText(elements.reportCancelButton, state.messages.report_cancel);
  setText(elements.stepSectionTitle, state.messages.step_section_title);
  setText(elements.tagsLabel, state.messages.tags_label);
  setLocaleButtons();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
  });
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function loadConfig() {
  try {
    const result = await fetchJson('./config.json');
    if (!result.ok || !result.data || typeof result.data !== 'object') {
      return { ...DEFAULT_CONFIG };
    }

    return {
      apiBaseUrl:
        typeof result.data.api_base_url === 'string' &&
        result.data.api_base_url.trim()
          ? result.data.api_base_url.trim()
          : DEFAULT_CONFIG.apiBaseUrl,
      installPageUrl:
        typeof result.data.install_page_url === 'string' &&
        result.data.install_page_url.trim()
          ? result.data.install_page_url.trim()
          : DEFAULT_CONFIG.installPageUrl,
      reportEnabled: Boolean(result.data.report_enabled),
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function loadMessages(locale) {
  try {
    const result = await fetchJson(`./i18n/${locale}.json`);
    if (result.ok && result.data && typeof result.data === 'object') {
      return {
        ...FALLBACK_MESSAGES[locale],
        ...result.data,
      };
    }
  } catch {
    // WHY: i18n fetch failure で share page を壊さない。
  }

  return { ...FALLBACK_MESSAGES[locale] };
}

async function detectInstallState() {
  const relatedAppsSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.getInstalledRelatedApps === 'function';

  if (!relatedAppsSupported) {
    return 'unknown';
  }

  try {
    const relatedApps = await navigator.getInstalledRelatedApps();
    return deriveInstallState({ relatedAppsSupported: true, relatedApps });
  } catch {
    return 'unknown';
  }
}

function resolveInstallHref() {
  return new URL(state.config.installPageUrl, window.location.href).toString();
}

function buildOpenAttemptUrl() {
  const canonicalShareUrl = state.canonicalShareUrl;
  if (typeof canonicalShareUrl !== 'string' || !canonicalShareUrl) {
    return null;
  }

  const url = new URL(canonicalShareUrl);
  url.searchParams.set('open_attempt', '1');
  return url.toString();
}

function renderQr() {
  if (!state.shareId || !state.canonicalShareUrl || !elements.qrCanvas) {
    setVisibility(elements.qrCard, false);
    return;
  }

  elements.qrCanvas.innerHTML = '';
  const qr = qrcode(0, 'M');
  qr.addData(state.canonicalShareUrl, 'Byte');
  qr.make();

  // WHY: QR は desktop 主導線なので、SVG で crisp に出しつつ外部 API へ依存しない。
  elements.qrCanvas.innerHTML = qr.createSvgTag({
    cellSize: 8,
    margin: 0,
    scalable: true,
  });
  setText(elements.canonicalUrlText, state.canonicalShareUrl);
  setVisibility(elements.qrCard, true);
}

function setReportFeedback(kind, nextReportAvailableAt = null) {
  state.report.feedbackKind = kind;
  state.report.feedbackNextReportAvailableAt = nextReportAvailableAt;
}

function formatReportRetryAt(nextReportAvailableAt) {
  if (!nextReportAvailableAt) {
    return state.messages.report_duplicate_no_time;
  }

  const retryAt = new Date(nextReportAvailableAt);
  if (Number.isNaN(retryAt.valueOf())) {
    return state.messages.report_duplicate_no_time;
  }

  const formattedTime = new Intl.DateTimeFormat(state.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(retryAt);

  return formatMessage('report_duplicate', { time: formattedTime });
}

function isReportAvailable() {
  return Boolean(state.config.reportEnabled && state.shareId);
}

function syncSelectedReportReason() {
  const selectedInput = elements.reportReasonInputs.find((input) => input.checked);
  const selectedReason = selectedInput?.value ?? state.report.selectedReason;
  state.report.selectedReason = isSupportedReportReason(selectedReason)
    ? selectedReason
    : 'inappropriate';
}

function setReportInputsDisabled(disabled) {
  elements.reportReasonInputs.forEach((input) => {
    input.disabled = disabled;
  });
  elements.reportSubmitButton.disabled = disabled;
  elements.reportCancelButton.disabled = disabled;
}

async function submitReport() {
  if (!isReportAvailable() || state.report.isSubmitting) {
    return;
  }

  syncSelectedReportReason();
  state.report.isSubmitting = true;
  setReportFeedback('submitting');
  renderReportState();
  setStatus(state.messages.report_submitting, true);

  try {
    const result = await fetchJson(
      buildReportEndpoint(state.config.apiBaseUrl, state.shareId),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-Reporter-Id': state.report.anonymousReporterId,
        },
        body: JSON.stringify({ reason: state.report.selectedReason }),
      }
    );
    const reportResponse = normalizeReportResponse(result.data);

    if (result.ok && reportResponse) {
      const isDuplicate = reportResponse.status === 'duplicate_report_suppressed';
      const feedbackMessage = isDuplicate
        ? formatReportRetryAt(reportResponse.nextReportAvailableAt)
        : state.messages.report_success;

      // WHY: accepted 系 truth が返った時だけ success 扱いにし、request 開始とは分離する。
      state.report.isOpen = false;
      setReportFeedback(
        isDuplicate ? 'duplicate' : 'success',
        reportResponse.nextReportAvailableAt
      );
      setStatus(feedbackMessage, true);
      return;
    }

    setReportFeedback('error');
    setStatus(state.messages.report_error, true);
  } catch {
    setReportFeedback('error');
    setStatus(state.messages.report_error, true);
  } finally {
    state.report.isSubmitting = false;
    renderReportState();
  }
}

function createChip(className, text) {
  const chip = document.createElement('span');
  chip.className = `chip ${className}`;
  chip.textContent = text;
  return chip;
}

function renderChips(payload) {
  elements.chipGroup.innerHTML = '';

  const durationText = formatDurationCompact(payload.totalDurationSec, state.locale);
  elements.chipGroup.append(
    createChip('accent', formatMessage('duration_chip', { value: durationText }))
  );
  elements.chipGroup.append(
    createChip('meta', formatMessage('time_hint_chip', { value: payload.timeHint }))
  );

  if (payload.hasHue) {
    elements.chipGroup.append(createChip('meta', state.messages.hue_chip));
  }

  payload.tags.forEach((tag) => {
    elements.chipGroup.append(createChip('tag', `#${tag}`));
  });
}

function localizedStepType(stepType) {
  return state.messages[`step_type_${stepType}`] ?? stepType;
}

function renderStepList(payload) {
  elements.stepList.innerHTML = '';

  if (!payload.stepSummaries.length) {
    const empty = document.createElement('li');
    empty.className = 'step-item';
    const index = document.createElement('div');
    index.className = 'step-index';
    index.textContent = '-';

    const body = document.createElement('div');
    const title = document.createElement('h4');
    title.className = 'step-title';
    title.textContent = state.messages.step_section_title;

    const summary = document.createElement('p');
    summary.className = 'step-summary';
    summary.textContent = state.messages.loading_benefits;

    body.append(title, summary);
    empty.append(index, body);
    elements.stepList.append(empty);
    return;
  }

  payload.stepSummaries.forEach((step) => {
    const item = document.createElement('li');
    item.className = 'step-item';

    const durationText =
      step.durationSec === null
        ? state.messages.no_duration
        : formatStepDuration(step.durationSec, state.locale);

    // WHY: summary API 由来文字列を HTML 解釈させず、public page の XSS 面を狭める。
    const index = document.createElement('div');
    index.className = 'step-index';
    index.textContent = String(step.stepNumber);

    const body = document.createElement('div');

    const titleRow = document.createElement('div');
    titleRow.className = 'step-title-row';

    const title = document.createElement('h4');
    title.className = 'step-title';
    title.textContent = step.title;

    const typePill = document.createElement('span');
    typePill.className = 'step-type-pill';
    typePill.textContent = localizedStepType(step.stepType);

    titleRow.append(title, typePill);

    const summary = document.createElement('p');
    summary.className = 'step-summary';
    summary.textContent = step.summaryLine;

    const meta = document.createElement('div');
    meta.className = 'step-meta';

    const durationPill = document.createElement('span');
    durationPill.className = 'step-duration-pill';
    durationPill.textContent = `${state.messages.step_duration_label}: ${durationText}`;

    meta.append(durationPill);
    body.append(titleRow, summary, meta);
    item.append(index, body);
    elements.stepList.append(item);
  });
}

function renderLoadingSkeleton() {
  elements.shell.setAttribute('aria-busy', 'true');
  elements.shell.dataset.state = 'loading';

  setStatus(state.messages.loading_status, true);
  setText(elements.summaryTitle, state.messages.loading_title);
  setText(elements.summaryBenefits, state.messages.loading_benefits);
  elements.summaryTitle.classList.add('skeleton-block');
  elements.summaryBenefits.classList.add('skeleton-block');

  elements.chipGroup.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    const chip = document.createElement('span');
    chip.className = 'skeleton-chip';
    elements.chipGroup.append(chip);
  }

  elements.stepList.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    const step = document.createElement('li');
    step.className = 'skeleton-step';
    elements.stepList.append(step);
  }

  elements.primaryCta.classList.add('is-disabled');
  elements.primaryCta.setAttribute('aria-disabled', 'true');
  elements.primaryCta.href = '#';
  setVisibility(elements.secondaryCta, false);
  setText(elements.primaryCta, state.messages.get_label);
  setText(elements.ctaHint, state.messages.loading_status);
  setVisibility(elements.shareCodeCard, false);
  setVisibility(elements.qrCard, false);
  renderReportState();
}

function updateDocumentMeta() {
  if (state.payload?.title) {
    document.title = formatMessage('page_title_with_title', {
      title: state.payload.title,
    });
    elements.metaDescription?.setAttribute(
      'content',
      formatMessage('meta_description_with_title', { title: state.payload.title })
    );
    return;
  }

  document.title = state.messages.page_title_default;
  elements.metaDescription?.setAttribute(
    'content',
    state.messages.meta_description_default
  );
}

function updateCtas() {
  const ctaModel = deriveCtaModel({
    installState: state.installState,
    device: state.device,
  });
  const installHref = resolveInstallHref();
  const openAttemptUrl = buildOpenAttemptUrl();
  const canOpenDirectly = Boolean(state.shareId && openAttemptUrl);
  const shouldShowSecondaryGet = ctaModel.secondary === 'get' && canOpenDirectly;

  if (ctaModel.primary === 'open' && canOpenDirectly) {
    setText(elements.primaryCta, state.messages.open_label);
    elements.primaryCta.href = openAttemptUrl;
    elements.primaryCta.dataset.action = 'open';
  } else {
    // WHY: share_id 未解決や canonical URL 欠落時は Open へ進めず Get fallback に固定する。
    setText(elements.primaryCta, state.messages.get_label);
    elements.primaryCta.href = installHref;
    elements.primaryCta.dataset.action = 'get';
  }

  elements.primaryCta.classList.remove('is-disabled');
  elements.primaryCta.removeAttribute('aria-disabled');

  if (shouldShowSecondaryGet) {
    setVisibility(elements.secondaryCta, true);
    setText(elements.secondaryCta, state.messages.get_label);
    elements.secondaryCta.href = installHref;
  } else {
    setVisibility(elements.secondaryCta, false);
  }

  if (!state.device.isAndroidMobile || ctaModel.primary === 'get' || !canOpenDirectly) {
    setText(elements.ctaHint, state.messages.cta_hint_get);
  } else if (state.installState === 'installed') {
    setText(elements.ctaHint, state.messages.cta_hint_open);
  } else {
    setText(elements.ctaHint, state.messages.cta_hint_unknown);
  }
}

function renderReportState() {
  const canReport = isReportAvailable();
  const isDisabled = !canReport || state.report.isSubmitting;
  const hintTextByFeedbackKind = {
    idle: state.messages.report_idle,
    submitting: state.messages.report_submitting,
    success: state.messages.report_success,
    duplicate: formatReportRetryAt(state.report.feedbackNextReportAvailableAt),
    error: state.messages.report_error,
  };
  const hintText = !state.config.reportEnabled
    ? state.messages.report_disabled
    : !state.shareId
      ? state.messages.report_missing_share
      : hintTextByFeedbackKind[state.report.feedbackKind] ?? state.messages.report_idle;

  elements.reportButton.disabled = isDisabled;
  elements.reportButton.setAttribute('aria-disabled', String(isDisabled));
  setVisibility(elements.reportPanel, canReport && state.report.isOpen);
  setText(elements.reportHint, hintText);
  setReportInputsDisabled(!canReport || state.report.isSubmitting);
  syncSelectedReportReason();
}

function renderPayloadSummary(payload) {
  elements.summaryTitle.classList.remove('skeleton-block');
  elements.summaryBenefits.classList.remove('skeleton-block');
  setText(elements.summaryTitle, payload.title);
  setText(elements.summaryBenefits, payload.benefitsSentence);
  renderChips(payload);
  renderStepList(payload);
  setVisibility(elements.shareCodeCard, true);
  setText(elements.shareCodeValue, payload.shareCode);
}

function renderPayloadlessUnavailable() {
  elements.summaryTitle.classList.remove('skeleton-block');
  elements.summaryBenefits.classList.remove('skeleton-block');
  setText(elements.summaryTitle, state.messages.unavailable_shell_title);
  setText(elements.summaryBenefits, state.messages.unavailable_shell_body);
  elements.chipGroup.innerHTML = '';
  elements.stepList.innerHTML = '';
  setVisibility(elements.shareCodeCard, false);
}

function renderFromState() {
  elements.shell.setAttribute('aria-busy', 'false');
  elements.shell.dataset.state = state.presentation.kind;
  updateDocumentMeta();
  updateCtas();
  renderReportState();

  if (state.presentation.hasPayload && state.payload) {
    renderPayloadSummary(state.payload);
    if (state.presentation.availability === 'unavailable') {
      setStatus(state.messages.unavailable_banner, true);
    } else if (state.shouldShowOpenFallback) {
      setStatus(state.messages.open_fallback, true);
    } else {
      setStatus('', false);
    }
  } else {
    renderPayloadlessUnavailable();
    setStatus(state.messages.unavailable_banner, true);
  }

  renderQr();
}

async function loadSummary() {
  if (!state.shareId) {
    state.payload = null;
    state.presentation = deriveSummaryPresentation({ status: 404, payload: null });
    renderFromState();
    return;
  }

  try {
    const result = await fetchJson(
      buildSummaryEndpoint(state.config.apiBaseUrl, state.shareId)
    );
    const payload = normalizeSummaryPayload(result.data);
    state.payload = payload;
    state.presentation = deriveSummaryPresentation({
      status: result.status,
      payload,
    });
  } catch {
    state.payload = null;
    state.presentation = deriveSummaryPresentation({ status: 500, payload: null });
  }

  renderFromState();
}

async function switchLocale(locale) {
  state.locale = locale;
  persistLocale(locale);
  state.messages = await loadMessages(locale);
  applyStaticCopy();
  renderFromState();
}

function attachEventListeners() {
  // WHY: locale 切替は payload 再取得をせず chrome 文言だけ再描画し、server text は保持する。
  [elements.localeJa, elements.localeEn].forEach((button) => {
    button.addEventListener('click', async () => {
      const locale = button.dataset.locale;
      if (!locale || locale === state.locale) {
        return;
      }
      await switchLocale(locale);
    });
  });

  // WHY: Open は app launch attempt を最優先にしつつ、browser fallback 後も同じ share page に戻せるよう query を残す。
  elements.primaryCta.addEventListener('click', (event) => {
    if (elements.primaryCta.dataset.action !== 'open' || !state.shareId) {
      return;
    }

    const openAttemptUrl = buildOpenAttemptUrl();
    if (!openAttemptUrl) {
      return;
    }

    event.preventDefault();
    window.location.assign(openAttemptUrl);
  });

  elements.reportReasonInputs.forEach((input) => {
    input.addEventListener('change', () => {
      syncSelectedReportReason();
    });
  });

  elements.reportButton.addEventListener('click', () => {
    if (elements.reportButton.getAttribute('aria-disabled') === 'true') {
      return;
    }

    // WHY: reason 選択は inline で完結させ、public page の CTA 骨格や scroll position を崩さない。
    state.report.isOpen = !state.report.isOpen;
    renderReportState();
  });

  elements.reportCancelButton.addEventListener('click', () => {
    if (state.report.isSubmitting) {
      return;
    }

    state.report.isOpen = false;
    renderReportState();
  });

  elements.reportSubmitButton.addEventListener('click', async () => {
    await submitReport();
  });
}

function announceOpenFallbackIfNeeded() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('open_attempt') === '1') {
    state.shouldShowOpenFallback = true;
    url.searchParams.delete('open_attempt');
    window.history.replaceState({}, '', url);
  }
}

async function init() {
  state.shareId = resolveShareIdFromLocation({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  state.canonicalShareUrl = state.shareId
    ? buildCanonicalShareUrl(state.shareId)
    : null;
  state.device = classifyDevice(globalThis.navigator?.userAgent ?? '');

  const storedLocale = readStorageLocale();
  state.locale = resolveInitialLocale({
    storedLocale,
    browserLanguage: navigator.language ?? '',
  });

  const [config, messages, installState] = await Promise.all([
    loadConfig(),
    loadMessages(state.locale),
    detectInstallState(),
  ]);

  state.config = config;
  state.messages = messages;
  state.installState = installState;
  state.report.anonymousReporterId = ensureAnonymousReporterId();
  syncSelectedReportReason();

  applyStaticCopy();
  renderLoadingSkeleton();
  attachEventListeners();
  announceOpenFallbackIfNeeded();
  await loadSummary();
}

void init();
