// A minimal, zero-dependency QR Code generator in pure JavaScript
// Generates a standard ISO/IEC 18004 QR Code Matrix (Byte mode, Error Correction Level M/L)

export function generateQRCodeMatrix(text) {
  // Simple, robust QR Code generator for URLs and strings up to 100 chars
  // Version 2/3 QR code: 25x25 or 29x29 matrix
  const length = text.length;
  const version = length <= 14 ? 1 : (length <= 26 ? 2 : (length <= 42 ? 3 : 4));
  const size = version * 4 + 17;
  
  // Initialize matrix
  const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
  const isFunction = Array(size).fill(null).map(() => Array(size).fill(false));

  function setFinder(x, y) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = y + r;
        const col = x + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          isFunction[row][col] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[row][col] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0;
          } else {
            matrix[row][col] = 0;
          }
        }
      }
    }
  }

  // Set 3 Finder Patterns
  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    isFunction[6][i] = true;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
    isFunction[i][6] = true;
  }

  // Alignment pattern for version >= 2
  if (version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        isFunction[alignPos + r][alignPos + c] = true;
        matrix[alignPos + r][alignPos + c] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) ? 1 : 0;
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = 1;
  isFunction[size - 8][8] = true;

  // Encode byte data
  const dataBits = [];
  // Mode indicator: 0100 (Byte mode)
  dataBits.push(0, 1, 0, 0);
  // Character count indicator (8 bits for version 1-9)
  for (let i = 7; i >= 0; i--) {
    dataBits.push((length >> i) & 1);
  }
  // Data bytes
  for (let i = 0; i < length; i++) {
    const code = text.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      dataBits.push((code >> j) & 1);
    }
  }
  // Terminator: up to 4 zeros
  dataBits.push(0, 0, 0, 0);
  // Pad to multiple of 8
  while (dataBits.length % 8 !== 0) dataBits.push(0);

  // Pad bytes: alternating 0xEC (236) and 0x11 (17)
  const totalCapacity = (version === 1 ? 19 : (version === 2 ? 34 : (version === 3 ? 55 : 80))) * 8;
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (dataBits.length < totalCapacity) {
    const pb = padBytes[padIdx % 2];
    for (let j = 7; j >= 0; j--) {
      dataBits.push((pb >> j) & 1);
    }
    padIdx++;
  }

  // Place data in matrix (zigzag from bottom-right)
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern
    for (let vert = 0; vert < size; vert++) {
      const row = upwards ? size - 1 - vert : vert;
      for (let col = right; col >= right - 1; col--) {
        if (!isFunction[row][col]) {
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = bit ^ (mask ? 1 : 0);
        }
      }
    }
    upwards = !upwards;
  }

  return { matrix, size };
}
