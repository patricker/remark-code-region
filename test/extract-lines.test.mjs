import { describe, it, expect } from 'vitest';
import { extractLines } from '../lib/extract-lines.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sayHi = fs.readFileSync(path.join(__dirname, 'fixtures/snippets/say-hi.js'), 'utf-8');

describe('extractLines', () => {
  it('extracts a line range (L2-L4)', () => {
    const result = extractLines(sayHi, 'L2-L4', 'say-hi.js');
    expect(result).toBe('function sayHi(name) {\n  console.log(`Hi, ${name}!`);\n}');
  });

  it('extracts a single line (L1)', () => {
    const result = extractLines(sayHi, 'L1', 'say-hi.js');
    expect(result).toBe('// Say hi module');
  });

  it('extracts from line to EOF (L5-)', () => {
    const result = extractLines(sayHi, 'L5-', 'say-hi.js');
    // File has trailing newline → 7 lines when split; L5- gets lines 5-7
    expect(result).toContain('module.exports = sayHi;');
    expect(result).not.toContain('function sayHi');
  });

  it('extracts entire file (L1-L7)', () => {
    // File has trailing newline → 7 lines when split
    const result = extractLines(sayHi, 'L1-L7', 'say-hi.js');
    expect(result).toBe(sayHi);
  });

  it('extracts last line only (L6)', () => {
    const result = extractLines(sayHi, 'L6', 'say-hi.js');
    expect(result).toBe('module.exports = sayHi;');
  });

  it('handles L2-L2 as single line', () => {
    const result = extractLines(sayHi, 'L2-L2', 'say-hi.js');
    expect(result).toBe('function sayHi(name) {');
  });
});

describe('extractLines — errors', () => {
  it('throws on L0 (below 1-based minimum)', () => {
    expect(() => extractLines(sayHi, 'L0', 'say-hi.js'))
      .toThrow('line 0 is out of range');
  });

  it('throws on start > total lines', () => {
    expect(() => extractLines(sayHi, 'L99', 'say-hi.js'))
      .toThrow('line 99 is out of range');
  });

  it('throws on end > total lines', () => {
    expect(() => extractLines(sayHi, 'L1-L99', 'say-hi.js'))
      .toThrow('line 99 is out of range');
  });

  it('throws on reversed range (L6-L3)', () => {
    expect(() => extractLines(sayHi, 'L6-L3', 'say-hi.js'))
      .toThrow('start line 6 is after end line 3');
  });

  it('throws on empty file (L2)', () => {
    // ''.split('\n') gives [''] — 1 element, so L1 is valid but L2 is out of range
    expect(() => extractLines('', 'L2', 'empty.js'))
      .toThrow('line 2 is out of range');
  });
});
