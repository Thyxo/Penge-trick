import UIKit

/// Vibrationer: blød når sedlen forsvinder, et tik ved nulstil.
@MainActor
final class Haptics {
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let selection = UISelectionFeedbackGenerator()

    func exit() { soft.impactOccurred(intensity: 0.5) }
    func tap() { selection.selectionChanged() }
}
