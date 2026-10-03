import { assetUrl } from "../config";

const FRAME: Record<string, number> = { warrior: 0, ninja: 1, mage: 2, shaman: 3 };
let atlasPromise: Promise<HTMLImageElement> | null = null;

function atlas(): Promise<HTMLImageElement> {
  if (!atlasPromise) {
    atlasPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Karakter resmi yüklenemedi."));
      image.src = assetUrl("illustrated/classes.png");
    });
  }
  return atlasPromise;
}

export async function drawPortrait(
  canvas: HTMLCanvasElement,
  appearance: { classId?: string; hairColor?: string; gender?: string; hairStyle?: string },
): Promise<void> {
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = 160;
  canvas.height = 220;
  const gradient = context.createLinearGradient(0, 0, 160, 220);
  gradient.addColorStop(0, "#283d45");
  gradient.addColorStop(1, "#0f1d23");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 160, 220);
  try {
    const image = await atlas();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (FRAME[appearance.classId ?? "warrior"] ?? 0) * 512, 0, 512, 768, 8, 2, 144, 216);
  } catch {
    context.fillStyle = "#d8b87b";
    context.font = "20px Georgia";
    context.fillText("TORA", 46, 110);
  }
}
