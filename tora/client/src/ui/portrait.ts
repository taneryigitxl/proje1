import type { BodyType, HairStyle } from "@tora/shared";
import { assetUrl } from "../config";

const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(file: string): Promise<HTMLImageElement> {
  const cached = images.get(file);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${file}`));
    image.src = assetUrl(file);
  });
  images.set(file, pending);
  return pending;
}

export async function drawPortrait(
  canvas: HTMLCanvasElement,
  appearance: { gender: BodyType; hairStyle: HairStyle; hairColor: string },
): Promise<void> {
  const context = canvas.getContext("2d");
  if (!context) return;
  const [body, hair] = await Promise.all([
    loadImage(`characters/body-${appearance.gender}.png`),
    loadImage(`characters/hair-${appearance.hairStyle}.png`),
  ]);
  canvas.width = 48;
  canvas.height = 72;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(body, 0, 0, 16, 24, 0, 0, 48, 72);
  context.fillStyle = appearance.hairColor;
  context.globalCompositeOperation = "source-over";
  const hairCanvas = tint(hair, appearance.hairColor);
  context.drawImage(hairCanvas, 0, 0, 16, 24, 0, 0, 48, 72);
}

function tint(source: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 24;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(source, 0, 0, 16, 24, 0, 0, 16, 24);
  context.globalCompositeOperation = "multiply";
  context.fillStyle = color;
  context.fillRect(0, 0, 16, 24);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(source, 0, 0, 16, 24, 0, 0, 16, 24);
  return canvas;
}
