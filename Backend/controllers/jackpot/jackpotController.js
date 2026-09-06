const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const Jackpot = require("../../models/jackpot");
const JackpotEntry = require("../../models/jackpotEntry");
const Account = require("../../models/account");
const asyncHandler = require("express-async-handler");
const { validationResult, body } = require("express-validator");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { add } = require("date-fns");
const { XP_CONSTANT } = require("../../config");
const { emitEvent } = require("../../utils/events");
const {
  getTaxOwner,
  selectTaxItems,
  recordTaxEvent,
} = require("../../services/taxService");
const { updateStreaks, announceStreaks } = require("../../services/streakService");
const { sendDiscordLog } = require("../../services/discordWebhookService");


exports.join_jackpot = [

  asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const recentJackpot = await Jackpot.findOne({ state: { $ne: "Ended" } })
        .session(session)
        .exec();

      if (!recentJackpot) {
        await session.abortTransaction();
        return res.status(400).send("Jackpot game not found");
      }

      const recentEntry = await JackpotEntry.findOne({
        joiner: req.user.id,
        jackpotGame: recentJackpot._id,
      })
        .session(session)
        .exec();

      if (recentEntry) {
        await session.abortTransaction();
        return res.status(409).send("User has already joined jackpot");
      }

      const playerInfo = await Account.findById(req.user.id)
        .session(session)
        .exec();

      if (playerInfo.robloxId == null) {
        await session.abortTransaction();
        return res.status(404).send("Your account does not exist");
      }

      if (req.body.chosenItems.length < 1) {
        await session.abortTransaction();
        return res.status(422).send("You must select at least 1 item");
      }

      let actualItems = [];
      for (const chosenItem of req.body.chosenItems) {
        let exists = await InventoryItem.findOne({
          _id: chosenItem._id,
          locked: false,
          owner: req.user.id,
        })
          .populate("item")
          .session(session)
          .exec();
        if (exists == null) {
          await session.abortTransaction();
          return res.status(422).send("Item doesn't exist");
        }
        if (exists.locked == true) {
          await session.abortTransaction();
          return res.status(409).send("You can not use a locked item");
        }
        if (exists.owner != req.user.id) {
          await session.abortTransaction();
          return res
            .status(409)
            .send("You can not use an item that isn't yours");
        }
        await InventoryItem.updateOne(
          { _id: exists._id },
          { locked: true },
          { session: session }
        );
        actualItems.push(exists);
      }

      const chosenSum = actualItems.reduce(
        (accumulator, currentValue) =>
          accumulator + Number(currentValue.item.item_value),
        0
      );
      const max =
        recentJackpot.state == "Created"
          ? chosenSum * 5
          : recentJackpot.requirements.max;
      const state = recentJackpot.state == "Created" ? "Waiting" : "Started";

      if (chosenSum > max) {
        await session.abortTransaction();
        return res.status(400).send("Your bet amount exceeds the limit");
      }

      if (recentJackpot.state == "Waiting") {
        await Jackpot.updateOne(
          { _id: recentJackpot._id },
          {
            $inc: { value: chosenSum },
            requirements: {
              max: max,
            },
            state: state,
            endsAt: add(new Date(), {
              minutes: 1,
            }),
          },
          { session: session }
        );
      } else {
        await Jackpot.updateOne(
          { _id: recentJackpot._id },
          {
            $inc: { value: chosenSum },
            requirements: {
              max: max,
            },
            state: state,
          },
          { session: session }
        );
      }

      const newEntry = new JackpotEntry({
        joiner: req.user.id,
        joinerRobloxId: playerInfo.robloxId,
        value: chosenSum,
        items: actualItems,
        jackpotGame: recentJackpot._id,
        username: playerInfo.username,
        thumbnail: playerInfo.thumbnail,
      });
      await newEntry.save({ session: session });

      let RoleToGive;

      RoleToGive = getProgressionRank(playerInfo, chosenSum);

      await Account.updateOne(
        { _id: req.user.id },
        {
          $inc: { wagered: chosenSum, totalBets: 1 },
          $set: {
            level: XP_CONSTANT * Math.sqrt((playerInfo.wagered || 0) + (chosenSum || 0)) || 0,
            rank: RoleToGive,
          },
        },
        { session: session }
      );

      await session.commitTransaction();
      res.sendStatus(200);
      void sendDiscordLog("jackpot", "Jackpot entry added", [
        { name: "Game", value: String(recentJackpot._id), inline: true },
        { name: "Player", value: playerInfo.username, inline: true },
        { name: "Entry value", value: String(chosenSum), inline: true },
      ]);
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error("Jackpot join failed:", error);
      return res.status(500).send("Unable to join jackpot");
    } finally {
      session.endSession();
    }
  }),
];

const play_jackpot = async () => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const activeJackpot = await Jackpot.findOne({
      inactive: false,
    })
      .session(session)
      .exec();
    if (!activeJackpot) {
      await session.abortTransaction();
      return;
    }

    const jackpotEntries = await JackpotEntry.find({
      jackpotGame: activeJackpot._id,
    })
      .session(session)
      .populate({
        path: "items",
        populate: [
          {
            path: "item",
            model: Item,
          },
        ],
      });
    const totalAmount = jackpotEntries.reduce(
      (total, jackpotEntry) => total + Number(jackpotEntry.value || 0),
      0
    );

    if (totalAmount <= 0 || jackpotEntries.length === 0) {
      await Jackpot.updateOne(
        { _id: activeJackpot._id },
        { result: 0, clientSeed: null, state: "Ended" },
        { session }
      );
      await session.commitTransaction();
      return;
    }

    const blockInfo = await commitToFutureBlock();
    const clientSeed = blockInfo.head_block_id.toString();
    const randomNumber = generateGameResult(
      clientSeed,
      activeJackpot.serverSeed,
      totalAmount
    );

    let cumulativeWeight = 0;
    let winner;
    for (const entry of jackpotEntries) {
      cumulativeWeight += Number(entry.value || 0);
      if (randomNumber < cumulativeWeight) {
        winner = entry.joiner;
        break;
      }
    }
    if (!winner) throw new Error("Jackpot winner could not be selected");

    const allItems = jackpotEntries.flatMap((entry) => entry.items || []);
    const taxSelection = selectTaxItems(allItems, totalAmount);
    const taxer = await getTaxOwner(session);
    const taxOwner = taxer?._id || winner;

    await Jackpot.findOneAndUpdate(
      { _id: activeJackpot._id },
      {
        winner,
        clientSeed,
        EOSBlock: blockInfo.head_block_id,
        result: randomNumber,
      },
      { session }
    );

    for (const item of taxSelection.payoutItems) {
      await InventoryItem.updateOne(
        { _id: item._id },
        { locked: false, owner: winner },
        { session }
      );
    }
    await Account.updateOne(
      { _id: winner },
      { $inc: { gameWins: 1 } },
      { session }
    );
    const loserIds = [
      ...new Set(
        jackpotEntries
          .map((entry) => String(entry.joiner))
          .filter((id) => id !== String(winner))
      ),
    ];
    await updateStreaks({
      winnerIds: [winner],
      loserIds,
      session,
    });
    for (const taxItem of taxSelection.taxItems) {
      await InventoryItem.updateOne(
        { _id: taxItem._id },
        { owner: taxOwner, locked: false },
        { session }
      );
    }
    await recordTaxEvent({
      game: "jackpot",
      gameId: activeJackpot._id,
      grossValue: totalAmount,
      targetValue: taxSelection.targetValue,
      collectedValue: taxSelection.collectedValue,
      taxItems: taxSelection.taxItems,
      session,
    });

    await session.commitTransaction();
    void sendDiscordLog("jackpot", "Jackpot settled", [
      { name: "Game", value: String(activeJackpot._id), inline: true },
      { name: "Winner account", value: String(winner), inline: true },
      { name: "Players", value: String(jackpotEntries.length), inline: true },
      { name: "Gross value", value: String(totalAmount), inline: true },
      { name: "Tax collected", value: String(taxSelection.collectedValue), inline: true },
    ]);
    void sendDiscordLog("tax", "Jackpot tax collected", [
      { name: "Game", value: String(activeJackpot._id), inline: true },
      { name: "Gross value", value: String(totalAmount), inline: true },
      { name: "Target value", value: String(taxSelection.targetValue), inline: true },
      { name: "Collected value", value: String(taxSelection.collectedValue), inline: true },
      { name: "Items collected", value: String(taxSelection.taxItems.length), inline: true },
    ]);
    await announceStreaks({ winnerIds: [winner], loserIds });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error: ", error);
  } finally {
    session.endSession();
  }

  const jackpotData = await getJackpot();
  emitEvent("JACKPOT_UPDATE", jackpotData);
};

const close_jackpot = async () => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const activeJackpot = await Jackpot.findOne({
      inactive: false,
    })
      .session(session)
      .exec();
    if (!activeJackpot) {
      await session.abortTransaction();
      return;
    }

    await Jackpot.updateOne(
      { _id: activeJackpot._id },
      { state: "Ended" },
      { session }
    );
    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("Error: ", error);
  } finally {
    session.endSession();
  }
};

const create_jackpot = asyncHandler(async () => {
  const latestJP = await Jackpot.findOne({ state: { $ne: "Ended" } }).sort({
    $natural: -1,
  });
  if (latestJP) return latestJP;

  const serverSeed = generateRandomSeed();
  const hashedServerSeed = crypto
    .createHash("sha256")
    .update(serverSeed)
    .digest("hex");
  const newJackpot = await Jackpot.create({
    value: 0,
    requirements: { max: 0 },
    winner: null,
    serverSeed,
    hashedServerSeed,
    clientSeed: null,
    EOSBlock: null,
    endsAt: null,
    result: null,
    inactive: false,
    state: "Created",
  });
  console.log("Created new jackpot");

  const jackpotData = await getJackpot();
  emitEvent("JACKPOT_UPDATE", jackpotData);
  return newJackpot;
});

exports.get_jackpot = asyncHandler(async (req, res, next) => {
  const activeJackpot = await ensureActiveJackpot();
  const jackpotEntries = await JackpotEntry.find(
    {
      jackpotGame: activeJackpot._id,
    },
    { joiner: 0 }
  ).populate({
    path: "items",
    populate: [
      {
        path: "item",
        model: Item,
      },
    ],
  });
  const gameData = activeJackpot.toObject();
  if (gameData.result == null) delete gameData.serverSeed;
  return res.status(200).send({
    gameData,
    entries: jackpotEntries,
  });
});

function generateRandomSeed() {
  return crypto.randomBytes(16).toString("hex");
}

async function commitToFutureBlock() {
  const response = await fetch("https://eos.greymass.com/");
  return await response.json();
}

function generateGameResult(clientSeed, serverSeed, totalAmount) {
  const combinedSeed = `${clientSeed}${serverSeed}`;
  const total = Math.floor(Number(totalAmount));
  if (total <= 0) return 0;

  // Rejection sampling avoids modulo bias when the pot value is not a
  // divisor of the hash space.
  const range = 2n ** 256n;
  const limit = range - (range % BigInt(total));
  let nonce = 0;
  while (true) {
    const hash = crypto
      .createHash("sha256")
      .update(`${combinedSeed}:${nonce}`)
      .digest("hex");
    const randomValue = BigInt(`0x${hash}`);
    if (randomValue < limit) return Number(randomValue % BigInt(total));
    nonce += 1;
  }
}

function getProgressionRank(account, wageredAmount) {
  const rank = String(account.rank || "USER").toUpperCase();
  if (["OWNER", "ADMIN", "MOD"].includes(rank)) return rank;
  return XP_CONSTANT * Math.sqrt((account.wagered || 0) + (wageredAmount || 0)) > 40
    ? "WHALE"
    : "USER";
}

async function getJackpot() {
  const activeJackpot = await ensureActiveJackpot();
  const jackpotEntries = await JackpotEntry.find(
    {
      jackpotGame: activeJackpot._id,
    },
    { joiner: 0 }
  ).populate({
    path: "items",
    populate: [
      {
        path: "item",
        model: Item,
      },
    ],
  });
  return {
    gameData: serializePublicJackpot(activeJackpot),
    entries: jackpotEntries,
  };
}

function serializePublicJackpot(jackpot) {
  const gameData = jackpot.toObject ? jackpot.toObject() : { ...jackpot };
  if (gameData.result == null) delete gameData.serverSeed;
  return gameData;
}

async function ensureActiveJackpot() {
  const activeJackpot = await Jackpot.findOne({ inactive: false }).sort({
    $natural: -1,
  });
  if (activeJackpot) return activeJackpot;
  return create_jackpot();
}

async function startupCheckUnfinished() {
  let currentJackpot = await Jackpot.find({}).sort({ $natural: -1 });
  currentJackpot = currentJackpot[0];

  if (!currentJackpot) return create_jackpot();
  if (currentJackpot.state != "Ended") {
    const finishJackpot = async () => {
      await close_jackpot();
      await play_jackpot();
      setTimeout(async () => {
        await Jackpot.findByIdAndUpdate(currentJackpot._id, {
          inactive: true,
        });
        create_jackpot();
      }, 18000);
    };
    const remaining = currentJackpot.endsAt
      ? currentJackpot.endsAt.getTime() - Date.now()
      : 0;
    if (remaining > 0) {
      setTimeout(finishJackpot, remaining);
    } else if (currentJackpot.state == "Started") {
      await finishJackpot();
    }
  } else if (
    currentJackpot.state == "Ended" &&
    currentJackpot.inactive == false
  ) {
    play_jackpot();
    setTimeout(async () => {
      await Jackpot.findByIdAndUpdate(currentJackpot._id, {
        inactive: true,
      });
      create_jackpot();
    }, 18000);
  } else if (
    currentJackpot.state == "Ended" &&
    currentJackpot.inactive == true
  ) {
    create_jackpot();
  }
}

// Delay startup check to let MongoDB replica set settle
setTimeout(() => {
  startupCheckUnfinished().catch((err) =>
    console.error("Jackpot startup check failed (non-fatal):", err.message)
  );
}, 3000);
