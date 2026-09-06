const express = require("express");
const router = express.Router();
const accountController = require("../controllers/account/accountController");
const adminController = require("../controllers/account/adminController");
const chatController = require("../controllers/chat/chatController");
const coinflipController = require("../controllers/coinflip/coinflipController");
const jackpotController = require("../controllers/jackpot/jackpotController");
const giveawayController = require("../controllers/giveaways/giveawayController");
const marketplaceController = require("../controllers/marketplace/marketplaceController");
const cashierController = require("../controllers/cashier/cashierController");
const botController = require("../controllers/bot/botController");
const oxaPayDepositController = require("../controllers/payments/oxaPayDepositController");
const { createStaticAddress } = require("../controllers/payments/oxaPayDepositController");
const { sendPayout, getBalance } = require("../controllers/payments/oxaPayWithdrawController");
const expressQueue = require("express-queue");
const queueMw = expressQueue({ activeLimit: 1, queuedLimit: -1 });
const roblox_auth_check = accountController.roblox_auth_check;
const minesController = require("../controllers/games/minesController");
const valuesController = require("../controllers/valuesController");

// ACCOUNT ROUTES
router.post("/connect-roblox", accountController.connect_roblox);
router.get("/login-auto", accountController.authenticateToken, accountController.auto_login);
router.get("/user/inventory", accountController.authenticateToken, roblox_auth_check, accountController.load_inventory);
router.post("/profile", accountController.get_profile);

// ADMIN ROUTES
router.get("/admin/stats", accountController.authenticateToken, adminController.requireAdmin, adminController.get_stats);
router.get("/admin/users", accountController.authenticateToken, adminController.requireAdmin, adminController.get_all_users);
router.post("/admin/set-balance", accountController.authenticateToken, adminController.requireAdmin, adminController.set_balance);
router.post("/admin/set-rank", accountController.authenticateToken, adminController.requireAdmin, adminController.set_rank);
// ADMIN ITEM ROUTES
router.get("/admin/items", accountController.authenticateToken, adminController.requireAdmin, adminController.get_items);
router.post("/admin/items/create", accountController.authenticateToken, adminController.requireAdmin, adminController.create_item);
router.post("/admin/items/update", accountController.authenticateToken, adminController.requireAdmin, adminController.update_item);
router.post("/admin/items/delete", accountController.authenticateToken, adminController.requireAdmin, adminController.delete_item);
router.post("/admin/items/give", accountController.authenticateToken, adminController.requireAdmin, adminController.give_item);
router.get("/admin/user-inventory", accountController.authenticateToken, adminController.requireAdmin, adminController.get_user_inventory);
router.get("/admin/tax", accountController.authenticateToken, adminController.requireAdmin, adminController.get_tax);
router.post("/admin/tax/add", accountController.authenticateToken, adminController.requireAdmin, adminController.add_tax_item);
router.post("/admin/tax/release", accountController.authenticateToken, adminController.requireAdmin, adminController.release_tax_item);

// MINES
router.post("/mines/create-game", accountController.authenticateToken, minesController.handleMinesCreateGame);

// CHAT ROUTES
router.post("/message", accountController.authenticateToken, roblox_auth_check, chatController.send_message);
router.get("/chat", chatController.get_chat_info);

// COINFLIP ROUTES
router.post("/coinflip/create", accountController.authenticateToken, roblox_auth_check, coinflipController.create_coinflip);
router.post("/coinflip/join", accountController.authenticateToken, roblox_auth_check, coinflipController.join_coinflip);
router.get("/coinflips", coinflipController.get_coinflips);

// JACKPOT ROUTES
router.post("/jackpot/join", accountController.authenticateToken, roblox_auth_check, jackpotController.join_jackpot);
router.get("/jackpot", jackpotController.get_jackpot);
router.get("/values/adopt-me", valuesController.get_adopt_me_values);

// GIVEAWAY ROUTES
router.post("/giveaway/create", accountController.authenticateToken, roblox_auth_check, giveawayController.create_giveaway);
router.post("/giveaway/join", accountController.authenticateToken, roblox_auth_check, giveawayController.join_giveaway);
router.get("/giveaways", giveawayController.get_giveaways);

// MM2 ROUTES
router.get("/cashier/bots/mm2", botController.get_bots_mm2);
router.post("/deposit/mm2", cashierController.deposit_mm2);
router.post("/withdrawals/mm2", cashierController.get_withdraw_mm2);
router.post("/withdraw/mm2/clear", cashierController.clear_withdraw_mm2);

// PS99 ROUTES
router.post("/deposit/ps99", cashierController.deposit_ps99);
router.post("/withdrawals/ps99", cashierController.get_withdraw_ps99);
router.post("/cashier/bots/mm2", botController.get_bots_ps99);

// CASHIER ROUTES
router.post("/withdraw", accountController.authenticateToken, roblox_auth_check, cashierController.create_withdraw);
router.post("/create-static-address", accountController.authenticateToken, roblox_auth_check, createStaticAddress);
router.post("/send-payout", queueMw, accountController.authenticateToken, roblox_auth_check, sendPayout);
router.post("/get-balance", accountController.authenticateToken, roblox_auth_check, getBalance);
router.post("/get-address", accountController.authenticateToken, roblox_auth_check, cashierController.get_address);
router.post("/callback", oxaPayDepositController.callback);

// MARKETPLACE ROUTES
router.post("/marketplace/listing/create", accountController.authenticateToken, roblox_auth_check, marketplaceController.create_listing);
router.get("/marketplace/listings", marketplaceController.get_all_listings);
router.post("/marketplace/listing/purchase", accountController.authenticateToken, roblox_auth_check, marketplaceController.purchase_listings);
router.post("/marketplace/listing/delete", accountController.authenticateToken, roblox_auth_check, marketplaceController.delete_listing);
router.post("/marketplace/listing/update", accountController.authenticateToken, roblox_auth_check, marketplaceController.update_listing);

// MISC ROUTES
router.use("*", function (req, res) {
  return res.json({
    success: true,
    message: `Non-Existent Route: [${req.method}] ${req.baseUrl}`,
  });
});

module.exports = router;
