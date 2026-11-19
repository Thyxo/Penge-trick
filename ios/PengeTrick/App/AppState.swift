// Appens tilstand: baggrund, sedlen (plads, synlig, træk/glid), ryst, tilt og rutinen.
import QuartzCore
import SwiftUI
import UIKit

@MainActor @Observable
final class AppState {
    var s = Settings.load() { didSet { if s != oldValue { s.save(); changed(from: oldValue) } } }

    var bounds = Vec(x: 393, y: 852)
    var background: UIImage?
    var customNotes: [Denomination] = []
    var secretOpen = false

    // Sedlen
    var current = "100"
    var pos = Vec(x: 0, y: 0)
    var visible = false
    var dragging = false
    var awaitingShake = false
    var routine = RoutineRun(queue: [])
    var status = ""

    @ObservationIgnored private var vel = Vec.zero
    @ObservationIgnored private var dragOffset = Vec.zero
    @ObservationIgnored private var exiting = false
    @ObservationIgnored private var link: CADisplayLink?
    @ObservationIgnored private var lastTick: CFTimeInterval = 0
    @ObservationIgnored private var cache: [String: UIImage] = [:]
    @ObservationIgnored private var started = false
    @ObservationIgnored private var active = true
    @ObservationIgnored private var revealTask: Task<Void, Never>?
    @ObservationIgnored let motion = Motion()
    @ObservationIgnored let haptics = Haptics()

    var all: [Denomination] { Denomination.builtIn + customNotes }
    var knownIDs: Set<String> { Set(all.map(\.id)) }
    func label(_ id: String) -> String { all.first { $0.id == id }?.label ?? id }

    // MARK: Start

    /// Kaldes når scenen kender sin størrelse
    func setBounds(_ size: CGSize) {
        guard size.width > 0, size.height > 0 else { return }
        bounds = Vec(x: Double(size.width), y: Double(size.height))
        guard !started else { return }
        started = true
        loadCustomNotes()
        processBackground()
        motion.threshold = s.shakeStrength
        motion.onShake = { [weak self] in self?.shaken() }
        arm()
        if background == nil {
            Task {
                try? await Task.sleep(for: .milliseconds(400))
                secretOpen = true
            }
        }
    }

    func scene(active a: Bool) {
        active = a
        if a { updateMotion() } else { motion.stop(); stopLink() }
    }

    private func changed(from old: Settings) {
        if old.scrubStatusBar != s.scrubStatusBar { processBackground() }
        if old.shakeStrength != s.shakeStrength { motion.threshold = s.shakeStrength }
        if old.tilt != s.tilt { if s.tilt { motion.calibrate() }; updateMotion() }
    }

    /// Klar til tricket: læg sedlen (eller rutinens første) på plads – skjult hvis den skal rystes frem
    func arm() {
        revealTask?.cancel()
        stopLink()
        exiting = false
        dragging = false
        vel = .zero
        var t = Transaction()
        t.disablesAnimations = true
        withTransaction(t) {
            if s.mode == "routine" {
                routine = RoutineRun(queue: s.routine.onlyKnown(knownIDs))
                if let first = routine.current {
                    place(first, center: true)
                    awaitingShake = s.routineShake
                    visible = !awaitingShake
                    status = "Rutine: \(routine.progress)"
                } else {
                    visible = false
                    awaitingShake = false
                    status = "Rutinen er tom"
                }
            } else {
                let id = knownIDs.contains(s.denom) ? s.denom : "100"
                place(id, center: false)
                awaitingShake = s.shakeReveal
                visible = !awaitingShake
                status = awaitingShake ? "Venter på ryst" : "Klar"
            }
        }
        updateMotion()
    }

    private func place(_ id: String, center: Bool) {
        current = id
        let size = noteSize
        pos = center ? NotePhysics.center(bounds: bounds) : NotePhysics.home(bounds: bounds, noteSize: size)
    }

    func panelClosed() { arm() }

    /// Hold øverst til højre: start forfra
    func resetPressed() {
        if s.haptics { haptics.tap() }
        arm()
    }

    // MARK: Sedlens billede

    var noteSize: Vec {
        let w = min(bounds.x * 0.52, 238) * s.size
        let img = image(current)
        let ratio = img.map { Double($0.size.height / max(1, $0.size.width)) } ?? 1.9
        return Vec(x: w, y: w * ratio)
    }

    func image(_ id: String) -> UIImage? {
        if let i = cache[id] { return i }
        guard let d = all.first(where: { $0.id == id }) else { return nil }
        let url = d.custom ? Images.notesDir.appendingPathComponent(d.file)
            : Bundle.main.bundleURL.appendingPathComponent("Notes").appendingPathComponent(d.file)
        let img = UIImage(contentsOfFile: url.path)
        cache[id] = img
        return img
    }

    // MARK: Træk

    func dragChanged(location: CGPoint, start: CGPoint) {
        guard visible, !exiting else { return }
        if !dragging {
            dragging = true
            stopLink()
            dragOffset = pos - Vec(x: Double(start.x), y: Double(start.y))
        }
        let target = Vec(x: Double(location.x), y: Double(location.y)) + dragOffset
        withAnimation(.interactiveSpring(response: NotePhysics.followResponse(lag: s.lag), dampingFraction: 0.86)) {
            pos = target
        }
        if NotePhysics.crossedExit(center: target, bounds: bounds, edge: s.edge, sensitivity: s.sensitivity) { exit() }
    }

    func dragEnded(velocity: CGSize) {
        guard dragging else { return }
        dragging = false
        guard visible, !exiting else { return }
        vel = s.flick ? NotePhysics.clampSpeed(Vec(x: Double(velocity.width), y: Double(velocity.height))) : .zero
        if vel.length > 250 || s.tilt { startLink() } else { vel = .zero }
    }

    // MARK: Glid (kast og tilt)

    private func startLink() {
        guard link == nil else { return }
        lastTick = CACurrentMediaTime()
        let l = CADisplayLink(target: LinkTarget { [weak self] in MainActor.assumeIsolated { self?.tick() } },
                              selector: #selector(LinkTarget.fire))
        l.add(to: .main, forMode: .common)
        link = l
    }

    private func stopLink() {
        link?.invalidate()
        link = nil
    }

    private func tick() {
        let now = CACurrentMediaTime()
        let dt = min(1.0 / 30, max(1.0 / 240, now - lastTick))
        lastTick = now
        guard visible, !exiting, !dragging else {
            vel = .zero
            if !s.tilt || !visible { stopLink() }
            return
        }
        let accel = s.tilt ? Tilt.accel(gravity: motion.gravity, base: motion.base) : .zero
        var p = pos, v = vel
        let r = NotePhysics.step(pos: &p, vel: &v, accel: accel, dt: dt, bounds: bounds,
                                 noteSize: noteSize, edge: s.edge, sensitivity: s.sensitivity)
        vel = v
        var t = Transaction()
        t.disablesAnimations = true
        withTransaction(t) { pos = p }
        switch r {
        case .exited: exit()
        case .stopped: if !s.tilt { stopLink() }
        case .moving: break
        }
    }

    // MARK: Forsvind og vis

    private func exit() {
        guard visible, !exiting else { return }
        exiting = true
        dragging = false
        stopLink()
        if s.haptics { haptics.exit() }
        withAnimation(.easeIn(duration: 0.2)) { visible = false }
        revealTask?.cancel()
        revealTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(260))
            guard !Task.isCancelled else { return }
            self?.afterExit()
        }
    }

    private func afterExit() {
        exiting = false
        vel = .zero
        guard s.mode == "routine" else { status = "Trukket ud"; return }
        guard let next = routine.advance() else { status = "Rutinen er færdig"; updateMotion(); return }
        place(next, center: true)
        status = "Rutine: \(routine.progress)"
        if s.routineShake {
            awaitingShake = true
            updateMotion()
        } else {
            revealTask = Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(550))
                guard !Task.isCancelled else { return }
                self?.reveal()
            }
        }
    }

    private func shaken() {
        guard awaitingShake, !secretOpen, !visible else { return }
        reveal()
    }

    func reveal() {
        awaitingShake = false
        withAnimation(revealAnimation) { visible = true }
        updateMotion()
    }

    private var revealAnimation: Animation {
        switch s.reveal {
        case .pop: return .spring(response: 0.3, dampingFraction: 0.66)
        case .fade: return .easeOut(duration: 0.35)
        case .slide: return .spring(response: 0.5, dampingFraction: 0.86)
        }
    }

    // MARK: Bevægelse

    private func updateMotion() {
        guard active else { return }
        if awaitingShake || s.tilt { motion.start() } else { motion.stop() }
        if s.tilt && visible && !dragging { startLink() }
    }

    // MARK: Baggrund

    func importBackground(_ data: Data) {
        guard UIImage(data: data) != nil else { status = "Kunne ikke læse billedet"; return }
        try? data.write(to: Images.backgroundFile, options: .atomic)
        s.bgX = 0
        s.bgY = 0
        s.bgScale = 1
        processBackground()
    }

    func processBackground() {
        guard let original = UIImage(contentsOfFile: Images.backgroundFile.path) else { background = nil; return }
        let window = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first
        let scale = window?.screen.scale ?? 3
        let safeTop = window?.safeAreaInsets.top ?? 59
        let px = CGSize(width: (bounds.x * scale).rounded(), height: (bounds.y * scale).rounded())
        // Statuslinjen slutter lidt over det sikre område; ikonerne starter et stykke under det
        let top = s.scrubStatusBar ? ((max(20, safeTop) - 4) * scale).rounded() : 0
        background = Images.fill(Images.normalized(original, maxPx: 4000), to: px, scrubTop: top)
    }

    func removeBackground() {
        try? FileManager.default.removeItem(at: Images.backgroundFile)
        background = nil
    }

    // MARK: Egne sedler

    func loadCustomNotes() {
        let fm = FileManager.default
        let files = (try? fm.contentsOfDirectory(at: Images.notesDir, includingPropertiesForKeys: [.creationDateKey])) ?? []
        let sorted = files.filter { $0.pathExtension == "png" }.sorted {
            let a = (try? $0.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            let b = (try? $1.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            return a < b
        }
        customNotes = sorted.enumerated().map { i, url in
            Denomination(id: Denomination.customID(url.deletingPathExtension().lastPathComponent),
                         label: "Egen \(i + 1)", file: url.lastPathComponent, custom: true)
        }
    }

    func addCustomNote(_ data: Data) async {
        status = "Klipper sedlen fri …"
        guard let img = await Images.cutout(data), let png = img.pngData() else { status = "Kunne ikke læse billedet"; return }
        try? FileManager.default.createDirectory(at: Images.notesDir, withIntermediateDirectories: true)
        let uuid = UUID().uuidString
        try? png.write(to: Images.notesDir.appendingPathComponent("\(uuid).png"), options: .atomic)
        loadCustomNotes()
        s.denom = Denomination.customID(uuid)
        status = "Egen seddel tilføjet"
    }

    func deleteCustomNote(_ d: Denomination) {
        guard d.custom else { return }
        try? FileManager.default.removeItem(at: Images.notesDir.appendingPathComponent(d.file))
        cache[d.id] = nil
        loadCustomNotes()
        s.routine = s.routine.onlyKnown(knownIDs)
        if !knownIDs.contains(s.denom) { s.denom = "100" }
    }
}

/// CADisplayLink kræver et NSObject-mål
private final class LinkTarget: NSObject {
    let fire_: () -> Void
    init(_ f: @escaping () -> Void) { fire_ = f }
    @objc func fire() { fire_() }
}
