require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

/* ================= FILE PATHS ================= */
const PLANS_FILE = path.join(__dirname, "plans.json");
const WALLETS_FILE = path.join(__dirname, "wallets.json");
const TX_FILE = path.join(__dirname, "transactions.json");

/* ================= HELPERS ================= */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ================= INIT WALLET ================= */
/* 👉 OPEN THIS IN BROWSER TO CREDIT USER */
app.get("/user/init-wallet/:userId", (req, res) => {
  const { userId } = req.params;
  const wallets = readJSON(WALLETS_FILE, {});

  if (!wallets[userId]) {
    wallets[userId] = {
      balance: 2000, // ✅ TEST CREDIT
      createdAt: new Date().toISOString()
    };
  }

  writeJSON(WALLETS_FILE, wallets);
  res.json({
    message: "Wallet initialized",
    wallet: wallets[userId]
  });
});

/* ================= GET WALLET ================= */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json(wallets[req.params.userId] || { balance: 0 });
});

/* ================= GET PLANS ================= */
app.get("/user/plans", (req, res) => {
  res.json(readJSON(PLANS_FILE, []));
});

/* ================= BUY DATA ================= */
app.post("/user/buy-data", async (req, res) => {
  try {
    const { userId, planId, phone } = req.body;
    if (!userId || !planId || !phone) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const wallets = readJSON(WALLETS_FILE, {});
    const plans = readJSON(PLANS_FILE, []);
    const txs = readJSON(TX_FILE, []);

    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    if (!wallets[userId] || wallets[userId].balance < plan.price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    /* ===== LOG BEFORE SMEPLUG ===== */
    console.log("🚀 Sending to SMEPlug (LIVE)", {
      network: plan.network,
      phone,
      apiCode: plan.apiCode
    });

    /* ===== SMEPLUG API CALL ===== */
    const smeplugRes = await axios.post(
      "https://api.smeplug.com/v1/data",
      {
        network: plan.network.toLowerCase(),
        phone: phone,
        plan_code: plan.apiCode
      },
      {
        headers: {
          "X-API-KEY": process.env.SMEPLUG_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ SMEPlug response:", smeplugRes.data);

    if (smeplugRes.data.status !== "success") {
      return res.status(400).json({
        error: "SMEPlug failed",
        details: smeplugRes.data
      });
    }

    /* ===== DEDUCT WALLET ===== */
    wallets[userId].balance -= plan.price;

    const tx = {
      id: Date.now().toString(),
      userId,
      phone,
      network: plan.network,
      plan: plan.planName,
      amount: plan.price,
      reference: smeplugRes.data.reference,
      status: "SUCCESS",
      date: new Date().toISOString()
    };

    txs.push(tx);

    writeJSON(WALLETS_FILE, wallets);
    writeJSON(TX_FILE, txs);

    res.json({
      success: true,
      message: "Data purchase successful",
      receipt: tx,
      balance: wallets[userId].balance
    });

  } catch (error) {
    console.error("❌ Buy data error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Server error",
      details: error.response?.data || error.message
    });
  }
});

/* ================= SERVER ================= */
app.listen(PORT, () => {
  console.log(`A’A DATA SUB backend running on port ${PORT} 🚀`);
});
