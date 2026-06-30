const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');
const startStr = "const DEFAULT_PROJECTS: Project[] = [";
const endStr = "];";
const startIdx = content.indexOf(startStr);
if (startIdx > -1) {
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx > -1) {
    const newContent = content.substring(0, startIdx) + "const DEFAULT_PROJECTS: Project[] = [];" + content.substring(endIdx + 2);
    fs.writeFileSync('src/firebase.ts', newContent);
    console.log("Success");
  }
}
