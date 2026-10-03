const CLASS_CLOTH: Record<string, string> = {
  warrior: "#7a3038",
  ninja: "#243044",
  mage: "#3c2d78",
  shaman: "#1d655c",
};

export async function drawPortrait(
  canvas: HTMLCanvasElement,
  appearance: { classId?: string; hairColor?: string; gender?: string; hairStyle?: string },
): Promise<void> {
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = 64;
  canvas.height = 80;
  context.clearRect(0, 0, 64, 80);
  const cloth = CLASS_CLOTH[appearance.classId ?? "warrior"] ?? "#7a3038";
  context.fillStyle = "rgba(0,0,0,0.25)";
  context.beginPath();
  context.ellipse(32, 74, 16, 5, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = cloth;
  context.beginPath();
  context.moveTo(16, 78);
  context.lineTo(48, 78);
  context.lineTo(44, 48);
  context.lineTo(20, 48);
  context.fill();
  if (appearance.classId === "warrior") {
    context.fillStyle = "#e0b15a";
    context.fillRect(12, 46, 8, 10);
    context.fillRect(44, 46, 8, 10);
  } else if (appearance.classId === "mage") {
    context.fillStyle = "#d7c4ff";
    context.beginPath();
    context.moveTo(32, 8);
    context.lineTo(22, 28);
    context.lineTo(42, 28);
    context.fill();
  } else if (appearance.classId === "shaman") {
    context.fillStyle = "#f0d48a";
    context.fillRect(18, 22, 4, 12);
    context.fillRect(42, 22, 4, 12);
  }
  context.fillStyle = "#f3c7a8";
  context.beginPath();
  context.ellipse(32, 38, 12, 14, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = appearance.hairColor || "#3b2416";
  context.beginPath();
  context.ellipse(32, 30, 13, 10, 0, Math.PI, 0);
  context.fill();
  if (appearance.classId === "ninja") {
    context.fillStyle = "#111820";
    context.fillRect(22, 38, 20, 5);
  }
  context.fillStyle = "#1c1420";
  context.beginPath();
  context.ellipse(27, 38, 1.6, 2, 0, 0, Math.PI * 2);
  context.ellipse(37, 38, 1.6, 2, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff";
  context.fillRect(28, 37, 1, 1);
  context.fillRect(38, 37, 1, 1);
}
