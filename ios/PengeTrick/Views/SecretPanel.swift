// Hemmeligt panel (5 hurtige tryk øverst til højre): baggrund, seddel/rutine, fremkomst, bevægelse og skærm.
import PhotosUI
import SwiftUI

struct SecretPanel: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var bgPick: PhotosPickerItem?
    @State private var notePick: PhotosPickerItem?
    @State private var busy = false

    var body: some View {
        @Bindable var app = app
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        thumb(app.background, width: 54, height: 112)
                        VStack(alignment: .leading, spacing: 6) {
                            PhotosPicker(selection: $bgPick, matching: .images) {
                                Label(app.background == nil ? "Vælg screenshot …" : "Skift screenshot …", systemImage: "photo")
                            }
                            Text(app.background == nil ? "Tag et screenshot af din hjemmeskærm og vælg det her."
                                 : "Statuslinjen viskes ud, så telefonens ægte ur ligger ovenpå.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    Toggle("Visk statuslinjen ud af billedet", isOn: $app.s.scrubStatusBar)
                    if app.background != nil {
                        slider("Vandret", value: $app.s.bgX, in: -120...120, format: { "\(Int($0)) pt" })
                        slider("Lodret", value: $app.s.bgY, in: -180...180, format: { "\(Int($0)) pt" })
                        slider("Størrelse", value: $app.s.bgScale, in: 0.8...1.25, format: { "\(Int(($0 * 100).rounded())) %" })
                        Button("Nulstil placering") { app.s.bgX = 0; app.s.bgY = 0; app.s.bgScale = 1 }
                    }
                } header: { Text("Hjemmeskærm") }

                Section {
                    Picker("Tilstand", selection: $app.s.mode) {
                        Text("Valør").tag("single")
                        Text("Rutine").tag("routine")
                    }
                    .pickerStyle(.segmented)
                    .listRowSeparator(.hidden)

                    if app.s.mode == "routine" { routineRows } else { singleRows }
                } header: { Text("Seddel") } footer: {
                    Text(app.s.mode == "routine"
                         ? "Sedlerne vises én efter én midt på skærmen. Rutinen starter forfra, når panelet lukkes."
                         : "Egen seddel: tag et billede af en foldet seddel eller mønt. Baggrunden fjernes automatisk.")
                }

                Section("Fremkomst") {
                    if app.s.mode == "single" {
                        Toggle("Start skjult – ryst for at vise", isOn: $app.s.shakeReveal)
                    } else {
                        Toggle("Næste kræver ryst", isOn: $app.s.routineShake)
                    }
                    slider("Rystestyrke", value: $app.s.shakeStrength, in: 1.1...3.0, format: { String(format: "%.1f g", $0) })
                    Picker("Animation", selection: $app.s.reveal) {
                        ForEach(RevealStyle.allCases) { Text($0.label).tag($0) }
                    }
                }

                Section {
                    Picker("Forsvind ud ad", selection: $app.s.edge) {
                        ForEach(ExitEdge.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    slider("Forsvind tidligere", value: $app.s.sensitivity, in: 0...180, format: { "\(Int($0)) pt" })
                    slider("Størrelse", value: $app.s.size, in: 0.7...1.4, format: { "\(Int(($0 * 100).rounded())) %" })
                    slider("Rotation", value: $app.s.rotation, in: -25...25, format: { "\(Int($0))°" })
                    slider("Træghed", value: $app.s.lag, in: 0...1, format: { "\(Int(($0 * 100).rounded())) %" })
                    Toggle("Kast: slip med fart", isOn: $app.s.flick)
                    Toggle("Tilt: glider når telefonen vippes", isOn: $app.s.tilt)
                } header: { Text("Bevægelse") } footer: {
                    Text("Tilt nulstilles til den hældning telefonen har, når den slås til og når panelet lukkes.")
                }

                Section {
                    Toggle("Ægte statuslinje", isOn: $app.s.realStatusBar)
                    if app.s.realStatusBar {
                        Picker("Tekstfarve", selection: $app.s.darkStatusText) {
                            Text("Hvid").tag(false)
                            Text("Sort").tag(true)
                        }
                        .pickerStyle(.segmented)
                    }
                    Toggle("Vibration når sedlen forsvinder", isOn: $app.s.haptics)
                } header: { Text("Skærm") } footer: {
                    Text("Panel: 5 hurtige tryk øverst til højre. Start forfra: hold øverst til højre i 1 sek.\n\(app.status)")
                }
            }
            .navigationTitle("Penge Trick")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Færdig") { dismiss() } }
                if app.s.mode == "routine" && !app.s.routine.isEmpty {
                    ToolbarItem(placement: .topBarLeading) { EditButton() }
                }
            }
            .overlay { if busy { ProgressView().controlSize(.large) } }
        }
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
        .onDisappear { app.motion.calibrate() }
    }

    // MARK: Valør

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
            Label("Tilføj egen seddel …", systemImage: "plus.viewfinder")
        }
    }

    // MARK: Rutine

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
            Label("Tilføj seddel", systemImage: "plus.circle")
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
        .background(selected ? Color.accentColor.opacity(0.22) : Color.clear, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(selected ? Color.accentColor : Color.clear, lineWidth: 2))
        .contentShape(Rectangle())
    }

    private func thumb(_ img: UIImage?, width: CGFloat, height: CGFloat) -> some View {
        Group {
            if let img { Image(uiImage: img).resizable().scaledToFill() }
            else { Color.secondary.opacity(0.2) }
        }
        .frame(width: width, height: height)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func slider(_ title: String, value: Binding<Double>, in range: ClosedRange<Double>, format: @escaping (Double) -> String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(title)
                Spacer()
                Text(format(value.wrappedValue)).monospacedDigit().foregroundStyle(.secondary)
            }
            Slider(value: value, in: range)
        }
    }
}
