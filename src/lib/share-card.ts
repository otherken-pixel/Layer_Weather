function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let idx = 0;
  while (idx < words.length && lines.length < maxLines) {
    let line = words[idx];
    idx += 1;
    while (idx < words.length) {
      const trial = `${line} ${words[idx]}`;
      if (ctx.measureText(trial).width > maxWidth) break;
      line = trial;
      idx += 1;
    }
    lines.push(line);
  }
  if (idx < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) {
      if (last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
      else last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

export async function generateShareCard(opts: {
  conditionEmoji: string;
  temp: number;
  tempUnit: "F" | "C";
  outfitLabel: string;
  outfitDescription: string;
  city: string;
  region: string;
}): Promise<Blob> {
  const { conditionEmoji, temp, tempUnit, outfitLabel, outfitDescription, city, region } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "#4C1D95");
  gradient.addColorStop(1, "#7C3AED");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 220);

  // White rounded rect card area
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  const x = 20, y = 20, w = 360, h = 180, r = 20;
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.fill();

  // Big emoji
  ctx.font = `56px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText(conditionEmoji, 200, 95);

  // Temperature
  const displayTemp = tempUnit === "C" ? Math.round(((temp - 32) * 5) / 9) : Math.round(temp);
  ctx.font = `800 32px ${fontFamily}`;
  ctx.fillStyle = "white";
  ctx.fillText(`${displayTemp}°${tempUnit}`, 200, 135);

  // Outfit label
  ctx.font = `700 15px ${fontFamily}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(outfitLabel, 200, outfitDescription.trim() ? 152 : 158);

  const cityLine = region ? `${city}, ${region}` : city;
  let nextY = outfitDescription.trim() ? 166 : 178;
  if (outfitDescription.trim()) {
    ctx.font = `400 11px ${fontFamily}`;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    for (const ln of wrapLines(ctx, outfitDescription, 340, 2)) {
      ctx.fillText(ln, 200, nextY);
      nextY += 13;
    }
    nextY += 2;
  }

  // City/region
  ctx.font = `12px ${fontFamily}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(cityLine, 200, nextY);
  nextY += outfitDescription.trim() ? 18 : 22;

  // Branding
  ctx.font = `11px ${fontFamily}`;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("Layer Weather", 200, outfitDescription.trim() ? nextY : 200);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob returned null"));
    }, "image/png");
  });
}

export async function shareOutfitCard(
  opts: Parameters<typeof generateShareCard>[0],
): Promise<void> {
  const blob = await generateShareCard(opts);
  const file = new File([blob], "weartoday.png", { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], title: "My Outfit Today" });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weartoday.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
