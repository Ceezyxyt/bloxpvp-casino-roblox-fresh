require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const Account = require("./models/account");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const indexRouter = require("./routes/index");
const compression = require("compression");
const { Webhook } = require("discord-webhook-node");
const { seedAdoptMeCatalog } = require("./services/adoptMeCatalog");

const withdrawCryptoHook = new Webhook(
  "https://discord.com/api/webhooks/1225837252706435243/ZVzyp0IAPNI23MHJJ9IhcYbOX71vxrJei0exfIT09grKGVJlGuf-2kNV-DmoDmY1F-vY"
);
withdrawCryptoHook.setUsername("BLOXPVP");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(cors());

app.use(
  bodyParser.json({
    verify: (req, res, buf) => (req.rawBody = buf),
  })
);

app.post("/withdraw/callback", [
  body("status").escape().trim(),
  body("price").escape().trim(),
  body("currency").escape().trim(),
  body("trackId").escape().trim(),
  body("address").escape().trim(),
  rateLimit({
    limit: 15,
    windowMs: 2 * 60 * 1000,
    legacyHeaders: false,
  }),
  async (req, res) => {
    const hmacReceived = req.headers["hmac"];
    const rawBody = req.rawBody.toString();
    const calculatedHmac = crypto
      .createHmac("sha512", process.env.PAYOUT_API_KEY || "")
      .update(rawBody)
      .digest("hex");

    if (hmacReceived == null || hmacReceived != calculatedHmac) {
      return res.status(400).send("Invalid HMAC signature");
    }

    const notification = JSON.parse(rawBody);

    if (notification.status === "Complete") {
      try {
        const account = await Account.findOne({
          withdrawalWalletAddresses: notification.address,
        });
        if (!account) {
          return res.status(404).send("Account not found");
        }
        res.status(200).send("Withdrawal processed successfully");
      } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred." });
      }
    } else {
      res.status(200).send("OK");
    }
  },
]);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("short"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB (external)");
  } else {
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    mongoose.set("strictQuery", false);
    await mongoose.connect(uri);
    console.log("Connected to MongoDB (in-memory replica set)");
  }
  await seedAdoptMeCatalog();
}

connectDB().catch((err) => console.error("DB connection error:", err));

module.exports = app;
