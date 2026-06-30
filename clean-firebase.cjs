const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');
const startStr = "const DEFAULT_BLOGS: Blog[] = [";
const endStr = `  {
    id: "blog-03",`;
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);
if (startIdx > -1 && endIdx > -1) {
  const newContent = content.substring(0, startIdx + startStr.length) + '\n' + content.substring(endIdx);
  fs.writeFileSync('src/firebase.ts', newContent);
  console.log("Success");
} else {
  console.log("Failed to find boundaries");
}
