const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

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

/* ---------- INIT USER WALLET + ASPIFY ACCOUNT ---------- */
app.post("/user/init-wallet", async (req, res) => {
  const { userId, name, email } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const wallets = readJSON(WALLETS_FILE, {});

  if (!wallets[userId]) {
    try {
      const aspifyRes = await axios.post(
        `${process.env.ASPIFY_BASE_URL}/virtual-account`,
        {
          name,
          email
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ASPIFY_SECRET_KEY}`
          }
        }
      );

      wallets[userId] = {
        balance: 0,
        account: aspifyRes.data
      };

      writeJSON(WALLETS_FILE, wallets);
    } catch (err) {
      return res.status(500).json({ error: "Aspify account error" });
    }
  }

  res.json(wallets[userId]);
});

/* ---------- GET WALLET ---------- */
app.get("/user/wallet/:userId", (req, res) => {
  const wallets = readJSON(WALLETS_FILE, {});
  res.json(wallets[req.params.userId] || { balance: 0 });
});

/* ---------- ASPIFY WEBHOOK ---------- */
app.post("/webhook/aspify", (req, res) => {
  const { userId, amount } = req.body;

  const wallets = readJSON(WALLETS_FILE, {});
  if (!wallets[userId]) return res.sendStatus(404);

  wallets[userId].balance += Number(amount);
  writeJSON(WALLETS_FILE, wallets);

  res.sendStatus(200);
});

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log("A’A DATA SUB backend running 🚀");
});
