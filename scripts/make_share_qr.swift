import AppKit
import CoreImage.CIFilterBuiltins
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift make_share_qr.swift <URL> <output.png>\n", stderr)
    exit(2)
}

let url = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let filter = CIFilter.qrCodeGenerator()
filter.message = Data(url.utf8)
filter.correctionLevel = "M"
guard let qr = filter.outputImage else {
    fputs("Could not generate QR image.\n", stderr)
    exit(1)
}
let scale = max(1, floor(260 / qr.extent.width))
let scaled = qr.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
let context = CIContext()
guard let image = context.createCGImage(scaled, from: scaled.extent) else {
    fputs("Could not render QR image.\n", stderr)
    exit(1)
}
guard let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
    fputs("Could not encode QR PNG.\n", stderr)
    exit(1)
}
try png.write(to: URL(fileURLWithPath: outputPath))
