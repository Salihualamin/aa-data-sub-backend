const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const PLANS_FILE = path.join(__dirname, "plans.json");

/* ---------- HELPERS ---------- */
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------- ADMIN LOGIN (PLAIN) ---------- */
const ADMIN_EMAIL = "admin@aadatasub.com";
const ADMIN_PASSWORD = "Admin1234";

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

/* ---------- ADMIN DATA PLANS ---------- */
app.get("/admin/plans", (req, res) => {
  const plans = readJSON(PLANS_FILE, []);
  res.json(plans);
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

/* ---------- SERVER ---------- */
app.listen(PORT, () => {
  console.log("A’A DATA SUB backend running on port " + PORT);
});
