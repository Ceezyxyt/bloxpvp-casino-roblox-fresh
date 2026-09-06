const Account = require("../models/account");
const Message = require("../models/message");
const { emitEvent, getOnlineCount } = require("../utils/events");

const BOT_THUMBNAIL =
  "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png";

function shouldAnnounce(streak) {
  return streak === 3 || streak === 5 || streak >= 10;
}

async function updateStreaks({ winnerIds = [], loserIds = [], session }) {
  const winners = [...new Set(winnerIds.map(String))];
  const losers = [...new Set(loserIds.map(String))].filter(
    (id) => !winners.includes(id)
  );

  for (const id of winners) {
    await Account.updateOne(
      { _id: id },
      { $inc: { winStreak: 1 }, $set: { lossStreak: 0 } },
      { session }
    );
  }
  for (const id of losers) {
    await Account.updateOne(
      { _id: id },
      { $inc: { lossStreak: 1 }, $set: { winStreak: 0 } },
      { session }
    );
  }
  return { winners, losers };
}

async function announceStreaks({ winnerIds = [], loserIds = [] }) {
  const accounts = await Account.find({
    _id: { $in: [...winnerIds, ...loserIds] },
  }).lean();

  for (const account of accounts) {
    const streak = account.winStreak > 0 ? account.winStreak : account.lossStreak;
    if (!shouldAnnounce(streak)) continue;

    const isWin = account.winStreak > 0;
    const username = account.displayName || account.username || "Player";
    const message = isWin
      ? `W ${username}, you're on a crazy ${streak} winstreak!`
      : `Imagine being on a ${streak} losing streak, ${username}.`;

    await Message.create({
      thumbnail: BOT_THUMBNAIL,
      username: "BloxSurge Bot",
      robloxId: "BLOXSURGE_BOT",
      timestamp: new Date(),
      message,
      rank: "BOT",
    });
  }

  if (accounts.some((account) => shouldAnnounce(account.winStreak) || shouldAnnounce(account.lossStreak))) {
    const messages = await Message.find().sort({ $natural: -1 }).limit(40);
    emitEvent("CHAT_UPDATE", {
      messages,
      onlineCount: await getOnlineCount(),
    });
  }
}

module.exports = { updateStreaks, announceStreaks };