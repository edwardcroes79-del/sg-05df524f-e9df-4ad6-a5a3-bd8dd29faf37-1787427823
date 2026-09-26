const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/index.tsx', 'utf8');
const replacement = fs.readFileSync('replacement.tsx', 'utf8');

const regex = /\{businesses\.map\(\(biz\) => \{[\s\S]*?\{businesses\.length === 0 && \(/;

if (regex.test(code)) {
  code = code.replace(regex, replacement.trim());
  fs.writeFileSync('src/pages/admin/index.tsx', code);
  console.log("Successfully replaced the entire businesses map block!");
} else {
  console.log("Regex did not match! Printing context:");
  const idx = code.indexOf('businesses.map');
  if (idx !== -1) {
    console.log(code.substring(idx, idx + 1000));
  }
}
