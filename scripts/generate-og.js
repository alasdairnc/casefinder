#!/usr/bin/env node
// Run once: node scripts/generate-og.js
// Requires: npm install canvas --save-dev

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 80;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#FAF7F2';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Subtle border
ctx.strokeStyle = '#d8d0c4';
ctx.lineWidth = 1;
ctx.strokeRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1);

// "casedive" title
ctx.fillStyle = '#2c2825';
ctx.font = '72px "Times New Roman"';
ctx.textBaseline = 'top';
ctx.fillText('casedive', PADDING, 220);

// Gold rule
const titleWidth = ctx.measureText('casedive').width;
ctx.fillStyle = '#d4a040';
ctx.fillRect(PADDING, 220 + 72 + 20, 200, 2);

// Subtitle
ctx.fillStyle = 'rgba(44, 40, 37, 0.6)';
ctx.font = '24px "Helvetica Neue", Helvetica, Arial, sans-serif';
ctx.fillText('Canadian Legal Research Tool', PADDING, 220 + 72 + 20 + 2 + 20);

// Bottom-left URL
ctx.fillStyle = 'rgba(44, 40, 37, 0.4)';
ctx.font = '16px "Helvetica Neue", Helvetica, Arial, sans-serif';
ctx.textBaseline = 'bottom';
ctx.fillText('casedive.ca', PADDING, HEIGHT - PADDING);

// Bottom-right scales emoji
ctx.fillStyle = '#d4a040';
ctx.font = '48px serif';
ctx.textAlign = 'right';
ctx.fillText('⚖️', WIDTH - PADDING, HEIGHT - PADDING);

// Save
const outPath = path.join(__dirname, '..', 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log(`Saved ${buffer.length} bytes to ${outPath}`);
console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);
