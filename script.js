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

/* ----------------------------------------------------------
   HANDLE CLICK EVENTS
---------------------------------------------------------- */
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

/* ----------------------------------------------------------
   PROCESS GRAPH (FIXED VERSION)
---------------------------------------------------------- */
function processGraph(maxYvalue) {
  convertToBW();

  const [origin, xTop, yTop] = clicks;

  // FIX: Use top of Y axis for vertical span
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

/* ----------------------------------------------------------
   BLACK & WHITE
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
   DETECT BARS (B&W IMAGE)
------------------------------------------------------
