const WEBHOOK_ENV_KEYS = {
  coinflip: "DISCORD_WEBHOOK_COINFLIP_LOGS",
  jackpot: "DISCORD_WEBHOOK_JACKPOT_LOGS",
  tipping: "DISCORD_WEBHOOK_TIPPING_LOGS",
  tax: "DISCORD_WEBHOOK_TAX_LOGS",
  giveaway: "DISCORD_WEBHOOK_GIVEAWAY_LOGS",
  items: "DISCORD_WEBHOOK_ITEM_GIVE_REMOVE_LOGS",
};

function safeText(value, fallback = "—") {
  const text = String(value ?? fallback);
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}

/**
 * Webhook delivery is intentionally best-effort: a Discord outage must never
 * make a game, inventory transfer, or admin mutation fail after its database
 * transaction has completed.
 */
async function sendDiscordLog(channel, title, fields = []) {
  const envKey = WEBHOOK_ENV_KEYS[channel];
  const url = envKey ? process.env[envKey] : "";
  if (!url) return false;

  const payload = {
    username: "BloxSurge Logs",
    embeds: [{
      title: safeText(title),
      color: 0xd33148,
      fields: fields
        .filter((field) => field && field.name)
        .slice(0, 25)
        .map((field) => ({
          name: safeText(field.name, "Detail"),
          value: safeText(field.value),
          inline: Boolean(field.inline),
        })),
      timestamp: new Date().toISOString(),
      footer: { text: "BloxSurge audit log" },
    }],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Discord ${channel} webhook returned HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Discord ${channel} webhook failed:`, error.message);
    return false;
  }
}

module.exports = { sendDiscordLog, WEBHOOK_ENV_KEYS };