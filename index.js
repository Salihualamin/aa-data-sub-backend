const express = require("express");
const fs = require("fs");
const path = require("path");

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
    wallets["testuser1"] = {
      balance: 2000,
      account: {
        accountNumber: "3199999999",
        bankName: "Wema Bank"
      }
    };
    writeJSON(WALLETS_FILE, wallets);
    console.log("✅ Test wallet created with ₦2000");
  }
})();

/* ---------- HOME ---------- */
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

/* ---------- USER WALLET ---------- */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json(wallets[req.params.userId] || { balance: 0 });
});

/* ---------- BUY DATA (MOCK SUCCESS) ---------- */
app.post("/user/buy-data", (req, res) => {
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

  // 💰 Deduct wallet
  wallets[userId].balance -= plan.price;

  // 🧾 Mock transaction
  const receipt = {
    id: Date.now().toString(),
    userId,
    phone,
    network: plan.network,
    plan: plan.planName,
    amount: plan.price,
    reference: "MOCK-" + Date.now(),
    date: new Date().toISOString()
  };

  txs.push(receipt);

  writeJSON(WALLETS_FILE, wallets);
  writeJSON(TX_FILE, txs);

  console.log("✅ MOCK DATA PURCHASE SUCCESS:", receipt);

  res.json({
    success: true,
    message: "Data purchase successful",
    balance: wallets[userId].balance,
    receipt
  });
});

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log("🚀 A’A DATA SUB backend running on port", PORT);
});
