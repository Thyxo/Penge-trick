// Hemmeligt panel (5 hurtige tryk øverst til højre). Rækkefølge: det man bruger oftest øverst.
import PhotosUI
import SwiftUI

struct SecretPanel: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var openedAt = Date()
    @State private var bgPick: PhotosPickerItem?
    @State private var notePick: PhotosPickerItem?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                noteSection
                revealSection
                controlSection
                backgroundSection
                motionSection
                screenSection
                Section {
                    Button { app.resetPressed(); dismiss() } label: {
                        Label("Læg sedlen klar og luk", systemImage: "arrow.uturn.backward")
                    }
                } footer: {
                    Text("Åbn panelet: 5 hurtige tryk øverst til højre.\n\(app.status)")
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 8)
                }
            }
            .navigationTitle("Penge Trick")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Færdig") {
                        // Første sekund ignoreres, så et ekstra hemmeligt tryk ikke lukker panelet
                        if Date().timeIntervalSince(openedAt) > 1 { dismiss() }
                    }
                    .fontWeight(.semibold)
                }
                if app.s.mode == "routine" && !app.s.routine.isEmpty {
                    ToolbarItem(placement: .topBarLeading) { EditButton() }
                }
            }
            .overlay { if busy { ProgressView().controlSize(.large) } }
        }
        .tint(Color.accentColor)
        .onAppear { openedAt = Date() }
        .onDisappear { app.motion.calibrate() }
        .onChange(of: bgPick) { _, item in
            guard let item else { return }
            Task {
                busy = true
                if let d = try? await item.loadTransferable(type: Data.self) { app.importBackground(d) }
                busy = false
                bgPick = nil
            }
        }
        .onChange(of: notePick) { _, item in
            guard let item else { return }
            Task {
                busy = true
                if let d = try? await item.loadTransferable(type: Data.self) { await app.addCustomNote(d) }
                busy = false
                notePick = nil
            }
        }
    }

    // MARK: 1. Seddel

    private var noteSection: some View {
        @Bindable var app = app
        return Section {
            Picker("Tilstand", selection: $app.s.mode) {
                Text("Én seddel").tag("single")
                Text("Rutine").tag("routine")
            }
            .pickerStyle(.segmented)
            .listRowSeparator(.hidden)

            if app.s.mode == "routine" { routineRows } else { singleRows }
        } header: {
            Text("Seddel")
        } footer: {
            Text(app.s.mode == "routine"
                 ? "Sedlerne vises én efter én midt på skærmen. Rutinen starter forfra, når panelet lukkes."
                 : "Egen seddel: tag et billede af en foldet seddel eller mønt. Baggrunden fjernes automatisk. Hold på en egen seddel for at slette den.")
        }
    }

    @ViewBuilder private var singleRows: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 70), spacing: 10)], spacing: 12) {
            ForEach(app.all) { d in
                Button { app.s.denom = d.id } label: { tile(d, selected: app.s.denom == d.id) }
                    .buttonStyle(.plain)
                    .contextMenu {
                        if d.custom {
                            Button("Slet", systemImage: "trash", role: .destructive) { app.deleteCustomNote(d) }
                        }
                    }
            }
        }
        .padding(.vertical, 4)
        PhotosPicker(selection: $notePick, matching: .images) {
            RowLabel("Tilføj egen seddel …", icon: "plus.viewfinder", color: .green)
        }
    }

    @ViewBuilder private var routineRows: some View {
        if app.s.routine.isEmpty {
            Text("Ingen sedler i rutinen endnu.").foregroundStyle(.secondary)
        }
        ForEach(Array(app.s.routine.enumerated()), id: \.offset) { i, id in
            HStack(spacing: 12) {
                Text("\(i + 1).").monospacedDigit().foregroundStyle(.secondary).frame(width: 24, alignment: .leading)
                thumb(app.image(id), width: 22, height: 40)
                Text(app.label(id))
            }
        }
        .onDelete { app.s.routine.remove(atOffsets: $0) }
        .onMove { app.s.routine.move(fromOffsets: $0, toOffset: $1) }
        Menu {
            ForEach(app.all) { d in
                Button(d.label) { app.s.routine.append(d.id) }
            }
        } label: {
            RowLabel("Tilføj seddel", icon: "plus", color: .green)
        }
    }

    // MARK: 2. Fremkomst

    private var revealSection: some View {
        @Bindable var app = app
        return Section {
            if app.s.mode == "single" {
                Toggle(isOn: $app.s.shakeReveal) {
                    RowLabel("Start skjult", icon: "eye.slash.fill", color: .purple, detail: "Ryst (eller lydstyrke op) for at vise")
                }
            } else {
                Toggle(isOn: $app.s.routineShake) {
                    RowLabel("Næste kræver ryst", icon: "iphone.radiowaves.left.and.right", color: .purple, detail: "Ellers kommer den næste af sig selv")
                }
            }
            ValueSlider(title: "Rystestyrke", value: $app.s.shakeStrength, range: 1.1...3.0, step: 0.1,
                        text: String(format: "%.1f g", app.s.shakeStrength), minIcon: "tortoise.fill", maxIcon: "hare.fill")
            Picker(selection: $app.s.reveal) {
                ForEach(RevealStyle.allCases) { Text($0.label).tag($0) }
            } label: {
                RowLabel("Animation", icon: "sparkles", color: .pink)
            }
        } header: {
            Text("Fremkomst")
        }
    }

    // MARK: 3. Betjening

    private var controlSection: some View {
        @Bindable var app = app
        return Section {
            Toggle(isOn: $app.s.volumeButtons) {
                RowLabel("Lydstyrkeknapper", icon: "speaker.wave.2.fill", color: .orange, detail: "Op = vis sedlen · ned = start forfra")
            }
            Toggle(isOn: $app.s.haptics) {
                RowLabel("Vibration", icon: "hand.tap.fill", color: .indigo, detail: "Når sedlen forsvinder og ved start forfra")
            }
        } header: {
            Text("Betjening")
        } footer: {
            Text("Start forfra kan også gøres ved at holde øverst til højre i 1 sek.")
        }
    }

    // MARK: 4. Hjemmeskærm

    private var backgroundSection: some View {
        @Bindable var app = app
        return Section {
            HStack(spacing: 14) {
                thumb(app.background, width: 54, height: 112)
                VStack(alignment: .leading, spacing: 8) {
                    PhotosPicker(selection: $bgPick, matching: .images) {
                        Label(app.background == nil ? "Vælg screenshot …" : "Skift screenshot …", systemImage: "photo")
                            .fontWeight(.semibold)
                    }
                    Text(app.background == nil ? "Tag et screenshot af din hjemmeskærm og vælg det her."
                         : "Statuslinjen viskes ud, så telefonens ægte ur ligger ovenpå.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            Toggle(isOn: $app.s.scrubStatusBar) {
                RowLabel("Visk statuslinjen ud", icon: "eraser.fill", color: .teal)
            }
            if app.background != nil {
                ValueSlider(title: "Vandret", value: $app.s.bgX, range: -120...120, step: 1, text: "\(Int(app.s.bgX)) pt")
                ValueSlider(title: "Lodret", value: $app.s.bgY, range: -180...180, step: 1, text: "\(Int(app.s.bgY)) pt")
                ValueSlider(title: "Størrelse", value: $app.s.bgScale, range: 0.8...1.25, step: 0.005,
                            text: "\(Int((app.s.bgScale * 100).rounded())) %")
                Button("Nulstil placering") { app.s.bgX = 0; app.s.bgY = 0; app.s.bgScale = 1 }
            }
        } header: {
            Text("Hjemmeskærm")
        }
    }

    // MARK: 5. Bevægelse

    private var motionSection: some View {
        @Bindable var app = app
        return Section {
            Picker("Forsvind ud ad", selection: $app.s.edge) {
                ForEach(ExitEdge.allCases) { Text($0.label).tag($0) }
            }
            .pickerStyle(.segmented)
            ValueSlider(title: "Forsvind tidligere", value: $app.s.sensitivity, range: 0...180, step: 1, text: "\(Int(app.s.sensitivity)) pt")
            ValueSlider(title: "Størrelse", value: $app.s.size, range: 0.7...1.4, step: 0.01, text: "\(Int((app.s.size * 100).rounded())) %")
            ValueSlider(title: "Rotation", value: $app.s.rotation, range: -25...25, step: 1, text: "\(Int(app.s.rotation))°")
            ValueSlider(title: "Træghed", value: $app.s.lag, range: 0...1, step: 0.05, text: "\(Int((app.s.lag * 100).rounded())) %")
            Toggle(isOn: $app.s.flick) {
                RowLabel("Kast", icon: "hand.draw.fill", color: .blue, detail: "Slip med fart, så glider sedlen videre")
            }
            Toggle(isOn: $app.s.tilt) {
                RowLabel("Tilt", icon: "gyroscope", color: .cyan, detail: "Glider når telefonen vippes")
            }
        } header: {
            Text("Bevægelse")
        } footer: {
            Text("Tilt nulstilles til den hældning telefonen har, når panelet lukkes.")
        }
    }

    // MARK: 6. Skærm

    private var screenSection: some View {
        @Bindable var app = app
        return Section {
            Toggle(isOn: $app.s.realStatusBar) {
                RowLabel("Ægte statuslinje", icon: "clock.fill", color: .gray, detail: "Telefonens rigtige ur, signal og batteri")
            }
            if app.s.realStatusBar {
                Picker("Tekstfarve", selection: $app.s.darkStatusText) {
                    Text("Hvid").tag(false)
                    Text("Sort").tag(true)
                }
                .pickerStyle(.segmented)
            }
        } header: {
            Text("Skærm")
        }
    }

    // MARK: Hjælpere

    private func tile(_ d: Denomination, selected: Bool) -> some View {
        VStack(spacing: 6) {
            Group {
                if let img = app.image(d.id) { Image(uiImage: img).resizable().scaledToFit() }
                else { Color.secondary.opacity(0.2) }
            }
            .frame(height: 64)
            Text(d.label).font(.caption2).lineLimit(1).minimumScaleFactor(0.7)
        }
        .padding(6)
        .frame(maxWidth: .infinity)
        .background(selected ? Color.accentColor.opacity(0.22) : Color.clear, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(selected ? Color.accentColor : Color.clear, lineWidth: 2))
        .contentShape(Rectangle())
    }

    private func thumb(_ img: UIImage?, width: CGFloat, height: CGFloat) -> some View {
        Group {
            if let img { Image(uiImage: img).resizable().scaledToFill() }
            else { Color.secondary.opacity(0.2) }
        }
        .frame(width: width, height: height)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}
