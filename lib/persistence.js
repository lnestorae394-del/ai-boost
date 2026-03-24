const fs = require("fs");

function loadJSON(file, label) {
  try {
    const data = fs.readFileSync(file, "utf8");
    console.log(`💾 ${label} loaded`);
    return JSON.parse(data);
  } catch (e) {
    console.log(`⚠️ ${file} not found`);
    return null;
  }
}

function saveJSON(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { loadJSON, saveJSON };
