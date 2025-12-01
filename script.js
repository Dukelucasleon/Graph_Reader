const imageInput = document.getElementById('imageInput');
const pasteZone = document.getElementById('pasteZone');
const output = document.getElementById('output');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let imgBitmap = null;

// Calibration points (clicked by the user)
let clicks = [];
let clickStage = 0;

const instructions = [
  "Click the ORIGIN (0,0).",
  "Click the TOP OF THE X AXIS.",
  "Click the TOP OF THE Y AXIS."
];

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) loadImage(file);
});

pasteZone.addEventListener('paste', async (event) => {
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      loadImage(blob);
      break;
    }
  }
});

async function loadImage(blob) {
  imgBitmap = await createImageBitmap(blob);
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;

  ctx.drawImage(imgBitmap, 0, 0);

  clickStage = 0;
  clicks = [];

  output.textContent = 
    "Image loaded.\n\n" +
    "Now: " + instructions[clickStage] +
    "\n\nClick directly on the image.";
}

canvas.addEventListener('click', (e) => {
  if (!imgBitmap) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  clicks.push({ x, y });
  clickStage++;

  if (clickStage < 3) {
    output.textContent =
      `Point recorded.\n\nNext: ${instructions[clickStage]}`;
  } 
  else {
    output.textContent = "All calibration points recorded.\n\nReading graph...";
    setTimeout(processGraph, 200);
  }
});


// --------------------------------------------------
// PROCESS GRAPH
// --------------------------------------------------
function processGraph() {
  convertToBlackAndWhite();

  const [origin, xTop, yTop] = clicks;

  const pixelYrange = origin.y - xTop.y; // Height the chart uses for Y axis

  const bars = extractBarsBW();

  const calibratedValues = bars.map(pixels => {
    return (pixels / pixelYrange).toFixed(3);
  });

  let txt = "Detected Bar Values (Calibrated):\n\n";
  calibratedValues.forEach((v, i) => {
    txt += `Bar ${i + 1}: ${v}\n`;
  });

  output.textContent = txt;
}


// --------------------------------------------------
// CONVERT TO BLACK & WHITE
// --------------------------------------------------
function convertToBlackAndWhite() {
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    const brightness = (r + g + b) / 3;

    const v = brightness < 150 ? 0 : 255; // threshold
    d[i] = d[i+1] = d[i+2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
}


// --------------------------------------------------
// EXTRACT BARS FROM BLACK & WHITE IMAGE
// --------------------------------------------------
function extractBarsBW() {
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;

  const colDarkness = [];

  for (let x = 0; x < w; x++) {
    let darkPixels = 0;

    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      const v = data[i]; // R channel after B&W (0 or 255)
      if (v === 0) darkPixels++;
    }

    colDarkness.push(darkPixels);
  }

  const threshold = Math.max(...colDarkness) * 0.4;
  const bars = [];

  let inBar = false;
  let start = 0;

  for (let x = 0; x < w; x++) {
    if (!inBar && colDarkness[x] > threshold) {
      inBar = true;
      start = x;
    }
    if (inBar && colDarkness[x] <= threshold) {
      inBar = false;
      bars.push({ start, end: x });
    }
  }

  // Measure bar heights in pixels
  const barHeights = bars.map(bar => {
    const mid = Math.floor((bar.start + bar.end) / 2);

    let topY = null;
    for (let y = 0; y < h; y++) {
      const i = (y * w + mid) * 4;
      if (data[i] === 0) {
        topY = y;
        break;
      }
    }

    return h - topY;
  });

  return barHeights;
}
