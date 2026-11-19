// Scenen: hjemmeskærmen i fuld skærm, sedlen ovenpå og den hemmelige zone øverst til højre.
import SwiftUI

struct StageView: View {
    @Environment(AppState.self) private var app
    @State private var taps: [Date] = []

    var body: some View {
        @Bindable var app = app
        GeometryReader { geo in
            ZStack {
                HomeBackground(size: geo.size)

                SecretZone(taps: $taps)

                if app.visible {
                    NoteView()
                        .transition(transition)
                        .zIndex(1)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .coordinateSpace(name: "stage")
            .onAppear { app.setBounds(geo.size) }
            .onChange(of: geo.size) { _, s in app.setBounds(s) }
        }
        .ignoresSafeArea()
        .statusBarHidden(!app.s.realStatusBar)
        .persistentSystemOverlays(.hidden)
        .defersSystemGestures(on: .all)
        .preferredColorScheme(app.s.darkStatusText ? .light : .dark)
        .sheet(isPresented: $app.secretOpen, onDismiss: { app.panelClosed() }) {
            SecretPanel()
                .preferredColorScheme(.dark)
        }
    }

    /// Ind: efter valgt fremkomst. Ud: glider ud ad forsvindingskanten.
    private var transition: AnyTransition {
        let edge = swiftUIEdge(app.s.edge)
        let insertion: AnyTransition
        switch app.s.reveal {
        case .pop: insertion = .scale(scale: 0.72).combined(with: .opacity)
        case .fade: insertion = .opacity
        case .slide: insertion = .move(edge: edge)
        }
        return .asymmetric(insertion: insertion, removal: .move(edge: edge))
    }

    private func swiftUIEdge(_ e: ExitEdge) -> Edge {
        switch e {
        case .left: return .leading
        case .right: return .trailing
        case .top: return .top
        case .bottom: return .bottom
        }
    }
}

/// Screenshottet af hjemmeskærmen (eller en neutral baggrund under opsætning)
struct HomeBackground: View {
    @Environment(AppState.self) private var app
    var size: CGSize

    var body: some View {
        Group {
            if let bg = app.background {
                Image(uiImage: bg)
                    .resizable()
                    .interpolation(.high)
                    .frame(width: size.width, height: size.height)
                    .scaleEffect(app.s.bgScale)
                    .offset(x: app.s.bgX, y: app.s.bgY)
            } else {
                ZStack {
                    LinearGradient(colors: [Color(red: 0.09, green: 0.2, blue: 0.23), Color(red: 0.09, green: 0.13, blue: 0.15),
                                            Color(red: 0.18, green: 0.15, blue: 0.13)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                    VStack(spacing: 8) {
                        Image(systemName: "photo.on.rectangle").font(.system(size: 34, weight: .light))
                        Text("Vælg et screenshot af din hjemmeskærm")
                            .font(.headline)
                        Text("5 hurtige tryk øverst til højre åbner panelet")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    .foregroundStyle(.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .padding(32)
                }
            }
        }
        .frame(width: size.width, height: size.height)
        .background(Color.black)
        .clipped()
        .allowsHitTesting(false)
    }
}

/// Usynlig zone øverst til højre: 5 hurtige tryk = panel, hold 0,8 sek. = nulstil
struct SecretZone: View {
    @Environment(AppState.self) private var app
    @Binding var taps: [Date]

    var body: some View {
        Color.clear
            .frame(width: 96, height: 110)
            .contentShape(Rectangle())
            .onTapGesture {
                let now = Date()
                taps = taps.filter { now.timeIntervalSince($0) < 2.5 } + [now]
                if taps.count >= 5 {
                    taps = []
                    app.secretOpen = true
                }
            }
            .onLongPressGesture(minimumDuration: 0.8) {
                taps = []
                app.resetPressed()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }
}

/// Sedlen: trækkes med fingeren og følger med lidt træghed
struct NoteView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        let size = app.noteSize
        Group {
            if let img = app.image(app.current) {
                Image(uiImage: img).resizable().interpolation(.high)
            } else {
                RoundedRectangle(cornerRadius: 6).fill(Color(red: 0.94, green: 0.81, blue: 0.57))
            }
        }
        .frame(width: size.x, height: size.y)
        .contentShape(Rectangle())
        .rotationEffect(.degrees(app.s.rotation))
        .shadow(color: .black.opacity(app.dragging ? 0.48 : 0.4), radius: app.dragging ? 16 : 13, y: app.dragging ? 14 : 11)
        .gesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .named("stage"))
                .onChanged { v in app.dragChanged(location: v.location, start: v.startLocation) }
                .onEnded { v in app.dragEnded(velocity: v.velocity) }
        )
        .position(x: app.pos.x, y: app.pos.y)
    }
}
