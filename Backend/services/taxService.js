const Account = require("../models/account");
const TaxEvent = require("../models/taxEvent");
const { GAME_TAX_RATE } = require("../config");

const TAX_ACCOUNT_ROBLOX_ID = "5329316694";

async function getTaxOwner(session) {
  const query = Account.findOne({ robloxId: TAX_ACCOUNT_ROBLOX_ID });
  if (session) query.session(session);
  return query.exec();
}

/**
 * Inventory items cannot be split, so the collected value is a greedy
 * whole-item total that reaches the 20% target. The event records both values
 * so the admin panel can distinguish the target from the actual item total.
 */
function selectTaxItems(items, grossValue) {
  const targetValue = Number(grossValue || 0) * GAME_TAX_RATE;
  const orderedItems = [...items].sort(
    (a, b) => Number(a.item?.item_value || 0) - Number(b.item?.item_value || 0)
  );
  const taxItems = [];
  const payoutItems = [];
  let collectedValue = 0;

  for (const inventoryItem of orderedItems) {
    const itemValue = Number(inventoryItem.item?.item_value || 0);
    if (collectedValue < targetValue) {
      taxItems.push(inventoryItem);
      collectedValue += itemValue;
    } else {
      payoutItems.push(inventoryItem);
    }
  }

  return { taxItems, payoutItems, targetValue, collectedValue };
}

async function recordTaxEvent({
  game,
  gameId,
  grossValue,
  targetValue,
  collectedValue,
  taxItems,
  session,
}) {
  const event = new TaxEvent({
    game,
    gameId,
    grossValue,
    targetValue,
    collectedValue,
    itemCount: taxItems.length,
    items: taxItems.map((inventoryItem) => ({
      inventoryItem: inventoryItem._id,
      itemName: inventoryItem.item?.item_name || "",
      displayName: inventoryItem.item?.display_name || "Unknown item",
      value: Number(inventoryItem.item?.item_value || 0),
    })),
  });
  return event.save(session ? { session } : undefined);
}

module.exports = {
  GAME_TAX_RATE,
  TAX_ACCOUNT_ROBLOX_ID,
  getTaxOwner,
  selectTaxItems,
  recordTaxEvent,
};