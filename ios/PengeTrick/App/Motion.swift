// CoreMotion: ryst (vis sedlen) og tyngdekraft (tilt). Kræver ingen tilladelse.
import CoreMotion

@MainActor
final class Motion {
    private let manager = CMMotionManager()
    private var shake = ShakeDetector()
    private var needsBase = true

    var onShake: (() -> Void)?
    private(set) var gravity = (0.0, -1.0)
    private(set) var base = (0.0, -1.0)

    var threshold: Double {
        get { shake.threshold }
        set { shake.threshold = newValue }
    }

    var running: Bool { manager.isDeviceMotionActive }

    func start() {
        guard manager.isDeviceMotionAvailable, !manager.isDeviceMotionActive else { return }
        shake.reset()
        needsBase = true
        manager.deviceMotionUpdateInterval = 1.0 / 60
        manager.startDeviceMotionUpdates(to: .main) { [weak self] m, _ in
            guard let m else { return }
            MainActor.assumeIsolated { self?.handle(m) }
        }
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
        shake.reset()
    }

    /// Den nuværende hældning bliver "vandret" for tilt
    func calibrate() { needsBase = true }

    private func handle(_ m: CMDeviceMotion) {
        gravity = (m.gravity.x, m.gravity.y)
        if needsBase { base = gravity; needsBase = false }
        let a = m.userAcceleration
        if shake.push((a.x, a.y, a.z), t: m.timestamp) { onShake?() }
    }
}
