// Billeder: hjemmeskærmen (fyld skærmen, visk statuslinjen ud) og egne sedler (klippet fri med Vision).
import CoreImage
import UIKit
import Vision

enum Images {
    static var docs: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    static var backgroundFile: URL { docs.appendingPathComponent("background.jpg") }
    static var notesDir: URL { docs.appendingPathComponent("notes", isDirectory: true) }

    /// Billedet skaleret til at fylde skærmen præcist (pixels). Er `scrubTop` > 0, erstattes toppen
    /// (statuslinjen) med en strækket stribe fra lige under den, så den ægte statuslinje kan ligge ovenpå.
    static func fill(_ img: UIImage, to px: CGSize, scrubTop: CGFloat) -> UIImage {
        let f = UIGraphicsImageRendererFormat()
        f.scale = 1
        f.opaque = true
        return UIGraphicsImageRenderer(size: px, format: f).image { ctx in
            let k = max(px.width / img.size.width, px.height / img.size.height)
            let w = img.size.width * k, h = img.size.height * k
            img.draw(in: CGRect(x: (px.width - w) / 2, y: (px.height - h) / 2, width: w, height: h))
            guard scrubTop > 0, let cg = ctx.currentImage.cgImage,
                  let band = cg.cropping(to: CGRect(x: 0, y: scrubTop, width: px.width, height: max(3, (scrubTop * 0.06).rounded())))
            else { return }
            UIImage(cgImage: band).draw(in: CGRect(x: 0, y: 0, width: px.width, height: scrubTop + 1))
        }
    }

    /// Retvendt og højst `maxPx` på den længste led
    static func normalized(_ img: UIImage, maxPx: CGFloat) -> UIImage {
        let longest = max(img.size.width, img.size.height) * img.scale
        let k = min(1, maxPx / max(1, longest))
        let size = CGSize(width: (img.size.width * img.scale * k).rounded(), height: (img.size.height * img.scale * k).rounded())
        let f = UIGraphicsImageRendererFormat()
        f.scale = 1
        return UIGraphicsImageRenderer(size: size, format: f).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
    }

    /// Klip sedlen fri fra baggrunden (iOS' "løft motiv"). Findes intet motiv, bruges hele billedet.
    static func cutout(_ data: Data) async -> UIImage? {
        guard let src = UIImage(data: data) else { return nil }
        guard let cg = normalized(src, maxPx: 1600).cgImage else { return nil }
        let out: CGImage? = await Task.detached(priority: .userInitiated) { () -> CGImage? in
            let request = VNGenerateForegroundInstanceMaskRequest()
            let handler = VNImageRequestHandler(cgImage: cg)
            do {
                try handler.perform([request])
                guard let result = request.results?.first else { return nil }
                let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
                let ci = CIImage(cvPixelBuffer: buffer)
                return CIContext().createCGImage(ci, from: ci.extent)
            } catch {
                return nil
            }
        }.value
        return UIImage(cgImage: out ?? cg)
    }
}
