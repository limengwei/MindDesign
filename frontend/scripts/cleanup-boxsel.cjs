const fs = require('fs')
const f = 'e:/workspace/go/src/MindDesign/frontend/src/canvas/CanvasWrapper.vue'
let s = fs.readFileSync(f, 'utf8')
const lines = s.split('\n')

let out = []
let i = 0
while (i < lines.length) {
  const l = lines[i]

  // 1) Remove isMultiDelete ref
  if (l.trim() === 'const isMultiDelete = ref(false)') { i++; continue }

  // 2) Remove showConfirmMulti function (lines 34-46)
  if (l.includes('function showConfirmMulti()')) {
    while (i < lines.length && !lines[i].trim().startsWith('}')) i++
    i++ // skip }
    if (i < lines.length && lines[i].trim() === '') i++ // skip blank
    continue
  }

  // 3) Remove the multi-delete branch inside confirmDelete
  if (l.trim() === 'if (wasMulti) {') {
    // find the matching } and skip the multi-delete block including the else block
    // Actually let's handle this as: keep the else branch and remove the if (wasMulti) block
    // Find the matching }
    let depth = 0
    let startI = i
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
    // Also remove the following "} else {" and until the else closing brace
    // Actually the structure is: if (wasMulti) {...} else {...}
    // After our skip, the next line is "} else {"
    if (lines[i] && lines[i].trim() === '} else {') {
      // We want to keep the else block but remove the "} else {" prefix
      // Actually replace the else with nothing and unindent
      // Simplest: just skip the "} else {" line
      i++
    }
    continue
  }

  // 4) Remove isMultiDelete.value = false in cancelDelete
  if (l.trim() === 'isMultiDelete.value = false') { i++; continue }

  // 5) Remove box selection state vars
  if (l.includes('// Phase 5：框选状态')) {
    // skip comment + 9 lines
    let j = i
    while (j < lines.length && !(lines[j].trim() === 'let appUpEventId: any = null')) j++
    if (j < lines.length) j++ // skip that last line
    if (j < lines.length && lines[j].trim() === '') j++ // skip blank
    i = j
    continue
  }

  // 6) Remove setupBoxSelection function
  if (l.includes('// Phase 5：框选') && lines[i+1] && lines[i+1].includes('function setupBoxSelection()')) {
    // Skip the comment
    i++
    // Skip function body until matching }
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
    if (i < lines.length && lines[i].trim() === '') i++ // skip blank
    continue
  }

  // 7) Restore default dragEmpty (or remove the override)
  if (l.includes('// dragEmpty 关掉') || l.includes('holdSpaceKey: true, holdMiddleKey: true, dragEmpty: false')) {
    if (l.includes('dragEmpty: false')) {
      // Replace with default behavior - restore the default dragEmpty
      out.push("    move: { holdSpaceKey: true, holdMiddleKey: true, dragAnimate: 0.9 },")
      i++
      continue
    } else {
      // It's the comment line
      i++
      continue
    }
  }

  // 8) Remove setupBoxSelection() call
  if (l.trim() === '// Phase 5：拖拽框选' || l.trim() === '// 用一个 Rect 画在 treeLayer 上作为选区视觉（在世界坐标系内）' || l.trim() === 'setupBoxSelection()') {
    i++
    continue
  }

  // 9) Remove appDownEventId / appMoveEventId / appUpEventId teardown
  if (l.trim().startsWith('if (app && appDownEventId)') || l.trim().startsWith('if (app && appUpEventId)')) {
    i++
    continue
  }

  // 10) Remove appMoveEventId teardown (only for box selection, but since we removed the only usage, also remove)
  if (l.trim() === 'if (app && appMoveEventId) { app.off_(appMoveEventId); appMoveEventId = null }') {
    i++
    continue
  }

  // 11) Remove boxSelectionRect = null cleanup
  if (l.trim() === 'boxSelectionRect = null') {
    i++
    continue
  }

  // 12) Remove shift+click handling
  if (l.includes('toggleCardSelection')) { i++; continue }
  if (l.trim() === '// 单击：单选；shift+单击：加入/移出多选集合') { i++; continue }

  // 13) Remove the selectedCardIds watch
  if (l.includes('// Phase 5：监听多选集合')) {
    // skip the comment + the watch + the closing }
    i++
    while (i < lines.length) {
      // look for the closing of the watch with }, { deep: false })
      if (lines[i].trim().endsWith('}, { deep: false })')) {
        i++
        break
      }
      i++
    }
    if (i < lines.length && lines[i].trim() === '') i++
    continue
  }

  // 14) Remove multi-select action bar template
  if (l.includes('<!-- Phase 5：多选操作栏 -->')) {
    // skip 4 lines (the comment + the div + closing div + blank)
    i++
    while (i < lines.length && !lines[i].includes('</div>')) i++
    i++ // skip the closing </div>
    if (i < lines.length && lines[i].trim() === '') i++
    continue
  }

  // 15) Remove .multi-action-bar / .multi-action-label CSS
  if (l.includes('.multi-action-bar') || l.includes('.multi-action-label')) {
    i++
    continue
  }

  out.push(l)
  i++
}

fs.writeFileSync(f, out.join('\n'), 'utf8')
console.log('done')
