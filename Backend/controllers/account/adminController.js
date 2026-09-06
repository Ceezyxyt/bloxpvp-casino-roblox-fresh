const asyncHandler = require("express-async-handler");
const Account = require("../../models/account");
const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const TaxEvent = require("../../models/taxEvent");
const { body, validationResult } = require("express-validator");
const {
  GAME_TAX_RATE,
  TAX_ACCOUNT_ROBLOX_ID,
  getTaxOwner,
} = require("../../services/taxService");
const { sendDiscordLog } = require("../../services/discordWebhookService");

const ADMIN_RANKS = ["OWNER", "ADMIN"];
const MANAGEABLE_RANKS = ["USER", "MOD", "ADMIN", "OWNER"];

exports.requireAdmin = asyncHandler(async (req, res, next) => {
  const account = await Account.findOne({ _id: req.user.id });
  if (!account || !ADMIN_RANKS.includes(String(account.rank || "").toUpperCase())) {
    return res.status(403).json({ success: false, message: "Forbidden: Admin only" });
  }
  next();
});

exports.get_all_users = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || "";

  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { displayName: { $regex: search, $options: "i" } },
          { robloxId: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const total = await Account.countDocuments(query);
  const users = await Account.find(query, {
    _id: 1,
    robloxId: 1,
    username: 1,
    displayName: 1,
    thumbnail: 1,
    balance: 1,
    rank: 1,
    joinDate: 1,
    wagered: 1,
    deposited: 1,
    withdrawn: 1,
    totalBets: 1,
  })
    .sort({ joinDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({ users, total, page, pages: Math.ceil(total / limit) });
});

exports.get_stats = asyncHandler(async (req, res) => {
  const totalUsers = await Account.countDocuments();
  const totalBalanceResult = await Account.aggregate([
    { $group: { _id: null, total: { $sum: "$balance" } } },
  ]);
  const totalWageredResult = await Account.aggregate([
    { $group: { _id: null, total: { $sum: "$wagered" } } },
  ]);
  const recentUsers = await Account.find(
    {},
    { username: 1, thumbnail: 1, joinDate: 1, balance: 1, rank: 1 }
  )
    .sort({ joinDate: -1 })
    .limit(5);

  res.status(200).json({
    totalUsers,
    totalBalance: totalBalanceResult[0]?.total || 0,
    totalWagered: totalWageredResult[0]?.total || 0,
    recentUsers,
  });
});

exports.set_balance = [
  body("userId").trim().escape(),
  body("balance").isFloat({ min: 0 }).withMessage("Balance must be a positive number"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, balance } = req.body;
    const account = await Account.findOneAndUpdate(
      { robloxId: userId },
      { balance: parseFloat(balance) },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: { username: account.username, balance: account.balance } });
  }),
];

exports.set_rank = [
  body("userId").trim().escape(),
  body("rank").trim().isIn(MANAGEABLE_RANKS).withMessage("Invalid rank"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, rank } = req.body;
    const actor = await Account.findById(req.user.id);
    if (rank === "OWNER" && actor?.rank !== "OWNER") {
      return res.status(403).json({ success: false, message: "Only the owner can assign the owner role" });
    }
    if (userId === actor?.robloxId && rank !== "OWNER" && actor?.rank === "OWNER") {
      return res.status(400).json({ success: false, message: "The owner role cannot be removed from the owner account" });
    }
    const account = await Account.findOneAndUpdate(
      { robloxId: userId },
      { rank },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: { username: account.username, rank: account.rank } });
  }),
];

// ── ITEM MANAGEMENT ────────────────────────────────────────────────────────

exports.get_items = asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit = String(req.query.limit || "50").toLowerCase();
  const allItems = requestedLimit === "all";
  const limit = allItems
    ? 0
    : Math.min(Math.max(parseInt(requestedLimit, 10) || 50, 1), 200);
  const query = search
    ? {
        $or: [
          { item_name: { $regex: search, $options: "i" } },
          { display_name: { $regex: search, $options: "i" } },
        ],
      }
    : {};
  const total = await Item.countDocuments(query);
  let itemsQuery = Item.find(query).sort({ item_name: 1 });
  if (!allItems) {
    itemsQuery = itemsQuery.skip((page - 1) * limit).limit(limit);
  }
  const items = await itemsQuery;
  res.status(200).json({
    items,
    total,
    page: allItems ? 1 : page,
    pages: allItems ? 1 : Math.ceil(total / limit),
  });
});

exports.create_item = [
  body("item_name").trim().notEmpty().withMessage("item_name is required"),
  body("display_name").trim().notEmpty().withMessage("display_name is required"),
  body("item_value").trim().notEmpty().withMessage("item_value is required"),
  body("item_image").trim().optional(),
  body("game").trim().notEmpty().withMessage("game is required"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { item_name, display_name, item_value, item_image, game } = req.body;

    const exists = await Item.findOne({ item_name });
    if (exists) return res.status(409).json({ success: false, message: "An item with that name already exists" });

    const maxItem = await Item.findOne().sort({ item_id: -1 });
    const item_id = maxItem ? (maxItem.item_id || 0) + 1 : 1;

    const item = new Item({ item_id, item_name, display_name, item_value, item_image: item_image || "", game });
    await item.save();

    res.status(200).json({ success: true, item });
  }),
];

exports.update_item = [
  body("itemId").trim().notEmpty().withMessage("itemId is required"),
  body("item_name").optional({ checkFalsy: true }).trim().isLength({ max: 240 }).withMessage("item_name is too long"),
  body("display_name").optional({ checkFalsy: true }).trim().isLength({ max: 240 }).withMessage("display_name is too long"),
  body("item_value").optional({ checkFalsy: true }).trim().isFloat({ min: 0 }).withMessage("item_value must be a positive number"),
  body("item_image").optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage("item_image is too long"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const updates = {};
    if (req.body.item_name !== undefined) updates.item_name = String(req.body.item_name).trim();
    if (req.body.display_name !== undefined) updates.display_name = String(req.body.display_name).trim();
    if (req.body.item_value !== undefined) updates.item_value = String(req.body.item_value);
    if (req.body.item_image !== undefined) updates.item_image = String(req.body.item_image || "");
    if (updates.item_name) {
      const duplicate = await Item.findOne({
        item_name: updates.item_name,
        _id: { $ne: req.body.itemId },
      });
      if (duplicate) return res.status(409).json({ success: false, message: "An item with that internal name already exists" });
    }

    const item = await Item.findByIdAndUpdate(req.body.itemId, { $set: updates }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    res.status(200).json({ success: true, item });
  }),
];

exports.delete_item = [
  body("itemId").trim().notEmpty().withMessage("itemId is required"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const item = await Item.findByIdAndDelete(req.body.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    void sendDiscordLog("items", "Catalog item removed", [
      { name: "Item", value: `${item.display_name} (${item.item_name})`, inline: true },
      { name: "Value", value: String(item.item_value), inline: true },
      { name: "Admin account", value: req.user.id, inline: true },
    ]);
    res.status(200).json({ success: true, message: `Deleted item: ${item.display_name}` });
  }),
];

exports.give_item = [
  body("robloxId").trim().notEmpty().withMessage("robloxId is required"),
  body("itemId").trim().notEmpty().withMessage("itemId is required"),
  body("quantity").isInt({ min: 1, max: 100 }).withMessage("quantity must be 1–100"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { robloxId, itemId, quantity } = req.body;

    const account = await Account.findOne({ robloxId });
    if (!account) return res.status(404).json({ success: false, message: "User not found" });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const qty = parseInt(quantity) || 1;
    const docs = Array.from({ length: qty }, () => ({
      item: item._id,
      owner: account._id,
      locked: false,
      game: item.game,
    }));

    await InventoryItem.insertMany(docs);

    void sendDiscordLog("items", "Admin gave item(s)", [
      { name: "Recipient", value: `${account.username} (${account.robloxId})`, inline: true },
      { name: "Item", value: item.display_name, inline: true },
      { name: "Quantity", value: String(qty), inline: true },
      { name: "Admin account", value: req.user.id, inline: true },
    ]);
    res.status(200).json({
      success: true,
      message: `Gave ${qty}× ${item.display_name} to ${account.username}`,
    });
  }),
];

exports.get_user_inventory = asyncHandler(async (req, res) => {
  const { robloxId } = req.query;
  if (!robloxId) return res.status(400).json({ success: false, message: "robloxId required" });

  const account = await Account.findOne({ robloxId });
  if (!account) return res.status(404).json({ success: false, message: "User not found" });

  const items = await InventoryItem.find({ owner: account._id }).populate("item").sort({ _id: -1 });
  res.status(200).json({ success: true, username: account.username, items });
});

// ── TAX INVENTORY ───────────────────────────────────────────────────────────

exports.get_tax = asyncHandler(async (req, res) => {
  const taxOwner = await getTaxOwner();
  const [items, events] = await Promise.all([
    taxOwner
      ? InventoryItem.find({ owner: taxOwner._id, locked: false })
          .populate("item")
          .sort({ _id: -1 })
      : [],
    TaxEvent.find().sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  const balance = items.reduce(
    (total, inventoryItem) => total + Number(inventoryItem.item?.item_value || 0),
    0
  );

  res.status(200).json({
    success: true,
    taxRate: GAME_TAX_RATE,
    taxOwner: taxOwner
      ? {
          id: taxOwner._id,
          robloxId: taxOwner.robloxId,
          username: taxOwner.username,
          displayName: taxOwner.displayName,
        }
      : null,
    taxOwnerRobloxId: TAX_ACCOUNT_ROBLOX_ID,
    balance,
    itemCount: items.length,
    items,
    events,
  });
});

exports.add_tax_item = [
  body("itemId").trim().notEmpty().withMessage("itemId is required"),
  body("quantity")
    .isInt({ min: 1, max: 100 })
    .withMessage("quantity must be 1–100"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const taxOwner = await getTaxOwner();
    if (!taxOwner) {
      return res.status(409).json({
        success: false,
        message: "The tax account has not logged in yet",
      });
    }
    const item = await Item.findById(req.body.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    const quantity = parseInt(req.body.quantity, 10);
    await InventoryItem.insertMany(
      Array.from({ length: quantity }, () => ({
        item: item._id,
        owner: taxOwner._id,
        locked: false,
        game: item.game,
      }))
    );

    void sendDiscordLog("tax", "Manual tax inventory addition", [
      { name: "Item", value: item.display_name, inline: true },
      { name: "Quantity", value: String(quantity), inline: true },
      { name: "Admin account", value: req.user.id, inline: true },
    ]);
    res.status(200).json({
      success: true,
      message: `Added ${quantity}× ${item.display_name} to the tax inventory`,
    });
  }),
];

exports.release_tax_item = [
  body("inventoryId").trim().notEmpty().withMessage("inventoryId is required"),
  body("robloxId").trim().notEmpty().withMessage("robloxId is required"),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const taxOwner = await getTaxOwner();
    if (!taxOwner) {
      return res.status(409).json({
        success: false,
        message: "The tax account has not logged in yet",
      });
    }
    const recipient = await Account.findOne({ robloxId: req.body.robloxId });
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }
    if (String(recipient._id) === String(taxOwner._id)) {
      return res.status(400).json({ success: false, message: "Choose a different recipient" });
    }

    const taxItem = await InventoryItem.findOne({
      _id: req.body.inventoryId,
      owner: taxOwner._id,
      locked: false,
    }).populate("item");
    if (!taxItem) {
      return res.status(404).json({
        success: false,
        message: "Tax item not found or currently locked",
      });
    }

    await InventoryItem.updateOne(
      { _id: taxItem._id, owner: taxOwner._id },
      { owner: recipient._id, locked: false }
    );
    void sendDiscordLog("tipping", "Tax inventory item tipped", [
      { name: "Item", value: taxItem.item?.display_name || "Unknown item", inline: true },
      { name: "Recipient", value: `${recipient.username} (${recipient.robloxId})`, inline: true },
      { name: "Admin account", value: req.user.id, inline: true },
    ]);
    res.status(200).json({
      success: true,
      message: `Sent ${taxItem.item?.display_name || "item"} to ${recipient.username}`,
    });
  }),
];
