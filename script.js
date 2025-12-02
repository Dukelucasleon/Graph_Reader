const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");
const imageInput = document.getElementById("imageInput");
const pasteZone = document.getElementById("pasteZone");

let origin = null;
let yAxisTop = null;
let maxYValue = null;

// Load image from file
imageInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) {
    const img = new Image();
    img.onload = () => drawImage(img);
    img.src = URL.createObjectURL(file);
  }
});

// Load image from paste
pasteZone.addEventListener("paste", e => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      const img = new Image();
      img.onload = () => drawImage(img);
      img.src = URL.createObjectURL(file);
    }
  }
});

// Draw image and convert to black & white
function drawImage(img) {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  convertToBlackAndWhite();
}

// Convert to strict black & white (off-whites → black)
function convertToBlackAndWhite() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const brightness = 0.299*r + 0.587*g + 0.114*b;
    const threshold = 245; // stricter cutoff
    const value = brightness < threshold ? 0 : 255;
    data[i] = data[i+1] = data[i+2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Detect bars
function detectBars() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bars = [];

  const minWidth = Math.floor(canvas.width * 0.07); // 7% of width
  const minHeight = 20; // keep a minimum height

  // Scan columns
  let currentBar = null;
  for (let x = 0; x < canvas.width; x++) {
    let maxHeight = 0;
    let barHeight = 0;
    for (let y = canvas.height - 1; y >= 0; y--) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (isNonWhitePixel(r, g, b)) {
        barHeight++;
        maxHeight = Math.max(maxHeight, barHeight);
      } else {
        barHeight = 0;
      }
    }

    if (maxHeight >= minHeight) {
      if (!currentBar) {
        currentBar = { startX: x, height: maxHeight };
      }
      currentBar.endX = x;
    } else {
      if (currentBar) {
        const width = currentBar.endX - currentBar.startX + 1;
        if (width >= minWidth) {
          bars.push({ x: currentBar.startX, width, height: currentBar.height });
        }
        currentBar = null;
      }
    }
  }

  output.textContent = JSON.stringify(bars, null, 2);
}

// Pixel deviancy from white
function isNonWhitePixel(r, g, b, threshold=40) {
  const distance = Math.sqrt(
    Math.pow(255-r, 2) + Math.pow(255-g, 2) + Math.pow(255-b, 2)
  );
  return distance > threshold;
}

// Draw dot where clicked (no text)
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, 2 * Math.PI);
  ctx.fill();

  if (!origin) {
    origin = { x, y };
  } else if (!yAxisTop) {
    yAxisTop = { x, y };
    maxYValue = prompt("Enter maximum Y-axis value:");
  } else {
    detectBars();
  }
});
