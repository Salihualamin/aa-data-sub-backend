const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== Middleware ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.get("/debug-env", (req, res) => {
  res.json({
    adminEmailExists: !!process.env.ADMIN_EMAIL,
    adminPasswordHashExists: !!process.env.ADMIN_PASSWORD_HASH,
    jwtSecretExists: !!process.env.JWT_SECRET
  });
});
/* ===== ENV ===== */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const SMEPLUG_BASE_URL = process.env.SMEPLUG_BASE_URL;
const SMEPLUG_API_KEY = process.env.SMEPLUG_API_KEY;

/* ===== Files ===== */
const PLANS_FILE = path.join(__dirname, "plans.json");
const WALLETS_FILE = path.join(__dirname, "wallets.json");
const SALES_FILE = path.join(__dirname, "sales.json");

/* ===== Helpers ===== */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ===== Routes ===== */

app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

/* ----- ADMIN ----- */

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== ADMIN_EMAIL) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ success: true });
});

app.get("/admin/plans", (req, res) => {
  res.json(readJSON(PLANS_FILE, []));
});

/* ----- USER ----- */

app.post("/user/init-wallet", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const wallets = readJSON(WALLETS_FILE, {});
  if (!wallets[userId]) wallets[userId] = 0;

  writeJSON(WALLETS_FILE, wallets);
  res.json({ balance: wallets[userId] });
});

app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json({ balance: wallets[req.params.userId] || 0 });
});

app.post("/user/buy-data", async (req, res) => {
  const { userId, planId, phone } = req.body;
  if (!userId || !planId || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const plans = readJSON(PLANS_FILE, []);
  const wallets = readJSON(WALLETS_FILE, {});
  const sales = readJSON(SALES_FILE, []);

  const plan = plans.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  if ((wallets[userId] || 0) < plan.sellPrice) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  try {
    const apiRes = await axios.post(
      `${SMEPLUG_BASE_URL}/data`,
      {
        network: plan.network.toLowerCase(),
        phone: phone,
        plan_code: plan.apiCode
      },
      {
        headers: {
          Authorization: `Bearer ${SMEPLUG_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!apiRes.data || apiRes.data.status !== "success") {
      return res.status(400).json({ error: "Data delivery failed" });
    }

    wallets[userId] -= plan.sellPrice;

    sales.push({
      id: Date.now().toString(),
      userId,
      phone,
      plan: plan.planName,
      amount: plan.sellPrice,
      profit: plan.sellPrice - plan.costPrice,
      provider: "SMEPlug",
      date: new Date().toISOString()
    });

    writeJSON(WALLETS_FILE, wallets);
    writeJSON(SALES_FILE, sales);

    res.json({
      success: true,
      message: "Data sent successfully",
      balance: wallets[userId]
    });

  } catch (error) {
    res.status(500).json({
      error: "SMEPlug error",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
