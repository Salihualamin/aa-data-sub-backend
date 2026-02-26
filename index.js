const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

/* ---------- FILE PATHS ---------- */
const PLANS_FILE = path.join(__dirname, "plans.json");
const WALLETS_FILE = path.join(__dirname, "wallets.json");
const TX_FILE = path.join(__dirname, "transactions.json");

/* ---------- HELPERS ---------- */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

/* ---------- ADMIN LOGIN ---------- */
const ADMIN_EMAIL = "admin@aadatasub.com";
const ADMIN_PASSWORD = "Admin1234";

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

/* ---------- ADMIN PLANS ---------- */
app.get("/admin/plans", (req, res) => {
  res.json(readJSON(PLANS_FILE, []));
});

app.post("/admin/plans", (req, res) => {
  const { network, planName, price, apiCode } = req.body;

  if (!network || !planName || !price || !apiCode) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const plans = readJSON(PLANS_FILE, []);
  plans.push({
    id: Date.now().toString(),
    network,
    planName,
    price: Number(price),
    apiCode
  });

  writeJSON(PLANS_FILE, plans);
  res.json({ success: true });
});

/* ---------- INIT WALLET ---------- */
app.post("/user/init-wallet", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const wallets = readJSON(WALLETS_FILE, {});
  if (!wallets[userId]) {
    wallets[userId] = { balance: 0 };
    writeJSON(WALLETS_FILE, wallets);
  }
  res.json(wallets[userId]);
});

/* ---------- GET WALLET ---------- */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json(wallets[req.params.userId] || { balance: 0 });
});

/* ---------- BUY DATA (REAL SMEPLUG) ---------- */
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
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (!wallets[userId] || wallets[userId].balance < plan.price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 🚀 LOG REQUEST
    console.log("🚀 Sending to SMEPlug (LIVE)", {
      network: plan.network,
      phone,
      apiCode: plan.apiCode
    });

    // ✅ SMEPLUG API CALL
    const smeplugRes = await axios.post(
      `${process.env.SMEPLUG_BASE_URL}/api/data`,
      {
        network: plan.network.toLowerCase(),
        phone: phone,
        plan_code: plan.apiCode
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SMEPLUG_API_KEY}`,
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

    // 💰 DEDUCT WALLET
    wallets[userId].balance -= plan.price;

    // 🧾 SAVE TRANSACTION
    const receipt = {
      id: Date.now().toString(),
      userId,
      phone,
      network: plan.network,
      plan: plan.planName,
      amount: plan.price,
      reference: smeplugRes.data.reference,
      date: new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos"
      })
    };

    txs.push(receipt);

    writeJSON(WALLETS_FILE, wallets);
    writeJSON(TX_FILE, txs);

    res.json({
      success: true,
      message: "Data purchase successful",
      receipt,
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

/* ---------- START SERVER ---------- */
app.listen(PORT, () => {
  console.log("A’A DATA SUB backend running 🚀");
});
