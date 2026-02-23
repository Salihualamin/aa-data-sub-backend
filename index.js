const express = require("express");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
// Admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Home route
app.get("/", (req, res) => {
  res.send("A’A DATA SUB backend is running 🚀");
});

// Admin login route
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  if (email !== ADMIN_EMAIL) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordMatch = password === ADMIN_PASSWORD;

  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({
    message: "Admin login successful",
    role: "admin"
  });
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
