// ==== GLOBAL VARIABLES ====
const imageInput = document.getElementById('imageInput');
const pasteZone = document.getElementById('pasteZone');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');
const clicks = []; // stores origin and top Y-axis clicks
let img = new Image();

// ==== HELPER FUNCTIONS ====
function isNonWhitePixel(r, g, b) {
  // returns true if pixel is not white (can adjust threshold if needed)
  return r + g + b < 750; 
}

function convertToBlackAndWhite() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const bw = avg < 200 ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);
}

// ==== IMAGE UPLOAD ====
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  clicks.length = 0; // reset clicks whenever a new image is loaded
  output.textContent = '';
};

// ==== PASTE HANDLING ====
pasteZone.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      const url = URL.createObjectURL(blob);
      img.src = url;
    }
  }
});

pasteZone.addEventListener('click', () => pasteZone.focus());

// ==== CANVAS CLICK HANDLING ====
canvas.addEventListener('click', (e) => {
  if (clicks.length >= 2) return; // only allow 2 clicks
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  clicks.push({ x, y });

  if (clicks.length === 1) {
    output.textContent = 'Origin selected. Now click TOP of Y-axis.';
  } else if (clicks.length === 2) {
    output.textContent = 'Top of Y-axis selected. Enter MAX Y-axis value to process.';
  }
});

// ==== GRAPH PROCESSING FUNCTION ====
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
  const margin = 5;

  let currentBar = null;
  let barBottomY = null;

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
        lowestYForColumn = y;
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
      if (lowestYForColumn !== null && lowestYForColumn > barBottomY) {
        barBottomY = lowestYForColumn;
      }
    } else {
      if (currentBar) {
        const width = currentBar.endX - currentBar.startX + 1;
        if (width >= minWidth && Math.abs(barBottomY - clicks[0].y) <= margin) {
          bars.push({ x: currentBar.startX, width, height: currentBar.height, bottomY: barBottomY });
        }
        currentBar = null;
        barBottomY = null;
      }
    }
  }

  if (currentBar) {
    const width = currentBar.endX - currentBar.startX + 1;
    if (width >= minWidth && Math.abs(barBottomY - clicks[0].y) <= margin) {
      bars.push({ x: currentBar.startX, width, height: currentBar.height, bottomY: barBottomY });
    }
  }

  const origin = clicks[0];
  const yTop = clicks[1];
  const pixelYDistance = origin.y - yTop.y;

  const values = bars.map(b => {
    const ratio = b.height / pixelYDistance;
    return parseFloat((ratio * maxYValue).toFixed(2));
  });

  if (values.length === 0) {
    output.textContent = "No bars detected aligned with origin.";
  } else {
    output.textContent = values.join("\n");
  }
}
