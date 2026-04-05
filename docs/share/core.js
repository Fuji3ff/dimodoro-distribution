const SUPPORTED_LOCALES = new Set(['ja', 'en']);
const STEP_TYPES = new Set(['dimmer', 'timer', 'pomodoro', 'hue_wake_up']);
const PACKAGE_ID = 'dev.dimodoro.app';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeInteger(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function normalizeTagList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeString(entry))
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeStepSummary(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const stepNumber = normalizeInteger(entry.step_number);
  const stepType = normalizeString(entry.step_type);
  const title = normalizeString(entry.title);
  const summaryLine = normalizeString(entry.summary_line);
  const duration =
    entry.duration_sec === null ? null : normalizeInteger(entry.duration_sec);

  if (
    stepNumber === null ||
    stepNumber < 1 ||
    !STEP_TYPES.has(stepType) ||
    !title ||
    !summaryLine ||
    (entry.duration_sec !== null && duration === null)
  ) {
    return null;
  }

  return {
    stepNumber,
    stepType,
    title,
    durationSec: duration,
    summaryLine,
  };
}

export function resolveShareIdFromLocation({ pathname = '', search = '' } = {}) {
  const segments = String(pathname)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (segments[index] !== 'share') {
      continue;
    }
    const candidate = normalizeString(segments[index + 1]);
    if (candidate && candidate !== 'index.html') {
      return decodeURIComponent(candidate);
    }
  }

  const params = new URLSearchParams(search);
  const fallback = normalizeString(params.get('share_id'));
  return fallback ? fallback : null;
}

export function buildShareRedirectTarget({ pathname = '', search = '' } = {}) {
  const segments = String(pathname)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const shareIndex = segments.indexOf('share');

  if (shareIndex === -1 || shareIndex === segments.length - 1) {
    return null;
  }

  const shareId = normalizeString(segments[shareIndex + 1]);
  if (!shareId || shareId === 'index.html') {
    return null;
  }

  const basePath = segments.slice(0, shareIndex).join('/');
  const prefix = basePath ? `/${basePath}` : '';
  const params = new URLSearchParams(search);
  params.set('share_id', shareId);

  return `${prefix}/share/?${params.toString()}`;
}

export function resolveInitialLocale({
  storedLocale = '',
  browserLanguage = '',
} = {}) {
  const persisted = normalizeString(storedLocale).toLowerCase();
  if (SUPPORTED_LOCALES.has(persisted)) {
    return persisted;
  }

  const browser = normalizeString(browserLanguage).toLowerCase();
  if (browser.startsWith('ja')) {
    return 'ja';
  }

  return 'en';
}

export function normalizeSummaryPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const shareCode = normalizeString(payload.share_code);
  const publicAvailability = normalizeString(payload.public_availability);
  const title = normalizeString(payload.title);
  const iconKey = normalizeString(payload.icon_key);
  const benefitsSentence = normalizeString(payload.benefits_sentence);
  const totalDurationSec = normalizeInteger(payload.total_duration_sec);
  const timeHint = normalizeString(payload.time_hint);
  const tags = normalizeTagList(payload.tags);
  const stepSummaries = Array.isArray(payload.step_summaries)
    ? payload.step_summaries
        .map((entry) => normalizeStepSummary(entry))
        .filter(Boolean)
    : null;

  if (
    !shareCode ||
    !['available', 'unavailable'].includes(publicAvailability) ||
    !title ||
    !iconKey ||
    !benefitsSentence ||
    totalDurationSec === null ||
    typeof payload.has_hue !== 'boolean' ||
    !timeHint ||
    !Array.isArray(stepSummaries)
  ) {
    return null;
  }

  return {
    shareCode,
    publicAvailability,
    title,
    iconKey,
    tags,
    benefitsSentence,
    totalDurationSec,
    hasHue: payload.has_hue,
    timeHint,
    stepSummaries,
  };
}

export function deriveSummaryPresentation({ status = 0, payload = null } = {}) {
  if (status === 200 && payload) {
    return {
      kind: 'summary',
      availability: payload.publicAvailability,
      hasPayload: true,
    };
  }

  return {
    kind: 'unavailable',
    availability: 'unavailable',
    hasPayload: false,
  };
}

export function classifyDevice(userAgent = '') {
  const ua = normalizeString(userAgent).toLowerCase();
  const isAndroid = ua.includes('android');
  const isMobile =
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    (ua.includes('android') && !ua.includes('tablet'));

  return {
    isAndroid,
    isMobile,
    isAndroidMobile: isAndroid && isMobile,
  };
}

export function deriveInstallState({
  relatedAppsSupported = false,
  relatedApps = [],
} = {}) {
  if (!relatedAppsSupported) {
    return 'unknown';
  }

  const hasMatch = Array.isArray(relatedApps)
    ? relatedApps.some((app) => {
        if (!app || typeof app !== 'object') {
          return false;
        }
        const id = normalizeString(app.id);
        const url = normalizeString(app.url);
        return id === PACKAGE_ID || url.includes(PACKAGE_ID);
      })
    : false;

  return hasMatch ? 'installed' : 'not_installed';
}

export function deriveCtaModel({ installState, device } = {}) {
  if (!device?.isAndroidMobile) {
    return {
      primary: 'get',
      secondary: null,
    };
  }

  if (installState === 'not_installed') {
    return {
      primary: 'get',
      secondary: null,
    };
  }

  return {
    primary: 'open',
    secondary: 'get',
  };
}

export function buildCanonicalShareUrl(shareId) {
  return `https://dimodoro.app/share/${encodeURIComponent(shareId)}`;
}

export function buildSummaryEndpoint(apiBaseUrl, shareId) {
  const baseUrl = normalizeString(apiBaseUrl).replace(/\/+$/, '');
  return `${baseUrl}/routine-shares/${encodeURIComponent(shareId)}/summary`;
}

export function formatDurationCompact(seconds, locale = 'en') {
  const normalized = normalizeInteger(seconds) ?? 0;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);

  if (locale === 'ja') {
    if (hours > 0 && minutes > 0) {
      return `${hours}時間 ${minutes}分`;
    }
    if (hours > 0) {
      return `${hours}時間`;
    }
    return `${Math.max(minutes, 1)}分`;
  }

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  }
  if (hours > 0) {
    return `${hours} hr`;
  }
  return `${Math.max(minutes, 1)} min`;
}

export function formatStepDuration(seconds, locale = 'en') {
  if (seconds === null || seconds === undefined) {
    return locale === 'ja' ? '時間指定なし' : 'No fixed duration';
  }
  return formatDurationCompact(seconds, locale);
}
