(() => {
  const STORAGE_KEY = "ps_v1_fixed";

  function sanitizeStoredShifts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!Array.isArray(state.shifts)) return;
      state.shifts = state.shifts.map((shift) => {
        if (!shift || typeof shift !== "object") return shift;
        const next = { ...shift };
        delete next.onMyWayAt;
        delete next.eta;
        return next;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function patchText(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-act="omw"]').forEach((button) => {
      button.dataset.act = "clockin";
      button.textContent = "Clock In";
      button.setAttribute("aria-label", "Clock in");
    });

    scope.querySelectorAll("button").forEach((button) => {
      if (button.textContent.trim() === "On My Way") {
        button.dataset.act = "clockin";
        button.textContent = "Clock In";
        button.setAttribute("aria-label", "Clock in");
      }
    });

    const walker = document.createTreeWalker(scope.body || scope, NodeFilter.SHOW_TEXT);
    const replacements = [
      ["On My Way alerts, live arrival status, and earnings are built into the workflow.", "Clock-in status and earnings are built into the workflow."],
      ["On the way - ETA", "Awaiting arrival"],
      ["En Route - ETA", "Ready to clock in"]
    ];

    while (walker.nextNode()) {
      let text = walker.currentNode.nodeValue;
      replacements.forEach(([from, to]) => {
        text = text.replaceAll(from, to);
      });
      walker.currentNode.nodeValue = text;
    }
  }

  sanitizeStoredShifts();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.('[data-act="omw"]');
    if (!button) return;
    button.dataset.act = "clockin";
    button.textContent = "Clock In";
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    patchText(document);
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) patchText(node);
        });
      });
      patchText(document);
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
