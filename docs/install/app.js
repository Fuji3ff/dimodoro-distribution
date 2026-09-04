(() => {
  const configPath = "./config.json";

  const elements = {
    playButton: document.getElementById("playButton"),
    configError: document.getElementById("configError"),
    repoName: document.getElementById("repoName"),
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

  const showError = (message) => {
    if (!message) return;
    setText(elements.configError, message);
    show(elements.configError);
  };

  const applyConfig = (config) => {
    const repoName = normalize(config.repository_full_name) || "未設定";
    setText(elements.repoName, repoName);

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
      showError("Google Play内部テストの参加URLが未設定です。");
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
