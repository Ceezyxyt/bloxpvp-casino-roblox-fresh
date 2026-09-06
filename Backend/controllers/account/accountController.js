const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");
const Account = require("../../models/account");
const noblox = require("noblox.js");
const InventoryItem = require("../../models/inventoryItem");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const randomWords = require("random-words");
const { JWT_SECRET } = require("../../config");
let userStore = []
dotenv.config();

exports.authenticateToken = asyncHandler(async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Error verifying token:", err);
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = user;
    next();
  });
});

exports.auto_login = asyncHandler(async (req, res) => {
  try {
    const userData = await Account.findOne(
      { _id: req.user.id },
      { ips: 0, _id: 0, __v: 0, password: 0, withdrawalWalletAddresses: 0 }
    );
    if (!userData) {
      return res.status(401).json({ success: false, message: "Account not found" });
    }
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error retrieving user data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

exports.load_inventory = asyncHandler(async (req, res) => {
  try {
    const userItems = await InventoryItem.find({
      owner: req.user.id,
      locked: false,
    })
      .populate("item")
      .sort({ "item.item_value": -1 })
      .exec();

    const totalValue = userItems.reduce(
      (acc, userItem) => acc + Number(userItem.item.item_value),
      0
    );

    const inventoryInfo = {
      totalValue,
      userItems,
    };

    res.send(inventoryInfo);
  } catch (error) {
    console.error("Error loading inventory items:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.connect_roblox = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Your username must be between 3 and 20 characters")
    .escape(),
  body("referrer").trim().escape(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Resolve username → Roblox ID
    let userId;
    try {
      userId = await noblox.getIdFromUsername(req.body.username);
    } catch (e) {
      return res.status(404).send("Invalid Username");
    }
    if (!userId) return res.status(404).send("Invalid Username");

    const pending = userStore[userId];

    // ── STEP 2: user already received a phrase, now verify their bio ──
    if (pending?.descriptionSet === true) {
      // NOTE: do NOT delete userStore[userId] yet — keep it so a 500 error lets the user retry

      let blurb;
      try {
        const axios = require("axios");
        const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
        blurb = profileRes.data.description || "";
      } catch (e) {
        // Keep userStore intact so the user can try again without restarting
        return res.status(500).send("Failed to fetch Roblox profile, please try again");
      }

      if (blurb !== pending.description) {
        delete userStore[userId];
        return res.status(400).send("Description does not match");
      }

      // Bio matched — now safe to clear the pending entry
      delete userStore[userId];

      // Bio matched — refresh thumbnail
      let thumbnail = "";
      try {
        const thumbResult = await noblox.getPlayerThumbnail(userId, 420, "png", false, "Headshot");
        thumbnail = thumbResult[0]?.imageUrl || "";
      } catch (e) {}

      const isOwner = req.body.username.toLowerCase() === "ceezyxyt";
      // Reset description so the phrase can't be reused
      const nextDescription = generateRandomDescription();

      let account = await Account.findOne({ robloxId: userId });
      if (account) {
        await Account.updateOne(
          { robloxId: userId },
          {
            description: nextDescription,
            thumbnail,
            ...(isOwner ? { rank: "OWNER", displayName: "Zeec" } : {}),
            $push: { ips: { ip: req.ip } },
          }
        );
        account = await Account.findOne({ robloxId: userId });
      } else {
        // Edge case: account disappeared between step 1 and step 2
        account = new Account({
          robloxId: userId,
          username: userData.username,
           displayName: isOwner ? "Zeec" : userData.displayName,
          description: nextDescription,
          thumbnail,
           rank: isOwner ? "OWNER" : "USER",
          balance: 0,
          joinDate: new Date(),
          lastMessage: new Date(),
          diceClientSeed: generateClientSeed(),
          limboClientSeed: generateClientSeed(),
          minesClientSeed: generateClientSeed(),
          blackjackClientSeed: generateClientSeed(),
          diceServerSeed: generateServerSeed(),
          limboServerSeed: generateServerSeed(),
          minesServerSeed: generateServerSeed(),
          blackjackServerSeed: generateServerSeed(),
          diceHistory: [],
          limboHistory: [],
          minesHistory: [],
          blackjackHistory: [],
          withdrawalWalletAddresses: [],
          ips: [{ ip: req.ip }],
          affiliate: { wagered: 0, totalEarnings: 0, balance: 0, referrals: [] },
        });
        await account.save();
      }

      const token = jwt.sign({ id: account._id }, JWT_SECRET);
      console.log(`Login successful for ${req.body.username}`);
      return res.send(token);
    }

    // ── STEP 1: generate a fresh verification phrase ──
    // Always generate a new phrase (resets every time, including retry attempts)
    const randomDescription = generateRandomDescription();

    let account = await Account.findOne({ robloxId: userId });
    if (account) {
      // Existing user — just update their phrase
      await Account.updateOne({ robloxId: userId }, { description: randomDescription });
    } else {
      // New user — create their account now
      let userData;
      try {
        userData = await noblox.getPlayerInfo(userId);
      } catch (e) {
        return res.status(500).send("Failed to fetch Roblox profile");
      }
      let thumbnail = "";
      try {
        const thumbResult = await noblox.getPlayerThumbnail(userId, 420, "png", false, "Headshot");
        thumbnail = thumbResult[0]?.imageUrl || "";
      } catch (e) {}

      const checkReferrer = await Account.findOne({ robloxId: req.body.referrer });
      const validReferrer = checkReferrer?.username || null;

      account = new Account({
        robloxId: userId,
        username: userData.username,
        displayName: userData.displayName,
        description: randomDescription,
        thumbnail,
        rank: "USER",
        level: 0,
        deposited: 0,
        withdrawn: 0,
        wagered: 0,
        balance: 0,
        joinDate: new Date(),
        lastMessage: new Date(),
        referrer: validReferrer,
        totalBets: 0,
        gamesWon: 0,
        diceClientSeed: generateClientSeed(),
        limboClientSeed: generateClientSeed(),
        minesClientSeed: generateClientSeed(),
        blackjackClientSeed: generateClientSeed(),
        diceServerSeed: generateServerSeed(),
        limboServerSeed: generateServerSeed(),
        minesServerSeed: generateServerSeed(),
        blackjackServerSeed: generateServerSeed(),
        diceHistory: [],
        limboHistory: [],
        minesHistory: [],
        blackjackHistory: [],
        withdrawalWalletAddresses: [],
        ips: [],
        affiliate: { wagered: 0, totalEarnings: 0, balance: 0, referrals: [] },
      });
      await account.save();
    }

    // Store the phrase so step 2 can verify it
    userStore[userId] = { descriptionSet: true, description: randomDescription };
    return res.status(200).send(randomDescription);
  }),
];

exports.roblox_auth_check = asyncHandler(async (req, res, next) => {
  const account = await Account.findOne({ _id: req.user.id });
  if (!account || !account.robloxId) {
    return res.status(401).send("You have not connected your Roblox account");
  }
  next();
});

exports.get_profile = [
  body("userId").trim().escape(),
  asyncHandler(async (req, res) => {
    const userData = await Account.findOne({ robloxId: req.body.userId });

    if (!userData) {
      return res.status(404).send("User was not found");
    }

    const nextLevel = Math.ceil(userData.level);
    const nextLevelXP = Math.pow(nextLevel / 0.04, 2);

    const toReturn = {
      totalBets: userData.totalBets,
      gamesWon: userData.gameWins,
      wagered: userData.wagered,
      profit: userData.withdrawn - userData.deposited,
      username: userData.username,
      xp: userData.wagered,
      xpMax: nextLevelXP,
      level: userData.level,
      thumbnail: userData.thumbnail,
      joinDate: userData.joinDate,
    };

    res.status(200).send(toReturn);
  }),
];

function generateServerSeed() {
  return crypto.randomBytes(20).toString("hex");
}

function generateClientSeed() {
  return crypto.randomBytes(20).toString("hex");
}

function generateRandomDescription() {
  const numWords = Math.floor(Math.random() * 4) + 10;
  const words = randomWords({ exactly: numWords });
  return Array.isArray(words) ? words.join(" ") : String(words);
}
