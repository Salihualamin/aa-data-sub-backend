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

/* ---------- AUTO CREATE TEST WALLET ---------- */
(function initWallet() {
  const wallets = readJSON(WALLETS_FILE, {});
  if (!wallets["testuser1"]) {
    wallets["testuser1"] = { balance: 5000 };
    writeJSON(WALLETS_FILE, wallets);
    console.log("✅ testuser1 wallet created with ₦5000");
  }
})();

/* ---------- HOME ---------- */
app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

/* ---------- ADMIN LOGIN ---------- */
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@aadatasub.com" && password === "Admin1234") {
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
    network: String(network),   // 1,2,3,4
    planName,
    price: Number(price),
    apiCode: String(apiCode)    // SMEPlug plan_id
  });

  writeJSON(PLANS_FILE, plans);
  res.json({ success: true });
});

/* ---------- USER WALLET ---------- */
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
    if (!plan) return res.status(400).json({ error: "Invalid plan" });

    if (!wallets[userId] || wallets[userId].balance < plan.price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    console.log("🚀 Sending to SMEPlug (LIVE)", {
      network_id: plan.network,
      plan_id: plan.apiCode,
      phone
    });

    const smeplugRes = await axios.post(
      "https://smeplug.ng/api/v1/data/purchase",
      {
        network_id: String(plan.network),
        plan_id: String(plan.apiCode),
        phone: phone,
        customer_reference: "AADATASUB-" + Date.now()
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SMEPLUG_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ SMEPlug response:", smeplugRes.data);

    if (!smeplugRes.data.status) {
      return res.status(400).json({
        error: "SMEPlug failed",
        details: smeplugRes.data
      });
    }

    // 💰 Deduct wallet AFTER success
    wallets[userId].balance -= plan.price;

    const receipt = {
      id: Date.now().toString(),
      userId,
      phone,
      network: plan.network,
      plan: plan.planName,
      amount: plan.price,
      reference:
        smeplugRes.data.data?.reference ||
        "AADATASUB-" + Date.now(),
      date: new Date().toISOString()
    };

    txs.push(receipt);
    writeJSON(WALLETS_FILE, wallets);
    writeJSON(TX_FILE, txs);

    res.json({
      success: true,
      message: "Data purchase successful",
      balance: wallets[userId].balance,
      receipt
    });

  } catch (error) {
    console.error(
      "❌ Buy data error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Server error",
      details: error.response?.data || error.message
    });
  }
});

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log("🚀 A’A DATA SUB backend running on port", PORT);
});
