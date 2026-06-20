const fs = require('fs')
const f = 'e:/workspace/go/src/MindDesign/frontend/src/ai/chat.ts'
let s = fs.readFileSync(f, 'utf8')
const lines = s.split('\n')

// Find and remove the following blocks:
// - ElementDiff interface (lines 46-51 plus blank line)
// - ELEMENT_DIFF replacement in extractHTML
// - extractElementDiff function
// We'll do it by reading line by line and skipping the bad blocks

let out = []
let i = 0
while (i < lines.length) {
  const l = lines[i]
  // Block 1: ElementDiff interface
  if (l.includes('Phase 3') && l.includes('ELEMENT_DIFF') && lines[i+1] && lines[i+1].includes('export interface ElementDiff')) {
    // skip the comment line and the interface body
    while (i < lines.length && !(lines[i].trim() === '}')) {
      i++
    }
    i++ // skip the closing }
    if (i < lines.length && lines[i].trim() === '') i++ // skip blank line
    continue
  }
  // Block 2: ELEMENT_DIFF replacement in extractHTML
  if (l.includes("ELEMENT_DIFF[\\s\\S]*?ELEMENT_DIFF -->") && l.includes("cleaned = cleaned.replace")) {
    i++
    continue
  }
  // Block 3: extractElementDiff function
  if (l.includes('Phase 3') && l.includes('ELEMENT_DIFF') && lines[i+1] && lines[i+1].includes('function extractElementDiff')) {
    // skip the comment line
    i++
    // skip the function body until closing }
    while (i < lines.length && !lines[i].trim().startsWith('}')) {
      i++
    }
    i++ // skip the closing }
    if (i < lines.length && lines[i].trim() === '') i++ // skip blank line
    continue
  }
  out.push(l)
  i++
}

fs.writeFileSync(f, out.join('\n'), 'utf8')
console.log('done')
