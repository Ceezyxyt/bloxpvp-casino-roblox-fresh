const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const taxEventSchema = new Schema({
  game: { type: String, enum: ["coinflip", "jackpot"], required: true },
  gameId: { type: Schema.Types.ObjectId, required: true },
  grossValue: { type: Number, required: true },
  targetValue: { type: Number, required: true },
  collectedValue: { type: Number, required: true },
  itemCount: { type: Number, required: true },
  items: [
    {
      inventoryItem: { type: Schema.Types.ObjectId },
      itemName: { type: String },
      displayName: { type: String },
      value: { type: Number },
    },
  ],
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("TaxEvent", taxEventSchema);