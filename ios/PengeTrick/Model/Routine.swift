// Sedler (indbyggede + egne) og rutinen: en kø der vises én efter én.
import Foundation

struct Denomination: Identifiable, Equatable {
    let id: String
    let label: String
    let file: String      // filnavn i Notes/ (indbygget) eller Documents/notes/ (egen)
    let custom: Bool

    static let builtIn: [Denomination] = [
        .init(id: "dkk5", label: "5 kr", file: "5kr.png", custom: false),
        .init(id: "dkk20", label: "20 kr", file: "20kr.png", custom: false),
        .init(id: "100", label: "100 kr", file: "100kr.png", custom: false),
        .init(id: "200", label: "200 kr", file: "200kr.png", custom: false),
        .init(id: "500", label: "500 kr", file: "500kr.png", custom: false),
        .init(id: "eur20Small", label: "20 euro lille", file: "20eur-small.png", custom: false),
        .init(id: "eur50Big", label: "50 euro stor", file: "50eur-big.png", custom: false),
        .init(id: "eur50Small", label: "50 euro lille", file: "50eur-small.png", custom: false),
    ]

    static func customID(_ uuid: String) -> String { "custom:\(uuid)" }
}

/// Rutinens forløb. Ren logik: hvad skal vises, og venter vi på et ryst?
struct RoutineRun: Equatable {
    var queue: [String]
    var index = 0
    var done = false

    init(queue: [String]) {
        self.queue = queue
        done = queue.isEmpty
    }

    var current: String? { done || index >= queue.count ? nil : queue[index] }
    var progress: String { queue.isEmpty ? "Tom" : done ? "Færdig" : "\(index + 1) af \(queue.count)" }

    /// Den aktuelle seddel er trukket ud. Returnerer den næste (nil = færdig).
    mutating func advance() -> String? {
        guard !done else { return nil }
        index += 1
        if index >= queue.count { done = true; return nil }
        return queue[index]
    }

    mutating func restart() {
        index = 0
        done = queue.isEmpty
    }
}

extension Array where Element == String {
    /// Fjern sedler der ikke findes længere (fx en slettet egen seddel)
    func onlyKnown(_ known: Set<String>) -> [String] { filter { known.contains($0) } }
}
