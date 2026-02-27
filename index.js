const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.static(__dirname));

/* ---------------- FILE PATHS ---------------- */
const PLANS_FILE = path.join(__dirname, "plans.json");
const WALLETS_FILE = path.join(__dirname, "wallets.json");
const TX_FILE = path.join(__dirname, "transactions.json");

/* ---------------- HELPERS ---------------- */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------------- ROOT ---------------- */
app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

/* ================== ADMIN ================== */

const ADMIN_EMAIL = "admin@aadatasub.com";
const ADMIN_PASSWORD = "Admin1234";

/* ADMIN LOGIN */
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

/* GET PLANS */
app.get("/admin/plans", (req, res) => {
  res.json(readJSON(PLANS_FILE, []));
});

/* ADD PLAN */
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

/* ================== USER ================== */

/* INIT WALLET */
app.post("/user/init-wallet", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const wallets = readJSON(WALLETS_FILE, {});

  if (!wallets[userId]) {
    wallets[userId] = {
      balance: 1000, // demo money
      account: {
        accountNumber: "31" + Math.floor(100000000 + Math.random() * 900000000),
        bankName: "Wema Bank"
      }
    };
    writeJSON(WALLETS_FILE, wallets);
  }

  res.json(wallets[userId]);
});

/* GET WALLET */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json(wallets[req.params.userId] || { balance: 0 });
});

/* BUY DATA (MOCK – SAFE) */
app.post("/user/buy-data", (req, res) => {
  const { userId, planId, phone } = req.body;

  if (!userId || !planId || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const plans = readJSON(PLANS_FILE, []);
  const wallets = readJSON(WALLETS_FILE, {});
  const txs = readJSON(TX_FILE, []);

  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  if (!wallets[userId] || wallets[userId].balance < plan.price) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  wallets[userId].balance -= plan.price;

  const tx = {
    id: Date.now().toString(),
    userId,
    phone,
    network: plan.network,
    plan: plan.planName,
    amount: plan.price,
    status: "SUCCESS",
    date: new Date().toISOString(),
    reference: "AA-" + Math.floor(Math.random() * 1000000)
  };

  txs.push(tx);

  writeJSON(WALLETS_FILE, wallets);
  writeJSON(TX_FILE, txs);

  res.json({
    success: true,
    message: "Data purchase successful",
    balance: wallets[userId].balance,
    receipt: tx
  });
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log("A’A DATA SUB backend running 🚀");
});
