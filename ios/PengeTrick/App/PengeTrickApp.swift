// Penge Trick – viser et billede af din egen hjemmeskærm, mens en seddel trækkes ud af skærmen.
import SwiftUI

@main
struct PengeTrickApp: App {
    @State private var app = AppState()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            StageView()
                .environment(app)
                .onChange(of: phase) { _, p in app.scene(active: p == .active) }
        }
    }
}
