function processGraph(maxYValue) {
  if (clicks.length < 2) {
    output.textContent = "Please click the ORIGIN and TOP of Y-axis first.";
    return;
  }

  ctx.drawImage(img, 0, 0);
  convertToBlackAndWhite();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bars = [];

  const minWidth = Math.floor(canvas.width * 0.05);
  const minHeight = 20;
  const margin = 5; // allowed vertical margin for bottom pixel near origin

  let currentBar = null;
  let barBottomY = null; // lowest y pixel in bar

  for (let x = 0; x < canvas.width; x++) {
    let maxHeight = 0;
    let barHeight = 0;
    let lowestYForColumn = null;

    for (let y = canvas.height - 1; y >= 0; y--) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (isNonWhitePixel(r, g, b)) {
        barHeight++;
        maxHeight = Math.max(maxHeight, barHeight);
        lowestYForColumn = y; // update lowest pixel with a black pixel found
      } else {
        barHeight = 0;
      }
    }

    if (maxHeight >= minHeight) {
      if (!currentBar) {
        currentBar = { startX: x, height: maxHeight };
        barBottomY = lowestYForColumn;
      }
      currentBar.endX = x;
      // track the lowest y pixel across all columns in this bar (max y = bottom)
      if (lowestYForColumn !== null && lowestYForColumn > barBottomY) {
        barBottomY = lowestYForColumn;
      }
    } else {
      if (currentBar) {
        const width = currentBar.endX - currentBar.startX + 1;
        // check if bottom of bar is near origin.y within margin
        if (width >= minWidth && Math.abs(barBottomY - clicks[0].y) <= margin) {
          bars.push({ x: currentBar.startX, width, height: currentBar.height, bottomY: barBottomY });
        }
        currentBar = null;
        barBottomY = null;
      }
    }
  }

  // Handle case if last bar extends to image edge
  if (currentBar) {
    const width = currentBar.endX - currentBar.startX + 1;
    if (width >= minWidth && Math.abs(barBottomY - clicks[0].y) <= margin) {
      bars.push({ x: currentBar.startX, width, height: currentBar.height, bottomY: barBottomY });
    }
  }

  const origin = clicks[0];
  const yTop = clicks[1];
  const pixelYDistance = origin.y - yTop.y;

  // Map bars to their computed values based on relative height
  const values = bars.map(b => {
    const ratio = b.height / pixelYDistance;
    return parseFloat((ratio * maxYValue).toFixed(2));
  });

  if (values.length === 0) {
    output.textContent = "No bars detected aligned with origin.";
  } else {
    // Output only the list of values, each on its own line
    output.textContent = values.join("\n");
  }
}
