// Sedlens bevægelse: forsvindingskant, glid (kast/tilt) med friktion og afvisning fra de andre kanter.
import Foundation

struct Vec: Equatable {
    var x: Double
    var y: Double
    static let zero = Vec(x: 0, y: 0)
    static func + (a: Vec, b: Vec) -> Vec { Vec(x: a.x + b.x, y: a.y + b.y) }
    static func - (a: Vec, b: Vec) -> Vec { Vec(x: a.x - b.x, y: a.y - b.y) }
    static func * (a: Vec, k: Double) -> Vec { Vec(x: a.x * k, y: a.y * k) }
    var length: Double { (x * x + y * y).squareRoot() }
}

enum NotePhysics {
    static let maxSpeed = 2600.0      // pt/s
    static let friction = 2.2         // pr. sekund (eksponentielt)
    static let bounceLoss = 0.55
    static let stopSpeed = 8.0

    /// Er sedlens centrum nået forbi forsvindingslinjen?
    static func crossedExit(center c: Vec, bounds: Vec, edge: ExitEdge, sensitivity: Double) -> Bool {
        switch edge {
        case .left: return c.x <= sensitivity
        case .right: return c.x >= bounds.x - sensitivity
        case .top: return c.y <= sensitivity
        case .bottom: return c.y >= bounds.y - sensitivity
        }
    }

    /// Et punkt helt uden for skærmen ved kanten (hvor sedlen glider hen/ind fra)
    static func offscreen(from c: Vec, bounds: Vec, edge: ExitEdge, noteSize: Vec) -> Vec {
        let m = max(noteSize.x, noteSize.y)
        switch edge {
        case .left: return Vec(x: -m, y: c.y)
        case .right: return Vec(x: bounds.x + m, y: c.y)
        case .top: return Vec(x: c.x, y: -m)
        case .bottom: return Vec(x: c.x, y: bounds.y + m)
        }
    }

    /// Standardplads: nederst til højre (som i webappen)
    static func home(bounds: Vec, noteSize: Vec) -> Vec {
        Vec(x: max(18 + noteSize.x / 2, bounds.x - noteSize.x / 2 - 28),
            y: max(80 + noteSize.y / 2, bounds.y - noteSize.y / 2 - 96))
    }

    static func center(bounds: Vec) -> Vec { Vec(x: bounds.x / 2, y: bounds.y / 2) }

    static func clampSpeed(_ v: Vec) -> Vec {
        let l = v.length
        return l > maxSpeed ? v * (maxSpeed / l) : v
    }

    enum Step: Equatable { case moving, stopped, exited }

    /// Ét tidsskridt. Sedlen preller af alle kanter undtagen forsvindingskanten.
    static func step(pos: inout Vec, vel: inout Vec, accel: Vec, dt: Double,
                     bounds: Vec, noteSize: Vec, edge: ExitEdge, sensitivity: Double) -> Step {
        vel = clampSpeed((vel + accel * dt) * exp(-friction * dt))
        pos = pos + vel * dt

        let hx = noteSize.x / 2, hy = noteSize.y / 2
        if edge != .left, pos.x < hx { pos.x = hx; if vel.x < 0 { vel.x = -vel.x * bounceLoss } }
        if edge != .right, pos.x > bounds.x - hx { pos.x = bounds.x - hx; if vel.x > 0 { vel.x = -vel.x * bounceLoss } }
        if edge != .top, pos.y < hy { pos.y = hy; if vel.y < 0 { vel.y = -vel.y * bounceLoss } }
        if edge != .bottom, pos.y > bounds.y - hy { pos.y = bounds.y - hy; if vel.y > 0 { vel.y = -vel.y * bounceLoss } }

        if crossedExit(center: pos, bounds: bounds, edge: edge, sensitivity: sensitivity) { return .exited }
        if vel.length < stopSpeed && accel.length < 1 { vel = .zero; return .stopped }
        return .moving
    }

    /// Hvor langt sedlen hænger efter fingeren: træghed 0…1 → fjederens svartid (sek.)
    static func followResponse(lag: Double) -> Double { 0.04 + max(0, min(1, lag)) * 0.3 }
}

/// "Ryst telefonen": mindst `required` kraftige stød over `threshold` g inden for `window` sek.
struct ShakeDetector {
    var threshold = 1.6
    var required = 2
    var window = 0.8
    var minSpacing = 0.09
    var cooldown = 1.2
    private var peaks: [Double] = []
    private var lastTrigger = -Double.infinity

    init(threshold: Double = 1.6) { self.threshold = threshold }

    mutating func reset() { peaks.removeAll() }

    /// userAcceleration i g. Returnerer true ved ryst.
    mutating func push(_ a: (Double, Double, Double), t: Double) -> Bool {
        let m = (a.0 * a.0 + a.1 * a.1 + a.2 * a.2).squareRoot()
        if m > threshold, t - (peaks.last ?? -Double.infinity) >= minSpacing { peaks.append(t) }
        while let f = peaks.first, t - f > window { peaks.removeFirst() }
        guard peaks.count >= required, t - lastTrigger >= cooldown else { return false }
        lastTrigger = t
        peaks.removeAll()
        return true
    }
}

/// Tilt: tyngdekraften i telefonens akser (x højre, y op) → acceleration på skærmen (pt/s²)
enum Tilt {
    static let gain = 2400.0
    static let deadZone = 0.03

    static func accel(gravity g: (Double, Double), base: (Double, Double)) -> Vec {
        func dz(_ v: Double) -> Double { abs(v) < deadZone ? 0 : v - (v > 0 ? deadZone : -deadZone) }
        return Vec(x: dz(g.0 - base.0) * gain, y: -dz(g.1 - base.1) * gain)
    }
}
