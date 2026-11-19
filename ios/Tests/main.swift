// Hurtig test af fysik, ryst, rutine og indstillinger (kører i CI før buildet):
// swiftc ios/PengeTrick/Model/*.swift ios/Tests/main.swift -o /tmp/t && /tmp/t
import Foundation

var failures = 0
func check(_ ok: Bool, _ msg: String) { if !ok { failures += 1; print("FEJL:", msg) } else { print("ok:", msg) } }

let bounds = Vec(x: 393, y: 852)
let note = Vec(x: 200, y: 380)

// 1. Forsvindingskant
check(NotePhysics.crossedExit(center: Vec(x: 340, y: 400), bounds: bounds, edge: .right, sensitivity: 60), "højre: forbi linjen")
check(!NotePhysics.crossedExit(center: Vec(x: 320, y: 400), bounds: bounds, edge: .right, sensitivity: 60), "højre: før linjen")
check(NotePhysics.crossedExit(center: Vec(x: 200, y: -1), bounds: bounds, edge: .top, sensitivity: 0), "top uden margen")
check(!NotePhysics.crossedExit(center: Vec(x: 10, y: 400), bounds: bounds, edge: .right, sensitivity: 60), "venstre side tæller ikke ved højre kant")

// 2. Standardplads er på skærmen og ikke forbi kanten
let home = NotePhysics.home(bounds: bounds, noteSize: note)
check(home.x + note.x / 2 <= bounds.x && home.y + note.y / 2 <= bounds.y, "standardplads inden for skærmen (\(home))")
check(!NotePhysics.crossedExit(center: home, bounds: bounds, edge: .right, sensitivity: 60), "standardplads udløser ikke højre kant")

// 3. Kast mod forsvindingskanten → forsvinder
do {
    var p = NotePhysics.center(bounds: bounds), v = Vec(x: 1800, y: 0)
    var r = NotePhysics.Step.moving
    for _ in 0..<240 where r == .moving { r = NotePhysics.step(pos: &p, vel: &v, accel: .zero, dt: 1 / 60, bounds: bounds, noteSize: note, edge: .right, sensitivity: 60) }
    check(r == .exited, "kast mod højre forsvinder (\(r))")
}

// 4. Kast mod en anden kant (op) → preller af og standser på skærmen
do {
    var p = NotePhysics.center(bounds: bounds), v = Vec(x: 0, y: -2000)
    var r = NotePhysics.Step.moving
    for _ in 0..<1200 where r == .moving { r = NotePhysics.step(pos: &p, vel: &v, accel: .zero, dt: 1 / 60, bounds: bounds, noteSize: note, edge: .right, sensitivity: 60) }
    check(r == .stopped, "kast op standser (\(r))")
    check(p.x >= note.x / 2 - 0.001 && p.y <= bounds.y - note.y / 2 + 0.001, "bliver på skærmen (\(p))")
}

// 5. Langsomt kast standser inden kanten
do {
    var p = NotePhysics.center(bounds: bounds), v = Vec(x: 120, y: 0)
    var r = NotePhysics.Step.moving
    for _ in 0..<600 where r == .moving { r = NotePhysics.step(pos: &p, vel: &v, accel: .zero, dt: 1 / 60, bounds: bounds, noteSize: note, edge: .right, sensitivity: 60) }
    check(r == .stopped, "blødt kast standser (\(r), x \(Int(p.x)))")
}

// 6. Tilt: vip mod højre → acceleration mod højre; vandret → ingen
check(Tilt.accel(gravity: (0.3, -0.9), base: (0, -0.9)).x > 0, "tilt højre giver +x")
check(Tilt.accel(gravity: (0.01, -0.9), base: (0, -0.9)).length == 0, "dødzone")
check(Tilt.accel(gravity: (0, -0.6), base: (0, -0.9)).y < 0, "vip toppen bagover → op")

// 7. Ryst: to kraftige stød inden for vinduet; let rysten tæller ikke
do {
    var s = ShakeDetector(threshold: 1.6)
    check(!s.push((0.4, 0.2, 0.1), t: 0), "roligt: intet ryst")
    check(!s.push((1.9, 0, 0), t: 0.10), "første stød alene udløser ikke")
    check(s.push((0, -2.1, 0), t: 0.35), "andet stød udløser")
    check(!s.push((2.5, 0, 0), t: 0.6) && !s.push((2.5, 0, 0), t: 0.8), "pause efter udløsning")
    var weak = ShakeDetector(threshold: 1.6)
    var hit = false
    for i in 0..<60 { hit = hit || weak.push((1.2, 0.3, 0), t: Double(i) * 0.05) }
    check(!hit, "under tærsklen udløser aldrig")
    var slow = ShakeDetector(threshold: 1.6)
    check(!slow.push((2, 0, 0), t: 0) && !slow.push((2, 0, 0), t: 1.5), "stød for langt fra hinanden")
}

// 8. Rutine
do {
    var r = RoutineRun(queue: ["dkk20", "100", "500"])
    check(r.current == "dkk20" && r.progress == "1 af 3", "rutine starter ved første")
    check(r.advance() == "100", "næste")
    check(r.advance() == "500", "sidste")
    check(r.advance() == nil && r.done && r.current == nil, "færdig")
    check(r.advance() == nil, "bliver færdig")
    r.restart()
    check(r.current == "dkk20" && !r.done, "genstart")
    check(RoutineRun(queue: []).done, "tom rutine er færdig")
    check(["100", "custom:x", "200"].onlyKnown(["100", "200"]) == ["100", "200"], "ukendte sedler fjernes")
}

// 9. Indstillinger: gamle gemte data uden nye felter får standardværdier
do {
    let old = try! JSONSerialization.data(withJSONObject: ["denom": "500", "edge": "left", "size": 1.2])
    let s = Settings.merged(old)
    check(s?.denom == "500" && s?.edge == .left && s?.size == 1.2, "gemte værdier læses")
    check(s?.realStatusBar == true && s?.reveal == .pop && s?.shakeStrength == 1.6 && s?.exit == .slide, "manglende felter får standard")
    let vanish = try! JSONSerialization.data(withJSONObject: ["exit": "vanish"])
    check(Settings.merged(vanish)?.exit == .vanish, "forsvind straks gemmes")
    check(Settings.merged(Data("x".utf8)) == nil, "ugyldige data afvises")
}

print(failures == 0 ? "ALLE TESTS OK" : "\(failures) FEJL")
exit(failures == 0 ? 0 : 1)
