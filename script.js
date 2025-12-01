const imageInput = document.getElementById('imageInput');
const pasteZone = document.getElementById('pasteZone');
const output = document.getElementById('output');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) handleImage(file);
});

pasteZone.addEventListener('paste', async (event) => {
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      handleImage(blob);
      break;
    }
  }
});

async function handleImage(blob) {
  const img = await createImageBitmap(blob);
  canvas.width = img.width;
  canvas.height = img.height;

  // Light preprocessing
  ctx.filter = 'brightness(110%) contrast(130%)';
  ctx.drawImage(img, 0, 0);

  output.textContent = "Analyzing bar graph...";

  const barValues = extractBarValues(canvas, ctx);
  output.textContent = formatBarOutput(barValues);
}


/* ----------------------------------------------------------
    BAR GRAPH DETECTION LOGIC
---------------------------------------------------------- */

function extractBarValues(canvas, ctx) {
  const w = canvas.width;
  const h = canvas.height;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const columns = [];

  // Scan each column for darkness (bar presence)
  for (let x = 0; x < w; x++) {
    let darkness = 0;

    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;

      // Consider pixel "dark" if brightness significantly below white
      if (brightness < 180) darkness++;
    }

    columns.push(darkness);
  }

  // Identify clusters (bars)
  const bars = [];
  let insideBar = false;
  let startX = 0;

  const threshold = Math.max(...columns) * 0.3;

  for (let x = 0; x < w; x++) {
    if (!insideBar && columns[x] > threshold) {
      insideBar = true;
      startX = x;
    }
    if (insideBar && columns[x] <= threshold) {
      insideBar = false;
      bars.push({ start: startX, end: x });
    }
  }

  // Calculate bar heights
  const barValues = bars.map(bar => {
    const barCenter = Math.floor((bar.start + bar.end) / 2);

    let topY = null;
    for (let y = 0; y < h; y++) {
      const i = (y * w + barCenter) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;

      if (brightness < 180) {
        topY = y;
        break;
      }
    }

    const bottomY = h;
    const barHeight = bottomY - topY;

    return barHeight;
  });

  return barValues;
}


/* ----------------------------------------------------------
    FORMAT OUTPUT
---------------------------------------------------------- */

function formatBarOutput(values) {
  if (!values.length) return "No bars detected.";

  let text = "Detected Bar Values (Relative Pixel Heights):\n\n";

  values.forEach((v, i) => {
    text += `Bar ${i + 1}: ${v} units\n`;
  });

  return text;
}
