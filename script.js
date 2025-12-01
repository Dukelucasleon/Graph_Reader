const imageInput = document.getElementById('imageInput');
const pasteZone = document.getElementById('pasteZone');
const output = document.getElementById('output');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let imgBitmap = null;
let clicks = [];
let clickStage = 0;

const instructions = [
  "Click the ORIGIN (0,0).",
  "Click the TOP OF THE X AXIS.",
  "Click the TOP OF THE Y AXIS."
];

imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) loadImage(file);
});

pasteZone.addEventListener('paste', (event) => {
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      loadImage(item.getAsFile());
      break;
    }
  }
});

async function loadImage(blob) {
  imgBitmap = await createImageBitmap(blob);

  // Set canvas to exact image pixel size
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

/* ----------------------------------------------------------
   CLICK HANDLING (FIXED)
---------------------------------------------------------- */

canvas.addEventListener('click', (e) => {
  if (!imgBitmap) return;

  // FIX: properly compute canvas-based coordinates even if resized
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  console.log("Click:", x, y);

  clicks.push({ x, y });
  clickStage++;

  if (clickStage < 3) {
    output.textContent =
      `Point recorded.\n\nNext: ${instructions[clickStage]}`;
  } else {
    output.textContent = "All points recorded.\n\nProcessing graph...";
    setTimeout(processGraph, 300);
  }
});

/* ----------------------------------------------------------
   PROCESS GRAPH
---------------------------------------------------------- */

function processGraph() {
  convertToBW();

  const [origin, xTop, yTop] = clicks;

  const pixelYrange = origin.y - xTop.y;

  const bars = detectBars();

  const calibrated = bars.map(pixels =>
    (pixels / pixelYrange).toFixed(3)
  );

  let text = "Detected Bar Values (Calibrated):\n\n";
  calibrated.forEach((v, i) => (text += `Bar ${i + 1}: ${v}\n`));

  output.textContent = text;
}

/* ----------------------------------------------------------
   BLACK & WHITE CONVERSION
---------------------------------------------------------- */

function convertToBW() {
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const bright = (d[i] + d[i+1] + d[i+2]) / 3;
    const v = bright < 150 ? 0 : 255;
    d[i] = d[i+1] = d[i+2] = v;
  }

  ctx.putImageData(img, 0, 0);
}

/* ----------------------------------------------------------
   BAR DETECTION
---------------------------------------------------------- */

function detectBars() {
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;

  const darkness = [];

  for (let x = 0; x < w; x++) {
    let dark = 0;

    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4] === 0) dark++;
    }

    darkness.push(dark);
  }

  const threshold = Math.max(...darkness) * 0.4;

  let bars = [];
  let inBar = false;
  let start = 0;

  for (let x = 0; x < w; x++) {
    if (!inBar && darkness[x] > threshold) {
      inBar = true;
      start = x;
    }
    if (inBar && darkness[x] <= threshold) {
      inBar = false;
      bars.push({ start, end: x });
    }
  }

  return bars.map(bar => {
    const mid = Math.floor((bar.start + bar.end) / 2);
    let topY = null;

    for (let y = 0; y < h; y++) {
      if (data[(y * w + mid) * 4] === 0) {
        topY = y;
        break;
      }
    }

    return h - topY;
  });
}
