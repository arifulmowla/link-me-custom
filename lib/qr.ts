import QRCode from "qrcode";

export async function generateQrPng(data: string, size = 256) {
  return QRCode.toBuffer(data, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
