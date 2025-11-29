// convertFont.cjs
const fs = require("fs");
const path = require("path");

const fontPath = path.join(__dirname, "src/fonts/NotoSans-Regular-BF6458645e279da.ttf");
const fontData = fs.readFileSync(fontPath);
const base64 = fontData.toString("base64");

fs.writeFileSync(
  path.join(__dirname, "src/fonts/NOTO-Regular.js"),
  `const notoFontBase64 = "${base64}";
export default notoFontBase64;
`
);

console.log("Font converted to Base64 successfully!");
