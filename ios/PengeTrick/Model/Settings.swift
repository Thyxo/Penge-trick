// Indstillinger (hemmeligt panel). Gemmes i UserDefaults; manglende nøgler får standardværdien.
import Foundation

/// Kanten sedlen trækkes ud ad
enum ExitEdge: String, Codable, CaseIterable, Identifiable {
    case left, right, top, bottom
    var id: String { rawValue }
    var label: String {
        switch self {
        case .left: return "Venstre"
        case .right: return "Højre"
        case .top: return "Top"
        case .bottom: return "Bund"
        }
    }
}

/// Sådan dukker sedlen op (efter ryst eller i en rutine)
enum RevealStyle: String, Codable, CaseIterable, Identifiable {
    case pop, slide, fade
    var id: String { rawValue }
    var label: String {
        switch self {
        case .pop: return "Pop"
        case .slide: return "Glid ind"
        case .fade: return "Fade"
        }
    }
}

struct Settings: Codable, Equatable {
    var mode = "single"            // single | routine
    var denom = "100"              // valgt seddel (Valør)
    var routine: [String] = []     // rutinens kø af sedler
    var routineShake = false       // næste i rutinen kræver ryst

    var edge = ExitEdge.right          // forsvindingskant
    var sensitivity = 60.0         // forsvind tidligere (pt fra kanten)
    var size = 1.0                 // sedlens størrelse (1 = 100 %)
    var rotation = -7.0            // grader
    var lag = 0.35                 // træghed når den trækkes (0 = følger fingeren præcist)
    var flick = true               // slip med fart: sedlen glider videre (og kan forsvinde)
    var tilt = false               // sedlen glider når telefonen vippes

    var shakeReveal = false        // start skjult, ryst for at vise (Valør)
    var shakeStrength = 1.6        // g pr. stød
    var reveal = RevealStyle.pop

    var bgX = 0.0                  // baggrundens forskydning (pt)
    var bgY = 0.0
    var bgScale = 1.0
    var scrubStatusBar = true      // visk statuslinjen ud af screenshottet
    var realStatusBar = true       // vis telefonens ægte statuslinje ovenpå
    var darkStatusText = false     // sort tekst i statuslinjen (lys baggrund)
    var haptics = true             // let vibration når sedlen forsvinder
    var volumeButtons = true       // lydstyrke op = vis sedlen, ned = start forfra

    init() {}

    static let key = "pengetrick.settings.v1"

    static func load(_ defaults: UserDefaults = .standard) -> Settings {
        let def = Settings()
        guard let data = defaults.data(forKey: key) else { return def }
        return merged(data) ?? def
    }

    /// Gemte værdier oven på standardværdierne (nye felter får deres standard)
    static func merged(_ data: Data) -> Settings? {
        guard let stored = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let defData = try? JSONEncoder().encode(Settings()),
              var dict = try? JSONSerialization.jsonObject(with: defData) as? [String: Any] else { return nil }
        dict.merge(stored) { _, new in new }
        guard let merged = try? JSONSerialization.data(withJSONObject: dict) else { return nil }
        return try? JSONDecoder().decode(Settings.self, from: merged)
    }

    func save(_ defaults: UserDefaults = .standard) {
        if let d = try? JSONEncoder().encode(self) { defaults.set(d, forKey: Settings.key) }
    }
}
