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

/* ----------------------------
   IMAGE LOAD HANDLERS
---------------------------- */
imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) loadImage(file);
});

pasteZone.addEventListener('click', () => {
  pasteZone.focus();
});

pasteZone.addEventListener('paste', (event) => {
  event.preventDefault();
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      loadImage(file);
      return; // stop after first image
    }
  }
  alert("No image found in clipboard!");
});

async function loadImage(blob) {
  imgBitmap = await createImageBitmap(blob);

  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;

  ctx.drawImage(imgBitmap, 0, 0);

  clicks = [];
  clickStage = 0;

  output.textContent =
    "Image loaded.\n\n" +
    "Now: " + instructions[clickStage] +
    "\n\nClick directly on the image.";
}

/* ----------------------------
   CLICK HANDLING
---------------------------- */
canvas.addEventListener('click', (e) => {
  if (!imgBitmap) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  clicks.push({ x, y });
  clickStage++;

  if (clickStage < 3) {
    output.textContent =
      `Point recorded.\n\nNext: ${instructions[clickStage]}`;
  } else {
    const maxY = prompt("Enter the MAXIMUM value shown on the Y-axis (example: 100):");

    if (!maxY || isNaN(maxY)) {
      output.textContent = "Invalid Y-axis max value. Reload the image to try again.";
      return;
    }

    output.textContent = "Processing graph...";
    setTimeout(() => processGraph(parseFloat(maxY)), 300);
  }
});

/* ----------------------------
   PROCESS GRAPH
---------------------------- */
function processGraph(maxYvalue) {
  convertToBW();

  const [origin, xTop, yTop] = clicks;

  // Correct vertical pixel range
  const pixelYrange = origin.y - yTop.y;

  if (pixelYrange <= 0) {
    output.textContent =
      "Error: Y-axis top must be ABOVE origin.\nReload image and click again.";
    return;
  }

  const bars = detectBars();

  const calibrated = bars.map(pix => {
    if (!isFinite(pix)) return "Unreadable";
    return ((pix / pixelYrange) * maxYvalue).toFixed(3);
  });

  let text = `Detected Bar Values (0–${maxYvalue} scale):\n\n`;
  calibrated.forEach((v, i) => (text += `Bar ${i + 1}: ${v}\n`));

  output.textContent = text;
}

/* ----------------------------
   BLACK & WHITE CONVERSION
---------------------------- */
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

/* ----------------------------
   BAR DETECTION (BLACK & WHITE IMAGE)
---------------------------- */
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

    if (topY === null) return NaN;

    return h - topY;
  });
}
