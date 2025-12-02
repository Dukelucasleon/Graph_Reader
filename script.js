const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");
const imageInput = document.getElementById("imageInput");
const pasteZone = document.getElementById("pasteZone");

let img = null;
let clicks = [];
let clickStage = 0;
let maxYValue = null;

// Load image from file
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) {
    const newImg = new Image();
    newImg.onload = () => {
      img = newImg;
      resetCanvas();
    };
    newImg.src = URL.createObjectURL(file);
  }
});

// Load image from paste
pasteZone.addEventListener("paste", e => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      const newImg = new Image();
      newImg.onload = () => {
        img = newImg;
        resetCanvas();
      };
      newImg.src = URL.createObjectURL(file);
    }
  }
});

function resetCanvas() {
  canvas.width = img.width;
  canvas.height = img.height;
  clicks = [];
  clickStage = 0;
  maxYValue = null;
  drawCanvas();
  output.textContent = "Image loaded.\n\nClick the ORIGIN (0,0).";
}

function drawCanvas() {
  if (!img) return;
  ctx.drawImage(img, 0, 0);
  // draw dots
  clicks.forEach(pt => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// Handle clicks
canvas.addEventListener("click", e => {
  if (!img) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  clicks.push({ x, y });
  clickStage++;
  drawCanvas();

  if (clickStage === 1) {
    output.textContent = "Origin recorded.\n\nNow click the TOP of the Y-axis.";
  } else if (clickStage === 2) {
    output.textContent = "Y-axis top recorded.\n\nEnter the MAXIMUM Y-axis value.";
    maxYValue = prompt("Enter maximum Y-axis value:");
    if (maxYValue && !isNaN(maxYValue)) {
      output.textContent = "Processing graph...";
      setTimeout(() => processGraph(parseFloat(maxYValue)), 300);
    } else {
      output.textContent = "Invalid Y-axis max value. Reload the image to try again.";
    }
  }
});

// Convert to strict black & white (off-whites → black)
function convertToBlackAndWhite() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const brightness = 0.299*r + 0.587*g + 0.114*b;
    const threshold = 245;
    const value = brightness < threshold ? 0 : 255;
    data[i] = data[i+1] = data[i+2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

function isNonWhitePixel(r, g, b, threshold=40) {
  const distance = Math.sqrt(
    Math.pow(255-r, 2) + Math.pow(255-g, 2) + Math.pow(255-b, 2)
  );
  return distance > threshold;
}

// Detect bars + compute values based on origin & Y-axis top
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
      // track the minimum (lowest) y pixel across all columns in this bar
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

  const origin = clicks[0];
  const yTop = clicks[1];
  const pixelYDistance = origin.y - yTop.y;

  const outputLines = bars.map(b => {
    const ratio = b.height / pixelYDistance;
    const value = (ratio * maxYValue).toFixed(2);
    return `X: ${b.x} → Value: ${value}`;
  });

  if (outputLines.length === 0) {
    output.textContent = "No bars detected aligned with origin.";
  } else {
    output.textContent = outputLines.join("\n");
  }
}

  // --- NEW: compute actual bar values -------------------------------------
  const origin = clicks[0];
  const yTop = clicks[1];
  const pixelYDistance = origin.y - yTop.y; // pixels of full Y scale

  const values = bars.map(b => {
    // detected bar height = pixels of bar
    const ratio = b.height / pixelYDistance;
    return parseFloat((ratio * maxYValue).toFixed(2));
  });

  // Output only list of numbers
  output.textContent = values.join("\n");
}
