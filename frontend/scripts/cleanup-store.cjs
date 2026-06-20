const fs = require('fs')
const f = 'e:/workspace/go/src/MindDesign/frontend/src/stores/canvasStore.ts'
let s = fs.readFileSync(f, 'utf8')
const lines = s.split('\n')

let out = []
let i = 0
while (i < lines.length) {
  const l = lines[i]

  // 1) Remove selectedCardIds ref
  if (l.includes('// Phase 5：多选状态') && lines[i+1] && lines[i+1].includes('selectedCardIds = ref')) {
    // skip the comment and the ref line
    i += 2
    continue
  }

  // 2) Simplify selectCard: remove the selectedCardIds line
  if (l.includes('// 单选：清空多选集合，只保留当前一张')) {
    i++
    continue
  }
  if (l.trim() === 'selectedCardIds.value = id ? [id] : []') {
    i++
    continue
  }

  // 3) Remove selectCards function
  if (l.includes('// Phase 5：框选/批量选中') && lines[i+1] && lines[i+1].includes('function selectCards')) {
    // skip the comment
    i++
    // skip function body
    let depth = 0
    while (i < lines.length) {
      if (lines[i].includes('{')) depth++
      if (lines[i].includes('}')) {
        depth--
        if (depth === 0) {
          i++
          break
        }
      }
      i++
    }
    if (i < lines.length && lines[i].trim() === '') i++
    continue
  }

  // 4) Remove toggleCardSelection function
  if (l.includes('// Phase 5：shift+点击') && lines[i+1] && lines[i+1].includes('function toggleCardSelection')) {
    i++
    let depth = 0
    while (i < lines.length) {
      if (lines[i].includes('{')) depth++
      if (lines[i].includes('}')) {
        depth--
        if (depth === 0) {
          i++
          break
        }
      }
      i++
    }
    if (i < lines.length && lines[i].trim() === '') i++
    continue
  }

  // 5) Remove selectedCardIds cleanup in removeCard
  if (l.trim() === 'const idx = selectedCardIds.value.indexOf(id)') { i++; continue }
  if (l.trim() === 'if (idx >= 0) selectedCardIds.value.splice(idx, 1)') { i++; continue }

  // 6) Remove selectedCardIds.value = [] in reset
  if (l.trim() === 'selectedCardIds.value = []') { i++; continue }

  // 7) Remove selectedCardIds from return
  if (l.includes('selectedCardId, selectedCardIds')) {
    out.push(l.replace(', selectedCardIds', ''))
    i++
    continue
  }

  // 8) Remove selectCards, toggleCardSelection from exports
  if (l.includes('selectCard, selectCards, toggleCardSelection')) {
    out.push(l.replace(', selectCards, toggleCardSelection', ''))
    i++
    continue
  }

  out.push(l)
  i++
}

fs.writeFileSync(f, out.join('\n'), 'utf8')
console.log('done')
