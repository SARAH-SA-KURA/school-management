const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/BADR/.claude/projects/C--Users-BADR-Desktop-SchoolProject-shool-managment/78220e5e-ff50-49fe-9825-06a15cd7377d/tool-results/toolu_01LoxuXGH7iV8DVSURkn3ZWX.txt','utf8'));

d.children.forEach(page => {
  const illustCandidates = page.children.filter(c => {
    if (c.type !== 'FRAME' && c.type !== 'GROUP') return false;
    // Look for large non-form frames (illustrations)
    const bb = c.absoluteBoundingBox;
    if (!bb) return false;
    // Illustrations are usually wide, positioned on the left
    return bb.width > 300;
  });
  console.log(`\n=== ${page.name} (${page.id}) ===`);
  illustCandidates.forEach(c => {
    const bb = c.absoluteBoundingBox;
    console.log(`  ${c.id} | ${c.name} | ${c.type} | ${bb.width}x${bb.height} @ (${bb.x},${bb.y})`);
  });
});
