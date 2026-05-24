// Parse every .jsx file so syntax errors fail CI instead of silently breaking
// the in-browser Babel transform at runtime.
const fs = require("fs");
const parser = require("@babel/parser");

const files = fs.readdirSync(".").filter((f) => f.endsWith(".jsx"));
let bad = 0;
for (const f of files) {
  try {
    parser.parse(fs.readFileSync(f, "utf8"), { sourceType: "script", plugins: ["jsx"] });
    console.log("ok   " + f);
  } catch (e) {
    console.error("FAIL " + f + ": " + e.message);
    bad++;
  }
}
if (!files.length) { console.error("no .jsx files found"); process.exit(1); }
process.exit(bad ? 1 : 0);
