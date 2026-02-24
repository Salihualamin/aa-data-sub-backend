const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =======================
   ADMIN CREDENTIALS
   (FROM RENDER ENV VARS)
======================= */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

/* =======================
   FILE PATHS
======================= */
const PLANS_FILE = path.join(__dirname, "plans.json");

/* =======================
   HELPERS
======================= */
function loadPlans() {
  if (!fs.existsSync(PLANS_FILE)) {
    fs.writeFileSync(PLANS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(PLANS_FILE, "utf8"));
}

function savePlans(plans) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
}

/* =======================
   ROUTES
======================= */

/* Home check */
app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

/* Admin login */
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

/* Admin add data plan */
app.post("/admin/add-plan", (req, res) => {
  const { network, planName, apiCode, costPrice, sellPrice } = req.body;

  if (!network || !planName || !apiCode || !costPrice || !sellPrice) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const plans = loadPlans();

  plans.push({
    id: Date.now().toString(),
    network,
    planName,
    apiCode,
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    active: true
  });

  savePlans(plans);
  res.json({ success: true });
});

/* Admin view plans */
app.get("/admin/plans", (req, res) => {
  res.json(loadPlans());
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
