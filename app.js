(function () {
  "use strict";

  const storageKey = "penge-trick:v1";
  const stage = document.getElementById("stage");
  const note = document.getElementById("note");
  const homeBgFill = document.getElementById("homeBgFill");
  const homeBg = document.getElementById("homeBg");
  const setupPanel = document.getElementById("setupPanel");
  const controlsHotspot = document.getElementById("controlsHotspot");
  const floatingControls = document.getElementById("floatingControls");
  const settingsButton = document.getElementById("settingsButton");
  const closeSetup = document.getElementById("closeSetup");
  const resetButton = document.getElementById("resetButton");
  const bgInput = document.getElementById("bgInput");
  const denomination = document.getElementById("denomination");
  const bgXRange = document.getElementById("bgXRange");
  const bgXOutput = document.getElementById("bgXOutput");
  const bgYRange = document.getElementById("bgYRange");
  const bgYOutput = document.getElementById("bgYOutput");
  const bgScaleRange = document.getElementById("bgScaleRange");
  const bgScaleOutput = document.getElementById("bgScaleOutput");
  const sensitivityRange = document.getElementById("sensitivityRange");
  const sensitivityOutput = document.getElementById("sensitivityOutput");
  const sizeRange = document.getElementById("sizeRange");
  const sizeOutput = document.getElementById("sizeOutput");
  const rotationRange = document.getElementById("rotationRange");
  const rotationOutput = document.getElementById("rotationOutput");
  const edgeButtons = Array.from(document.querySelectorAll("[data-edge]"));

  const noteColors = {
    "dkk5": ["#8fc9df", "#d9f2ff", "#5f9fbb"],
    "50": ["#704538", "#cda26d", "#64352e"],
    "100": ["#c88765", "#f0cf91", "#8d563f"],
    "200": ["#6f8f75", "#c8d8a1", "#3f654a"],
    "500": ["#526d94", "#b7c8dc", "#314b72"],
    "1000": ["#8d626f", "#dac0c9", "#68404f"],
    "eur50Big": ["#b2734c", "#f1d8a5", "#7c4a34"],
    "eur50Small": ["#9c7b59", "#ece6d8", "#55745e"]
  };

  const noteImages = {
    "dkk5": "assets/5kr.png",
    "100": "assets/100kr.png",
    "200": "assets/200kr.png",
    "500": "assets/500kr.png",
    "eur50Big": "assets/50eur-big.png",
    "eur50Small": "assets/50eur-small.png"
  };

  const state = {
    bg: "",
    denom: "100",
    edge: "right",
    bgX: 0,
    bgY: 0,
    bgScale: 100,
    sensitivity: 60,
    size: 100,
    rotation: -7,
    x: 0,
    y: 0,
    hidden: false
  };

  let drag = null;
  let controlsTimer = null;
  let noteFrame = null;

  function appViewportSize() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const screenWidth = coarsePointer && window.screen ? window.screen.width : 0;
    const screenHeight = coarsePointer && window.screen ? window.screen.height : 0;
    const cssWidth = Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0,
      window.visualViewport ? window.visualViewport.width : 0,
      screenWidth
    );
    const cssHeight = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      window.visualViewport ? window.visualViewport.height : 0,
      screenHeight
    );
    const dpr = window.devicePixelRatio || 1;

    return {
      cssWidth,
      cssHeight,
      pixelWidth: Math.max(320, Math.round(cssWidth * dpr)),
      pixelHeight: Math.max(480, Math.round(cssHeight * dpr))
    };
  }

  function syncAppViewportSize() {
    const size = appViewportSize();
    document.documentElement.style.setProperty("--app-width", `${size.cssWidth}px`);
    document.documentElement.style.setProperty("--app-height", `${size.cssHeight}px`);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      Object.assign(state, saved);
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        bg: state.bg,
        denom: state.denom,
        edge: state.edge,
        bgX: state.bgX,
        bgY: state.bgY,
        bgScale: state.bgScale,
        sensitivity: state.sensitivity,
        size: state.size,
        rotation: state.rotation
      }));
    } catch (error) {
      // Large photos can exceed localStorage on iOS; keep the current illusion running.
    }
  }

  function foldedNoteSvg(value) {
    const colors = noteColors[value] || noteColors["100"];
    const [main, light, dark] = colors;
    const textColor = value === "50" ? "#fff7e8" : "#173029";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 190">
        <defs>
          <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${light}"/>
            <stop offset="0.45" stop-color="${main}"/>
            <stop offset="1" stop-color="${dark}"/>
          </linearGradient>
          <linearGradient id="fold" x1="0" x2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.34"/>
            <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
          </linearGradient>
          <filter id="texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.08"/>
            </feComponentTransfer>
            <feBlend mode="multiply" in2="SourceGraphic"/>
          </filter>
        </defs>
        <path d="M26 43 C116 19 185 29 260 40 C327 50 384 33 433 52 L411 151 C342 139 279 158 214 147 C138 134 84 144 31 158 Z" fill="url(#paper)"/>
        <path d="M154 30 L204 147 L262 40 Z" fill="url(#fold)" opacity="0.74"/>
        <path d="M260 40 L306 143 L346 39 C318 45 291 45 260 40 Z" fill="#fff" opacity="0.18"/>
        <path d="M39 58 C108 42 168 45 229 53 C288 61 354 48 420 62" fill="none" stroke="${textColor}" stroke-opacity="0.32" stroke-width="5"/>
        <path d="M42 139 C103 126 155 129 220 137 C286 145 342 132 399 140" fill="none" stroke="${textColor}" stroke-opacity="0.24" stroke-width="5"/>
        <ellipse cx="105" cy="94" rx="47" ry="31" fill="none" stroke="${textColor}" stroke-opacity="0.35" stroke-width="5"/>
        <text x="318" y="111" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="${textColor}" opacity="0.82">${value}</text>
        <text x="367" y="132" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${textColor}" opacity="0.72">kr</text>
        <path d="M26 43 C116 19 185 29 260 40 C327 50 384 33 433 52 L411 151 C342 139 279 158 214 147 C138 134 84 144 31 158 Z" fill="transparent" stroke="#1a1512" stroke-opacity="0.22" stroke-width="3" filter="url(#texture)"/>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function applyState() {
    if (state.bg) {
      applyBackgroundImage(state.bg);
      setupPanel.classList.add("is-collapsed");
    }

    denomination.value = state.denom;
    bgXRange.value = String(state.bgX);
    bgYRange.value = String(state.bgY);
    bgScaleRange.value = String(state.bgScale);
    sensitivityRange.value = String(state.sensitivity);
    bgXOutput.textContent = String(state.bgX);
    bgYOutput.textContent = String(state.bgY);
    bgScaleOutput.textContent = `${state.bgScale}%`;
    sensitivityOutput.textContent = `${state.sensitivity} px`;
    sizeRange.value = String(state.size);
    rotationRange.value = String(state.rotation);
    sizeOutput.textContent = `${state.size}%`;
    rotationOutput.textContent = `${state.rotation} deg`;
    note.src = noteImages[state.denom] || foldedNoteSvg(state.denom);
    note.classList.toggle("is-hidden", state.hidden);

    edgeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.edge === state.edge));
    });

    moveNote(state.x, state.y);
    applyBackgroundOffset();
  }

  function applyBackgroundOffset() {
    homeBg.style.transform = `translate3d(${state.bgX}px, ${state.bgY}px, 0) scale(${state.bgScale / 100})`;
  }

  function defaultPosition() {
    const rect = stage.getBoundingClientRect();
    const noteRect = note.getBoundingClientRect();
    state.x = Math.max(18, rect.width - noteRect.width - 28);
    state.y = Math.max(80, rect.height - noteRect.height - 96);
  }

  function moveNote(x, y) {
    state.x = x;
    state.y = y;
    note.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${state.rotation}deg) scale(${state.size / 100})`;
  }

  function updateReactiveNote() {
    if (!drag || noteFrame) return;

    noteFrame = window.requestAnimationFrame((time) => {
      noteFrame = null;
      if (!drag) return;

      const elapsed = Math.max(8, time - drag.lastTime);
      drag.lastTime = time;

      const dx = drag.targetX - state.x;
      const dy = drag.targetY - state.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) return;

      const maxStep = Math.max(8, elapsed * 1.45);
      const fastPullLimit = 96;
      const step = distance > fastPullLimit ? Math.min(maxStep * 0.35, distance) : Math.min(maxStep, distance);
      const nextX = state.x + (dx / distance) * step;
      const nextY = state.y + (dy / distance) * step;

      moveNote(nextX, nextY);

      if (crossedExitEdge(note.getBoundingClientRect())) {
        hideAtEdge();
        return;
      }

      if (Math.hypot(drag.targetX - state.x, drag.targetY - state.y) > 0.5) {
        updateReactiveNote();
      }
    });
  }

  function showControls() {
    floatingControls.classList.add("is-visible");
    window.clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(() => {
      floatingControls.classList.remove("is-visible");
    }, 2800);
  }

  function resetNote() {
    state.hidden = false;
    note.classList.remove("is-hidden");
    defaultPosition();
    moveNote(state.x, state.y);
  }

  function crossedExitEdge(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sensitivity = Number(state.sensitivity) || 0;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (state.edge === "left") return centerX <= sensitivity;
    if (state.edge === "right") return centerX >= vw - sensitivity;
    if (state.edge === "top") return centerY <= sensitivity;
    return centerY >= vh - sensitivity;
  }

  function hideAtEdge() {
    state.hidden = true;
    note.classList.add("is-hidden");
    if (drag && drag.pointerId !== null) {
      try {
        note.releasePointerCapture(drag.pointerId);
      } catch (error) {
        // Pointer capture may already be gone if the finger left the viewport.
      }
    }
    if (noteFrame) {
      window.cancelAnimationFrame(noteFrame);
      noteFrame = null;
    }
    drag = null;
  }

  function resizeLoadedBackground(image) {
    const size = appViewportSize();
    const scale = Math.max(size.pixelWidth / image.width, size.pixelHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const canvas = document.createElement("canvas");
    canvas.width = size.pixelWidth;
    canvas.height = size.pixelHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      (size.pixelWidth - drawWidth) / 2,
      (size.pixelHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function applyBackgroundImage(dataUrl) {
    const cssUrl = `url("${dataUrl.replace(/"/g, '\\"')}")`;
    document.documentElement.style.setProperty("--home-bg-image", cssUrl);
    homeBgFill.src = dataUrl;
    homeBg.src = dataUrl;
    homeBgFill.classList.add("is-loaded");
    homeBg.classList.add("is-loaded");
  }

  function readBackground(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => resolve(resizeLoadedBackground(image));
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeSavedBackground() {
    if (!state.bg) return;

    const image = new Image();
    image.onload = () => {
      const size = appViewportSize();
      if (Math.abs(image.width - size.pixelWidth) <= 2 && Math.abs(image.height - size.pixelHeight) <= 2) return;
      state.bg = resizeLoadedBackground(image);
      applyBackgroundImage(state.bg);
      saveState();
    };
    image.src = state.bg;
  }

  note.addEventListener("pointerdown", (event) => {
    if (state.hidden) return;
    event.preventDefault();
    note.setPointerCapture(event.pointerId);
    note.classList.add("is-dragging");
    drag = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: event.clientX - state.x,
      offsetY: event.clientY - state.y,
      targetX: state.x,
      targetY: state.y,
      lastTime: performance.now()
    };
  });

  note.addEventListener("click", (event) => {
    event.preventDefault();
  });

  note.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    drag.targetX = event.clientX - drag.offsetX;
    drag.targetY = event.clientY - drag.offsetY;
    updateReactiveNote();
    if (crossedExitEdge(note.getBoundingClientRect())) hideAtEdge();
  });

  note.addEventListener("pointerup", () => {
    note.classList.remove("is-dragging");
    if (noteFrame) {
      window.cancelAnimationFrame(noteFrame);
      noteFrame = null;
    }
    drag = null;
  });

  note.addEventListener("pointercancel", () => {
    note.classList.remove("is-dragging");
    if (noteFrame) {
      window.cancelAnimationFrame(noteFrame);
      noteFrame = null;
    }
    drag = null;
  });

  bgInput.addEventListener("change", async () => {
    const file = bgInput.files && bgInput.files[0];
    if (!file) return;
    const dataUrl = await readBackground(file);
    state.bg = dataUrl;
    applyBackgroundImage(dataUrl);
    state.bgX = 0;
    state.bgY = 0;
    state.bgScale = 100;
    applyState();
    setupPanel.classList.add("is-collapsed");
    saveState();
  });

  denomination.addEventListener("change", () => {
    state.denom = denomination.value;
    note.src = noteImages[state.denom] || foldedNoteSvg(state.denom);
    saveState();
  });

  bgXRange.addEventListener("input", () => {
    state.bgX = Number(bgXRange.value);
    bgXOutput.textContent = String(state.bgX);
    applyBackgroundOffset();
    saveState();
  });

  bgYRange.addEventListener("input", () => {
    state.bgY = Number(bgYRange.value);
    bgYOutput.textContent = String(state.bgY);
    applyBackgroundOffset();
    saveState();
  });

  bgScaleRange.addEventListener("input", () => {
    state.bgScale = Number(bgScaleRange.value);
    bgScaleOutput.textContent = `${state.bgScale}%`;
    applyBackgroundOffset();
    saveState();
  });

  sensitivityRange.addEventListener("input", () => {
    state.sensitivity = Number(sensitivityRange.value);
    sensitivityOutput.textContent = `${state.sensitivity} px`;
    saveState();
  });

  sizeRange.addEventListener("input", () => {
    state.size = Number(sizeRange.value);
    sizeOutput.textContent = `${state.size}%`;
    moveNote(state.x, state.y);
    saveState();
  });

  rotationRange.addEventListener("input", () => {
    state.rotation = Number(rotationRange.value);
    rotationOutput.textContent = `${state.rotation} deg`;
    moveNote(state.x, state.y);
    saveState();
  });

  edgeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.edge = button.dataset.edge || "right";
      applyState();
      saveState();
    });
  });

  settingsButton.addEventListener("click", () => {
    setupPanel.classList.remove("is-collapsed");
    showControls();
  });

  closeSetup.addEventListener("click", () => {
    setupPanel.classList.add("is-collapsed");
  });

  resetButton.addEventListener("click", resetNote);

  controlsHotspot.addEventListener("click", showControls);

  function handleViewportChange() {
    syncAppViewportSize();
    if (!state.hidden) resetNote();
    normalizeSavedBackground();
  }

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  syncAppViewportSize();
  loadState();
  normalizeSavedBackground();
  note.addEventListener("load", () => {
    if (!state.x && !state.y) defaultPosition();
    applyState();
  }, { once: true });
  applyState();
})();
