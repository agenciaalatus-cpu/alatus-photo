import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'C:\\Users\\Luiz Henrique RM\\.gemini\\antigravity-ide\\brain\\f90d4930-bbf5-4fd0-9ad2-e4f464569ecf\\.user_uploaded\\media_1792874611276.png';
const publicDir = path.resolve('public');

async function processLogo() {
  console.log('Loading image:', inputPath);
  const img = sharp(inputPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Exact camera lens circle
  const lensXc = 265.8;
  const lensYc = 285.5;
  const lensR = 17.5;

  // Create buffers for:
  // 1. Dark theme logo (white ALATUS + gold PHOTO)
  // 2. Light theme logo (dark ALATUS + gold PHOTO)
  const darkBuffer = Buffer.alloc(width * height * 4);
  const lightBuffer = Buffer.alloc(width * height * 4);

  // Background threshold parameters
  const bgThreshold = 10;
  const fullThreshold = 60;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const maxVal = Math.max(r, g, b);

      const dist = Math.hypot(x - lensXc, y - lensYc);

      let alpha = 0;
      let outR = r;
      let outG = g;
      let outB = b;

      if (dist <= lensR) {
        // Inside camera lens: keep completely opaque
        alpha = 255;
        outR = r;
        outG = g;
        outB = b;
      } else if (dist <= lensR + 1.2) {
        // Smooth transition at boundary of lens
        const t = (dist - lensR) / 1.2;
        const baseAlpha = maxVal <= bgThreshold ? 0 : Math.min(255, Math.round(((maxVal - bgThreshold) / (fullThreshold - bgThreshold)) * 255));
        alpha = Math.round(255 * (1 - t) + baseAlpha * t);
        outR = r;
        outG = g;
        outB = b;
      } else {
        // Outside lens: normal background transparency
        if (maxVal <= bgThreshold) {
          alpha = 0;
          outR = 0;
          outG = 0;
          outB = 0;
        } else {
          // Unmultiply alpha from black background for clean non-fringed edges
          const normAlpha = Math.min(1.0, Math.max(0.0, (maxVal - bgThreshold) / (fullThreshold - bgThreshold)));
          alpha = Math.round(normAlpha * 255);

          // Color unmultiplication
          const factor = normAlpha > 0.05 ? 1 / normAlpha : 1;
          outR = Math.min(255, Math.round(r * factor));
          outG = Math.min(255, Math.round(g * factor));
          outB = Math.min(255, Math.round(b * factor));
        }
      }

      // Fill Dark Buffer
      darkBuffer[idx] = outR;
      darkBuffer[idx + 1] = outG;
      darkBuffer[idx + 2] = outB;
      darkBuffer[idx + 3] = alpha;

      // Fill Light Buffer: convert white text in ALATUS (x > 385, y < 295) to dark slate #0F172A
      let lightR = outR;
      let lightG = outG;
      let lightB = outB;

      if (x > 385 && y < 295 && alpha > 0) {
        const isWhiteText = (r > 80 && g > 80 && b > 80 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30);
        if (isWhiteText) {
          lightR = 15;
          lightG = 23;
          lightB = 42;
        }
      }

      lightBuffer[idx] = lightR;
      lightBuffer[idx + 1] = lightG;
      lightBuffer[idx + 2] = lightB;
      lightBuffer[idx + 3] = alpha;
    }
  }

  // Convert to PNG buffers
  const darkPngBuffer = await sharp(darkBuffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const lightPngBuffer = await sharp(lightBuffer, { raw: { width, height, channels: 4 } }).png().toBuffer();

  // Trim to content bounding box
  const trimmedDark = await sharp(darkPngBuffer).trim().png().toBuffer();
  const trimmedLight = await sharp(lightPngBuffer).trim().png().toBuffer();

  // Save full transparent logos
  const logoDarkPngPath = path.join(publicDir, 'alatus-logo.png');
  const logoLightPngPath = path.join(publicDir, 'alatus-logo-light.png');

  fs.writeFileSync(logoDarkPngPath, trimmedDark);
  fs.writeFileSync(logoLightPngPath, trimmedLight);
  console.log('Saved full logos to public/');

  // Extract square Icon (the "A" camera emblem)
  const iconCropX = 158;
  const iconCropY = 180;
  const iconCropW = 215;
  const iconCropH = 168;

  const iconCroppedBuffer = await sharp(darkPngBuffer)
    .extract({ left: iconCropX, top: iconCropY, width: iconCropW, height: iconCropH })
    .png()
    .toBuffer();

  const iconSize = 512;
  const innerIconSize = 420;
  const resizedInner = await sharp(iconCroppedBuffer)
    .resize(innerIconSize, innerIconSize, { fit: 'inside' })
    .toBuffer();

  const iconSquare = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resizedInner, gravity: 'center' }])
    .png()
    .toBuffer();

  const iconPngPath = path.join(publicDir, 'alatus-icon.png');
  fs.writeFileSync(iconPngPath, iconSquare);
  console.log('Saved alatus-icon.png');

  // Favicon and App Icons
  await sharp(iconSquare).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(iconSquare).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(iconSquare).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(iconSquare).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192.png'));
  await sharp(iconSquare).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512.png'));

  // SVG Favicon with high-res embedded PNG
  const base64Icon = iconSquare.toString('base64');
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="data:image/png;base64,${base64Icon}" width="512" height="512" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  // Clean up scratch test files if any
  if (fs.existsSync('public/test-icon.png')) fs.unlinkSync('public/test-icon.png');
  if (fs.existsSync('public/test-icon-285.png')) fs.unlinkSync('public/test-icon-285.png');
  if (fs.existsSync('public/test-icon-perfect.png')) fs.unlinkSync('public/test-icon-perfect.png');

  console.log('All icons and logos regenerated with final high precision!');
}

processLogo().catch(console.error);
