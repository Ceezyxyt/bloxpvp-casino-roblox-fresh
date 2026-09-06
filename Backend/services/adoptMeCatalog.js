const fs = require("fs");
const path = require("path");
const Item = require("../models/item");

const SOURCE_FILE = path.resolve(
  __dirname,
  "../../attached_assets/Pasted-Bat-Dragon-940-R-Bat-Dragon-927-F-Bat-Dragon-927-FR-Bat_1788453864289.txt"
);
const VALUE_LINE = /^(.*?)\s+\((\d+(?:\.\d+)?)\)\s*$/;

function parseAdoptMeValues(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.match(VALUE_LINE))
    .filter(Boolean)
    .map(([, displayName, value], index) => ({
      item_id: index + 1,
      item_name: `adopt_me_${displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}`,
      display_name: displayName,
      item_value: value,
      item_image: "",
      game: "pets",
    }));
}

async function seedAdoptMeCatalog() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.warn("Adopt Me value source was not found; skipping catalog seed");
    return 0;
  }

  const pets = parseAdoptMeValues(fs.readFileSync(SOURCE_FILE, "utf8"));
  if (pets.length === 0) return 0;

  await Item.bulkWrite(
    pets.map((pet) => ({
      updateOne: {
        filter: { item_name: pet.item_name },
        update: { $setOnInsert: pet },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  console.log(`Adopt Me catalog ready (${pets.length} pet variants)`);
  return pets.length;
}

module.exports = { parseAdoptMeValues, seedAdoptMeCatalog };