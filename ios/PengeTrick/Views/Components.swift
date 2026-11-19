// Byggeklodser til panelet, i samme stil som MindTrace (farvet ikon som i Indstillinger).
import SwiftUI

struct RowIcon: View {
    let symbol: String
    let color: Color
    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 29, height: 29)
            .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(color))
    }
}

struct RowLabel: View {
    let title: String
    let icon: String
    let color: Color
    var detail: String? = nil
    init(_ title: String, icon: String, color: Color, detail: String? = nil) {
        self.title = title; self.icon = icon; self.color = color; self.detail = detail
    }
    var body: some View {
        HStack(spacing: 12) {
            RowIcon(symbol: icon, color: color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(.primary)
                if let detail { Text(detail).font(.caption).foregroundStyle(.secondary) }
            }
        }
    }
}

/// Skyder med titel og værdi til højre
struct ValueSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    var step: Double = 0.01
    let text: String
    var minIcon: String? = nil
    var maxIcon: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title)
                Spacer()
                Text(text).monospacedDigit().foregroundStyle(.secondary)
            }
            HStack(spacing: 10) {
                if let minIcon { Image(systemName: minIcon).font(.caption).foregroundStyle(.secondary) }
                Slider(value: $value, in: range, step: step)
                if let maxIcon { Image(systemName: maxIcon).font(.caption).foregroundStyle(.secondary) }
            }
        }
        .padding(.vertical, 2)
    }
}

/// Lille afrundet knap
struct PillButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 38)
                .background(Capsule().fill(color))
        }
        .buttonStyle(.borderless)
    }
}
