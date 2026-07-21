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
  const tiltButton = document.getElementById("tiltButton");
  const tiltCalibrateButton = document.getElementById("tiltCalibrateButton");
  const tiltStatus = document.getElementById("tiltStatus");
  const bgInput = document.getElementById("bgInput");
  const denomination = document.getElementById("denomination");
  const singleTabButton = document.getElementById("singleTabButton");
  const routineTabButton = document.getElementById("routineTabButton");
  const singleTab = document.getElementById("singleTab");
  const routineTab = document.getElementById("routineTab");
  const shakeRevealToggle = document.getElementById("shakeRevealToggle");
  const shakeStrengthRange = document.getElementById("shakeStrengthRange");
  const shakeStrengthOutput = document.getElementById("shakeStrengthOutput");
  const routineShakeNextToggle = document.getElementById("routineShakeNextToggle");
  const routineDenomination = document.getElementById("routineDenomination");
  const addRoutineItem = document.getElementById("addRoutineItem");
  const routineList = document.getElementById("routineList");
  const startRoutineButton = document.getElementById("startRoutineButton");
  const resetRoutineButton = document.getElementById("resetRoutineButton");
  const routineStatus = document.getElementById("routineStatus");
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
    "dkk20": ["#a99150", "#eadfae", "#695529"],
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
    "dkk20": "assets/20kr.png",
    "100": "assets/100kr.png",
    "200": "assets/200kr.png",
    "500": "assets/500kr.png",
    "eur50Big": "assets/50eur-big.png",
    "eur50Small": "assets/50eur-small.png"
  };

  const denominationLabels = {
    "dkk5": "5 kr",
    "dkk20": "20 kr",
    "50": "50 kr",
    "100": "100 kr",
    "200": "200 kr",
    "500": "500 kr",
    "1000": "1000 kr",
    "eur50Big": "50 euro stor",
    "eur50Small": "50 euro lille"
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
    hidden: false,
    awaitingReveal: false,
    shakeReveal: false,
    shakeStrength: 85,
    routineShakeNext: false,
    activeTab: "single",
    routineQueue: [],
    routineIndex: 0,
    routineActive: false,
    routineComplete: false
  };

  let drag = null;
  let controlsTimer = null;
  let noteFrame = null;
  let tiltFrame = null;
  let shakeReady = false;
  let shakeMotionReady = false;
  let shakeOrientationReady = false;
  let shakeLastMagnitude = null;
  let shakeLastOrientation = null;
  let shakeLastReveal = 0;

  const shake = {
    motionDeltaThreshold: 8,
    motionMagnitudeThreshold: 19,
    orientationDeltaThreshold: 16,
    orientationRateThreshold: 135,
    cooldown: 900
  };

  const tilt = {
    enabled: false,
    hasReading: false,
    beta: 0,
    gamma: 0,
    baseBeta: 0,
    baseGamma: 0,
    vx: 0,
    vy: 0,
    lastTime: null
  };

  const tiltPhysics = {
    degreesToAcceleration: 62,
    maxTiltDegrees: 24,
    frictionPerFrame: 0.996,
    bounceLoss: 0.76,
    maxSpeed: 1900,
    stopSpeed: 2.5
  };

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
    document.documentElement.style.setProperty("--setup-max-height", `${Math.round(size.cssHeight * 0.75)}px`);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const hadAwaitingReveal = Object.prototype.hasOwnProperty.call(saved, "awaitingReveal");
      Object.assign(state, saved);
      if (!Array.isArray(state.routineQueue)) state.routineQueue = [];
      state.routineQueue = state.routineQueue.filter((value) => denominationLabels[value]);
      state.routineIndex = clamp(Number(state.routineIndex) || 0, 0, Math.max(0, state.routineQueue.length - 1));
      state.activeTab = state.activeTab === "routine" ? "routine" : "single";
      state.shakeStrength = clamp(Number(state.shakeStrength) || 85, 40, 130);
      state.awaitingReveal = hadAwaitingReveal ? Boolean(state.awaitingReveal) : Boolean(state.shakeReveal);
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
        rotation: state.rotation,
        awaitingReveal: state.awaitingReveal,
        shakeReveal: state.shakeReveal,
        shakeStrength: state.shakeStrength,
        routineShakeNext: state.routineShakeNext,
        activeTab: state.activeTab,
        routineQueue: state.routineQueue,
        routineIndex: state.routineIndex,
        routineActive: state.routineActive,
        routineComplete: state.routineComplete
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
    if (routineDenomination) routineDenomination.value = state.denom;
    if (shakeRevealToggle) shakeRevealToggle.checked = Boolean(state.shakeReveal);
    if (shakeStrengthRange) shakeStrengthRange.value = String(state.shakeStrength);
    if (shakeStrengthOutput) shakeStrengthOutput.textContent = `${state.shakeStrength}%`;
    if (routineShakeNextToggle) routineShakeNextToggle.checked = Boolean(state.routineShakeNext);
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
    setActiveTab(state.activeTab || "single");
    renderRoutineList();

    edgeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.edge === state.edge));
    });

    moveNote(state.x, state.y);
    applyBackgroundOffset();
  }

  function applyBackgroundOffset() {
    homeBg.style.transform = `translate3d(${state.bgX}px, ${state.bgY}px, 0) scale(${state.bgScale / 100})`;
  }

  function denominationLabel(value) {
    return denominationLabels[value] || `${value} kr`;
  }

  function setActiveTab(tab) {
    const nextTab = tab === "routine" ? "routine" : "single";
    state.activeTab = nextTab;
    if (!singleTabButton || !routineTabButton || !singleTab || !routineTab) return;

    const isRoutine = nextTab === "routine";
    singleTabButton.setAttribute("aria-selected", String(!isRoutine));
    routineTabButton.setAttribute("aria-selected", String(isRoutine));
    singleTab.hidden = isRoutine;
    routineTab.hidden = !isRoutine;
  }

  function setNoteDenomination(value) {
    if (!denominationLabels[value]) return;
    state.denom = value;
    denomination.value = value;
    if (routineDenomination) routineDenomination.value = value;
    note.src = noteImages[state.denom] || foldedNoteSvg(state.denom);
  }

  function needsShakeForCurrentNote() {
    if (state.routineActive) return Boolean(state.routineShakeNext);
    return Boolean(state.shakeReveal);
  }

  function shakeStrengthFactor() {
    return clamp(Number(state.shakeStrength) || 85, 40, 130) / 60;
  }

  function hideNoteUntilReveal(promptForPermission = true) {
    state.hidden = true;
    state.awaitingReveal = true;
    note.classList.add("is-hidden");
    tilt.vx = 0;
    tilt.vy = 0;
    ensureShakeListener(promptForPermission);
  }

  function revealNote(pop) {
    if (!state.hidden) return;

    state.hidden = false;
    state.awaitingReveal = false;
    note.classList.remove("is-hidden");
    if (!state.x && !state.y) defaultPosition();
    moveNote(state.x, state.y);

    if (pop) {
      note.classList.remove("is-revealing");
      void note.offsetWidth;
      note.classList.add("is-revealing");
    }
  }

  async function requestSensorAccess(EventConstructor) {
    if (typeof EventConstructor === "undefined") return true;

    try {
      if (typeof EventConstructor.requestPermission === "function") {
        const permission = await EventConstructor.requestPermission();
        return permission === "granted";
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async function ensureShakeListener(promptForPermission = false) {
    if (shakeReady) return true;
    const supportsMotion = typeof window.DeviceMotionEvent !== "undefined";
    const supportsOrientation = typeof window.DeviceOrientationEvent !== "undefined";

    if (!supportsMotion && !supportsOrientation) {
      if (routineStatus) routineStatus.textContent = "Shake virker ikke i denne browser.";
      return false;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      if (routineStatus) routineStatus.textContent = "Shake kraever HTTPS paa telefonen.";
      return false;
    }

    let registered = false;

    if (supportsMotion && !shakeMotionReady) {
      const allowed = promptForPermission ? await requestSensorAccess(window.DeviceMotionEvent) : true;
      if (allowed) {
        window.addEventListener("devicemotion", handleDeviceMotion, true);
        shakeMotionReady = true;
        registered = true;
      }
    }

    if (supportsOrientation && !shakeOrientationReady) {
      const allowed = promptForPermission ? await requestSensorAccess(window.DeviceOrientationEvent) : true;
      if (allowed) {
        window.addEventListener("deviceorientation", handleShakeOrientation, true);
        shakeOrientationReady = true;
        registered = true;
      }
    }

    shakeReady = shakeMotionReady || shakeOrientationReady;
    if (!shakeReady) {
      if (routineStatus) routineStatus.textContent = "Bevaegelsessensor blev ikke tilladt.";
      return false;
    }

    return registered || shakeReady;
  }

  function triggerShakeReveal() {
    if (!state.hidden || !state.awaitingReveal || !needsShakeForCurrentNote()) return;

    const now = performance.now();
    if (now - shakeLastReveal < shake.cooldown) return;
    shakeLastReveal = now;
    revealNote(true);
    syncRoutineStatus();
    saveState();
  }

  function handleDeviceMotion(event) {
    const acceleration = event.accelerationIncludingGravity || event.acceleration;
    if (!acceleration) return;

    const x = Number(acceleration.x) || 0;
    const y = Number(acceleration.y) || 0;
    const z = Number(acceleration.z) || 0;
    const magnitude = Math.hypot(x, y, z);

    if (shakeLastMagnitude === null) {
      shakeLastMagnitude = magnitude;
      return;
    }

    const delta = Math.abs(magnitude - shakeLastMagnitude);
    shakeLastMagnitude = magnitude;

    const factor = shakeStrengthFactor();
    if (delta < shake.motionDeltaThreshold * factor && magnitude < shake.motionMagnitudeThreshold * factor) return;

    triggerShakeReveal();
  }

  function handleShakeOrientation(event) {
    if (typeof event.beta !== "number" || typeof event.gamma !== "number") return;

    const now = performance.now();
    if (!shakeLastOrientation) {
      shakeLastOrientation = {
        beta: event.beta,
        gamma: event.gamma,
        time: now
      };
      return;
    }

    const elapsed = Math.max(0.016, (now - shakeLastOrientation.time) / 1000);
    const delta = Math.hypot(
      event.beta - shakeLastOrientation.beta,
      event.gamma - shakeLastOrientation.gamma
    );
    const rate = delta / elapsed;
    shakeLastOrientation = {
      beta: event.beta,
      gamma: event.gamma,
      time: now
    };

    const factor = shakeStrengthFactor();
    if (delta < shake.orientationDeltaThreshold * factor && rate < shake.orientationRateThreshold * factor) return;

    triggerShakeReveal();
  }

  function syncRoutineStatus() {
    if (!routineStatus) return;

    if (!state.routineQueue.length) {
      routineStatus.textContent = "Rutinen er tom.";
      return;
    }

    if (state.routineComplete) {
      routineStatus.textContent = "Rutinen er faerdig.";
      return;
    }

    if (!state.routineActive) {
      routineStatus.textContent = `Klar: ${state.routineQueue.length} elementer i koeen.`;
      return;
    }

    const current = state.routineQueue[state.routineIndex];
    const revealText = state.hidden ? "Venter paa shake." : "Synlig nu.";
    routineStatus.textContent = `Op naeste: ${denominationLabel(current)}. ${revealText}`;
  }

  function renderRoutineList() {
    if (!routineList) return;

    routineList.replaceChildren();
    state.routineQueue.forEach((value, index) => {
      const item = document.createElement("li");
      item.className = "routine-item";
      item.classList.toggle("is-current", state.routineActive && !state.routineComplete && index === state.routineIndex);

      const label = document.createElement("span");
      label.textContent = `${denominationLabel(value)}${item.classList.contains("is-current") ? " - op naeste" : ""}`;

      const actions = document.createElement("span");
      actions.className = "routine-item-actions";

      const up = document.createElement("button");
      up.className = "routine-icon";
      up.type = "button";
      up.textContent = "^";
      up.setAttribute("aria-label", "Flyt op");
      up.disabled = index === 0;
      up.addEventListener("click", () => moveRoutineItem(index, -1));

      const down = document.createElement("button");
      down.className = "routine-icon";
      down.type = "button";
      down.textContent = "v";
      down.setAttribute("aria-label", "Flyt ned");
      down.disabled = index === state.routineQueue.length - 1;
      down.addEventListener("click", () => moveRoutineItem(index, 1));

      const remove = document.createElement("button");
      remove.className = "routine-icon";
      remove.type = "button";
      remove.textContent = "x";
      remove.setAttribute("aria-label", "Fjern");
      remove.addEventListener("click", () => removeRoutineItem(index));

      actions.append(up, down, remove);
      item.append(label, actions);
      routineList.append(item);
    });

    syncRoutineStatus();
  }

  function addRoutineQueueItem() {
    const value = routineDenomination ? routineDenomination.value : state.denom;
    if (!denominationLabels[value]) return;
    state.routineQueue.push(value);
    state.routineComplete = false;
    if (!state.routineActive) state.routineIndex = 0;
    renderRoutineList();
    saveState();
  }

  function moveRoutineItem(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.routineQueue.length) return;

    const [item] = state.routineQueue.splice(index, 1);
    state.routineQueue.splice(nextIndex, 0, item);
    if (state.routineActive) {
      if (state.routineIndex === index) state.routineIndex = nextIndex;
      else if (state.routineIndex === nextIndex) state.routineIndex = index;
    }
    renderRoutineList();
    saveState();
  }

  function removeRoutineItem(index) {
    state.routineQueue.splice(index, 1);
    if (state.routineIndex >= state.routineQueue.length) {
      state.routineIndex = Math.max(0, state.routineQueue.length - 1);
    }
    if (!state.routineQueue.length) {
      state.routineActive = false;
      state.routineComplete = false;
    }
    renderRoutineList();
    saveState();
  }

  function prepareCurrentRoutineItem() {
    const value = state.routineQueue[state.routineIndex];
    if (!value) return;

    setNoteDenomination(value);
    centerPosition();
    moveNote(state.x, state.y);

    if (state.routineShakeNext) {
      hideNoteUntilReveal();
    } else {
      state.hidden = true;
      note.classList.add("is-hidden");
      revealNote(true);
    }

    renderRoutineList();
    saveState();
  }

  function startRoutine() {
    if (!state.routineQueue.length) {
      syncRoutineStatus();
      return;
    }

    state.routineActive = true;
    state.routineComplete = false;
    state.routineIndex = clamp(state.routineIndex, 0, state.routineQueue.length - 1);
    setActiveTab("routine");
    prepareCurrentRoutineItem();
  }

  function resetRoutine() {
    state.routineIndex = 0;
    state.routineActive = false;
    state.routineComplete = false;
    state.awaitingReveal = false;
    renderRoutineList();
    saveState();
  }

  function advanceRoutineAfterUse() {
    if (!state.routineActive) return false;

    state.routineIndex += 1;
    if (state.routineIndex >= state.routineQueue.length) {
      state.routineActive = false;
      state.routineComplete = true;
      state.hidden = true;
      state.awaitingReveal = false;
      note.classList.add("is-hidden");
      renderRoutineList();
      saveState();
      return true;
    }

    prepareCurrentRoutineItem();
    return true;
  }

  function defaultPosition() {
    const rect = stage.getBoundingClientRect();
    const noteSize = notePhysicsSize();
    state.x = Math.max(18, rect.width - noteSize.width - 28);
    state.y = Math.max(80, rect.height - noteSize.height - 96);
  }

  function centerPosition() {
    const rect = stage.getBoundingClientRect();
    const noteSize = notePhysicsSize();
    state.x = Math.max(18, (rect.width - noteSize.width) / 2);
    state.y = Math.max(80, (rect.height - noteSize.height) / 2);
  }

  function moveNote(x, y) {
    state.x = x;
    state.y = y;
    note.style.setProperty("--note-x", `${x}px`);
    note.style.setProperty("--note-y", `${y}px`);
    note.style.setProperty("--note-rotation", `${state.rotation}deg`);
    note.style.setProperty("--note-scale", String(state.size / 100));
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

  function setTiltStatus(message) {
    if (tiltStatus) tiltStatus.textContent = message;
  }

  function updateTiltControls() {
    if (tiltButton) {
      tiltButton.textContent = tilt.enabled ? "Slå tilt fra" : "Slå tilt til";
      tiltButton.setAttribute("aria-pressed", String(tilt.enabled));
    }

    [tiltCalibrateButton].forEach((button) => {
      if (!button) return;
      button.disabled = !tilt.enabled || !tilt.hasReading;
    });
  }

  function handleDeviceOrientation(event) {
    if (typeof event.beta !== "number" || typeof event.gamma !== "number") return;

    tilt.beta = event.beta;
    tilt.gamma = event.gamma;

    if (!tilt.hasReading) {
      tilt.baseBeta = tilt.beta;
      tilt.baseGamma = tilt.gamma;
      setTiltStatus("Tilt aktiv. Nulpunktet er sat efter den nuværende vinkel.");
    }

    tilt.hasReading = true;
    updateTiltControls();
  }

  async function enableTilt() {
    if (tilt.enabled) {
      setTiltStatus(tilt.hasReading ? "Tilt er allerede aktiv." : "Tilt venter på sensor-data.");
      return;
    }

    if (typeof window.DeviceOrientationEvent === "undefined") {
      setTiltStatus("Denne browser tilbyder ikke bevægelsessensorer.");
      updateTiltControls();
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setTiltStatus("Tilt kræver HTTPS på telefonen.");
      updateTiltControls();
      return;
    }

    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        const permission = await window.DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          setTiltStatus("Tilt blev ikke tilladt.");
          updateTiltControls();
          return;
        }
      }

      window.addEventListener("deviceorientation", handleDeviceOrientation, true);
      tilt.enabled = true;
      tilt.hasReading = false;
      tilt.lastTime = null;
      setTiltStatus("Tilt aktiv. Hold telefonen roligt et øjeblik.");
      updateTiltControls();
      startTiltLoop();
    } catch (error) {
      setTiltStatus("Tilt kunne ikke aktiveres i denne browser.");
      updateTiltControls();
    }
  }

  function disableTilt() {
    if (!tilt.enabled) return;

    window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
    tilt.enabled = false;
    tilt.hasReading = false;
    tilt.vx = 0;
    tilt.vy = 0;
    tilt.lastTime = null;

    if (tiltFrame) {
      window.cancelAnimationFrame(tiltFrame);
      tiltFrame = null;
    }

    setTiltStatus("Tilt er slået fra.");
    updateTiltControls();
  }

  function toggleTilt() {
    if (tilt.enabled) {
      disableTilt();
      return;
    }

    enableTilt();
  }

  function calibrateTilt() {
    if (!tilt.enabled) {
      enableTilt();
      return;
    }

    if (!tilt.hasReading) {
      setTiltStatus("Venter på sensor-data før nulstilling.");
      return;
    }

    tilt.baseBeta = tilt.beta;
    tilt.baseGamma = tilt.gamma;
    tilt.vx *= 0.35;
    tilt.vy *= 0.35;
    setTiltStatus("Vandret nulpunkt er nulstillet.");
    updateTiltControls();
  }

  function notePhysicsSize() {
    const wasHidden = note.classList.contains("is-hidden");
    const previousVisibility = note.style.visibility;
    if (wasHidden) {
      note.style.visibility = "hidden";
      note.classList.remove("is-hidden");
    }

    const scale = state.size / 100;
    const fallbackWidth = Math.min(window.innerWidth * 0.52, 238);
    const width = note.offsetWidth || fallbackWidth;
    const heightRatio = note.naturalWidth && note.naturalHeight ? note.naturalHeight / note.naturalWidth : 0.42;
    const height = note.offsetHeight || width * heightRatio;
    const size = {
      width: Math.max(1, width * scale),
      height: Math.max(1, height * scale)
    };

    if (wasHidden) {
      note.classList.add("is-hidden");
      note.style.visibility = previousVisibility;
    }

    return size;
  }

  function bounceTiltAtEdges(nextX, nextY) {
    const stageRect = stage.getBoundingClientRect();
    const noteSize = notePhysicsSize();
    const maxX = Math.max(0, stageRect.width - noteSize.width);
    const maxY = Math.max(0, stageRect.height - noteSize.height);
    let x = nextX;
    let y = nextY;

    if (x < 0) {
      x = 0;
      if (tilt.vx < 0) tilt.vx = Math.abs(tilt.vx) * tiltPhysics.bounceLoss;
    } else if (x > maxX) {
      x = maxX;
      if (tilt.vx > 0) tilt.vx = -Math.abs(tilt.vx) * tiltPhysics.bounceLoss;
    }

    if (y < 0) {
      y = 0;
      if (tilt.vy < 0) tilt.vy = Math.abs(tilt.vy) * tiltPhysics.bounceLoss;
    } else if (y > maxY) {
      y = maxY;
      if (tilt.vy > 0) tilt.vy = -Math.abs(tilt.vy) * tiltPhysics.bounceLoss;
    }

    moveNote(x, y);
  }

  function startTiltLoop() {
    if (tiltFrame || !tilt.enabled) return;
    tiltFrame = window.requestAnimationFrame(updateTiltPhysics);
  }

  function updateTiltPhysics(time) {
    tiltFrame = null;

    if (!tilt.enabled) return;

    if (!tilt.lastTime) tilt.lastTime = time;
    const dt = Math.min(0.04, Math.max(0.001, (time - tilt.lastTime) / 1000));
    tilt.lastTime = time;

    if (state.hidden) {
      tilt.vx = 0;
      tilt.vy = 0;
      startTiltLoop();
      return;
    }

    if (drag) {
      startTiltLoop();
      return;
    }

    let ax = 0;
    let ay = 0;

    if (tilt.hasReading) {
      const gamma = clamp(tilt.gamma - tilt.baseGamma, -tiltPhysics.maxTiltDegrees, tiltPhysics.maxTiltDegrees);
      const beta = clamp(tilt.beta - tilt.baseBeta, -tiltPhysics.maxTiltDegrees, tiltPhysics.maxTiltDegrees);
      ax = gamma * tiltPhysics.degreesToAcceleration;
      ay = beta * tiltPhysics.degreesToAcceleration;
    }

    tilt.vx += ax * dt;
    tilt.vy += ay * dt;

    const damping = Math.pow(tiltPhysics.frictionPerFrame, dt * 60);
    tilt.vx = clamp(tilt.vx * damping, -tiltPhysics.maxSpeed, tiltPhysics.maxSpeed);
    tilt.vy = clamp(tilt.vy * damping, -tiltPhysics.maxSpeed, tiltPhysics.maxSpeed);

    if (Math.hypot(tilt.vx, tilt.vy) < tiltPhysics.stopSpeed && Math.hypot(ax, ay) < 1) {
      tilt.vx = 0;
      tilt.vy = 0;
    }

    if (tilt.vx || tilt.vy) {
      bounceTiltAtEdges(state.x + tilt.vx * dt, state.y + tilt.vy * dt);
    }

    startTiltLoop();
  }

  function showControls() {
    floatingControls.classList.add("is-visible");
    window.clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(() => {
      floatingControls.classList.remove("is-visible");
    }, 2800);
  }

  function resetNote() {
    tilt.vx = 0;
    tilt.vy = 0;
    state.routineActive = false;
    state.routineComplete = false;
    defaultPosition();
    moveNote(state.x, state.y);
    if (state.shakeReveal) {
      hideNoteUntilReveal();
    } else {
      state.hidden = false;
      state.awaitingReveal = false;
      note.classList.remove("is-hidden");
    }
    renderRoutineList();
    saveState();
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
    state.awaitingReveal = false;
    tilt.vx = 0;
    tilt.vy = 0;
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
    if (!advanceRoutineAfterUse()) saveState();
  }

  function endDrag(inheritVelocity) {
    if (!drag) return;

    const finishedDrag = drag;
    note.classList.remove("is-dragging");
    if (noteFrame) {
      window.cancelAnimationFrame(noteFrame);
      noteFrame = null;
    }

    drag = null;

    if (inheritVelocity && !state.hidden) {
      tilt.vx = clamp(finishedDrag.velocityX || 0, -tiltPhysics.maxSpeed, tiltPhysics.maxSpeed);
      tilt.vy = clamp(finishedDrag.velocityY || 0, -tiltPhysics.maxSpeed, tiltPhysics.maxSpeed);
      startTiltLoop();
    }
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
    tilt.vx = 0;
    tilt.vy = 0;
    drag = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: event.clientX - state.x,
      offsetY: event.clientY - state.y,
      targetX: state.x,
      targetY: state.y,
      velocityX: 0,
      velocityY: 0,
      pointerTime: performance.now(),
      lastTime: performance.now()
    };
  });

  note.addEventListener("click", (event) => {
    event.preventDefault();
  });

  note.addEventListener("animationend", () => {
    note.classList.remove("is-revealing");
  });

  note.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(0.008, (now - drag.pointerTime) / 1000);
    drag.velocityX = (event.clientX - drag.pointerX) / elapsed;
    drag.velocityY = (event.clientY - drag.pointerY) / elapsed;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    drag.pointerTime = now;
    drag.targetX = event.clientX - drag.offsetX;
    drag.targetY = event.clientY - drag.offsetY;
    updateReactiveNote();
    if (crossedExitEdge(note.getBoundingClientRect())) hideAtEdge();
  });

  note.addEventListener("pointerup", () => {
    endDrag(true);
  });

  note.addEventListener("pointercancel", () => {
    endDrag(false);
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
    state.routineActive = false;
    state.routineComplete = false;
    setNoteDenomination(denomination.value);
    if (state.shakeReveal) {
      hideNoteUntilReveal();
    } else {
      state.hidden = false;
      state.awaitingReveal = false;
      note.classList.remove("is-hidden");
    }
    renderRoutineList();
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

  singleTabButton.addEventListener("click", () => {
    setActiveTab("single");
    saveState();
  });

  routineTabButton.addEventListener("click", () => {
    setActiveTab("routine");
    saveState();
  });

  shakeRevealToggle.addEventListener("change", () => {
    state.shakeReveal = shakeRevealToggle.checked;
    state.routineActive = false;
    state.routineComplete = false;
    if (state.shakeReveal) {
      hideNoteUntilReveal();
    } else {
      state.awaitingReveal = false;
      revealNote(true);
    }
    renderRoutineList();
    saveState();
  });

  shakeStrengthRange.addEventListener("input", () => {
    state.shakeStrength = Number(shakeStrengthRange.value);
    shakeStrengthOutput.textContent = `${state.shakeStrength}%`;
    saveState();
  });

  routineShakeNextToggle.addEventListener("change", () => {
    state.routineShakeNext = routineShakeNextToggle.checked;
    if (state.routineActive) {
      if (state.routineShakeNext) hideNoteUntilReveal();
      else revealNote(true);
    }
    renderRoutineList();
    saveState();
  });

  addRoutineItem.addEventListener("click", addRoutineQueueItem);

  startRoutineButton.addEventListener("click", startRoutine);

  resetRoutineButton.addEventListener("click", resetRoutine);

  settingsButton.addEventListener("click", () => {
    setupPanel.classList.remove("is-collapsed");
    floatingControls.classList.remove("is-visible");
    window.clearTimeout(controlsTimer);
    if (state.hidden && needsShakeForCurrentNote()) ensureShakeListener(true);
  });

  closeSetup.addEventListener("click", () => {
    setupPanel.classList.add("is-collapsed");
  });

  resetButton.addEventListener("click", resetNote);

  tiltButton.addEventListener("click", toggleTilt);

  tiltCalibrateButton.addEventListener("click", calibrateTilt);

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

  updateTiltControls();
  syncAppViewportSize();
  loadState();
  if (state.routineComplete) {
    state.routineActive = false;
    state.hidden = true;
    state.awaitingReveal = false;
  } else if (state.routineActive && state.routineQueue.length) {
    state.routineIndex = clamp(state.routineIndex, 0, state.routineQueue.length - 1);
    state.denom = state.routineQueue[state.routineIndex];
    state.hidden = Boolean(state.routineShakeNext);
    state.awaitingReveal = Boolean(state.routineShakeNext && state.awaitingReveal);
  } else {
    state.routineActive = false;
    state.hidden = Boolean(state.shakeReveal);
    state.awaitingReveal = Boolean(state.shakeReveal && state.awaitingReveal);
  }
  normalizeSavedBackground();
  note.addEventListener("load", () => {
    if (!state.x && !state.y) defaultPosition();
    applyState();
  }, { once: true });
  applyState();
  if (state.hidden && needsShakeForCurrentNote()) ensureShakeListener();
})();
