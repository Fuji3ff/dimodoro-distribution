(() => {
  const configPath = "./config.json";

  const elements = {
    playButton: document.getElementById("playButton"),
    apkButton: document.getElementById("apkButton"),
    expiryBanner: document.getElementById("expiryBanner"),
    configError: document.getElementById("configError"),
    repoName: document.getElementById("repoName"),
    expiresAt: document.getElementById("expiresAt"),
    noteBox: document.getElementById("noteBox"),
    noteText: document.getElementById("noteText"),
  };

  const show = (element) => {
    if (!element) return;
    element.classList.remove("is-hidden");
  };

  const hide = (element) => {
    if (!element) return;
    element.classList.add("is-hidden");
  };

  const setText = (element, text) => {
    if (!element) return;
    element.textContent = text;
  };

  const normalize = (value) => {
    if (typeof value !== "string") return "";
    return value.trim();
  };

  const parseDateOnly = (value) => {
    const raw = normalize(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const isPastDate = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today > date;
  };

  const showError = (message) => {
    if (!message) return;
    setText(elements.configError, message);
    show(elements.configError);
  };

  const applyConfig = (config) => {
    const repoName = normalize(config.repository_full_name) || "未設定";
    setText(elements.repoName, repoName);

    const expiresRaw = normalize(config.expires_at);
    setText(elements.expiresAt, expiresRaw || "未設定");

    const expiryDate = parseDateOnly(expiresRaw);
    if (expiryDate && isPastDate(expiryDate)) {
      setText(
        elements.expiryBanner,
        `期限（${expiresRaw}）を過ぎています。ダウンロードは続けられます。`
      );
      show(elements.expiryBanner);
    } else {
      hide(elements.expiryBanner);
    }

    const note = normalize(config.note);
    if (note) {
      setText(elements.noteText, note);
      show(elements.noteBox);
    } else {
      hide(elements.noteBox);
    }

    const playUrl =
      normalize(config.play_listing_url) || normalize(config.play_opt_in_url);

    if (playUrl) {
      elements.playButton.href = playUrl;
      elements.playButton.classList.remove("is-disabled");
      elements.playButton.removeAttribute("aria-disabled");
      show(elements.playButton);
    } else {
      hide(elements.playButton);
    }

    const apkUrl = normalize(config.apk_latest_url);
    if (apkUrl) {
      elements.apkButton.href = apkUrl;
      elements.apkButton.classList.remove("is-disabled");
      elements.apkButton.removeAttribute("aria-disabled");
    } else {
      elements.apkButton.classList.add("is-disabled");
      elements.apkButton.setAttribute("aria-disabled", "true");
      showError("APKのURLが未設定です。");
    }
  };

  fetch(configPath, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((config) => {
      hide(elements.configError);
      applyConfig(config || {});
    })
    .catch((error) => {
      showError("設定の読み込みに失敗しました。担当に連絡してください。");
      console.error(error);
    });
})();
