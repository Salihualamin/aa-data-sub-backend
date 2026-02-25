const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const WALLETS_FILE = path.join(__dirname, "wallets.json");

/* ---------- HELPERS ---------- */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

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

/* ---------- INIT USER WALLET ---------- */
app.post("/user/init-wallet", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const wallets = readJSON(WALLETS_FILE, {});

  if (!wallets[userId]) {
    wallets[userId] = {
      balance: 0,
      account: {
        accountNumber: "31" + Math.floor(100000000 + Math.random() * 900000000),
        bankName: "Wema Bank"
      }
    };
    writeJSON(WALLETS_FILE, wallets);
  }

  res.json(wallets[userId]);
});

/* ---------- GET WALLET ---------- */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  const wallet = wallets[req.params.userId];

  if (!wallet) {
    return res.json({
      balance: 0,
      account: null
    });
  }

  res.json(wallet);
});

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log("A’A DATA SUB backend running 🚀");
});
