(function () {
  "use strict";

  const storageKey = "penge-trick:v1";
  const stage = document.getElementById("stage");
  const note = document.getElementById("note");
  const homeBg = document.getElementById("homeBg");
  const setupPanel = document.getElementById("setupPanel");
  const settingsButton = document.getElementById("settingsButton");
  const closeSetup = document.getElementById("closeSetup");
  const resetButton = document.getElementById("resetButton");
  const bgInput = document.getElementById("bgInput");
  const denomination = document.getElementById("denomination");
  const sizeRange = document.getElementById("sizeRange");
  const sizeOutput = document.getElementById("sizeOutput");
  const rotationRange = document.getElementById("rotationRange");
  const rotationOutput = document.getElementById("rotationOutput");
  const edgeButtons = Array.from(document.querySelectorAll("[data-edge]"));

  const noteColors = {
    "50": ["#704538", "#cda26d", "#64352e"],
    "100": ["#c88765", "#f0cf91", "#8d563f"],
    "200": ["#6f8f75", "#c8d8a1", "#3f654a"],
    "500": ["#526d94", "#b7c8dc", "#314b72"],
    "1000": ["#8d626f", "#dac0c9", "#68404f"]
  };

  const state = {
    bg: "",
    denom: "100",
    edge: "right",
    size: 100,
    rotation: -7,
    x: 0,
    y: 0,
    hidden: false
  };

  let drag = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      Object.assign(state, saved);
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify({
      bg: state.bg,
      denom: state.denom,
      edge: state.edge,
      size: state.size,
      rotation: state.rotation
    }));
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
      homeBg.src = state.bg;
      homeBg.classList.add("is-loaded");
      setupPanel.classList.add("is-collapsed");
    }

    denomination.value = state.denom;
    sizeRange.value = String(state.size);
    rotationRange.value = String(state.rotation);
    sizeOutput.textContent = `${state.size}%`;
    rotationOutput.textContent = `${state.rotation} deg`;
    note.src = foldedNoteSvg(state.denom);
    note.classList.toggle("is-hidden", state.hidden);

    edgeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.edge === state.edge));
    });

    moveNote(state.x, state.y);
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

  function resetNote() {
    state.hidden = false;
    note.classList.remove("is-hidden");
    defaultPosition();
    moveNote(state.x, state.y);
  }

  function crossedExitEdge(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (state.edge === "left") return centerX <= 0;
    if (state.edge === "right") return centerX >= vw;
    if (state.edge === "top") return centerY <= 0;
    return centerY >= vh;
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
    drag = null;
  }

  function resizeBackground(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const width = Math.max(320, Math.round(window.innerWidth * window.devicePixelRatio));
          const height = Math.max(480, Math.round(window.innerHeight * window.devicePixelRatio));
          const scale = Math.max(width / image.width, height / image.height);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  note.addEventListener("pointerdown", (event) => {
    if (state.hidden) return;
    event.preventDefault();
    note.setPointerCapture(event.pointerId);
    note.classList.add("is-dragging");
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      noteX: state.x,
      noteY: state.y
    };
  });

  note.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = drag.noteX + event.clientX - drag.startX;
    const nextY = drag.noteY + event.clientY - drag.startY;
    moveNote(nextX, nextY);
    if (crossedExitEdge(note.getBoundingClientRect())) hideAtEdge();
  });

  note.addEventListener("pointerup", () => {
    note.classList.remove("is-dragging");
    drag = null;
  });

  note.addEventListener("pointercancel", () => {
    note.classList.remove("is-dragging");
    drag = null;
  });

  bgInput.addEventListener("change", async () => {
    const file = bgInput.files && bgInput.files[0];
    if (!file) return;
    const dataUrl = await resizeBackground(file);
    state.bg = dataUrl;
    homeBg.src = dataUrl;
    homeBg.classList.add("is-loaded");
    setupPanel.classList.add("is-collapsed");
    saveState();
  });

  denomination.addEventListener("change", () => {
    state.denom = denomination.value;
    note.src = foldedNoteSvg(state.denom);
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
  });

  closeSetup.addEventListener("click", () => {
    setupPanel.classList.add("is-collapsed");
  });

  resetButton.addEventListener("click", resetNote);

  window.addEventListener("resize", () => {
    if (!state.hidden) resetNote();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  loadState();
  note.addEventListener("load", () => {
    if (!state.x && !state.y) defaultPosition();
    applyState();
  }, { once: true });
  applyState();
})();
