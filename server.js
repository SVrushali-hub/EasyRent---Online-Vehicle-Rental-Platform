// server.js
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcryptjs";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch"; 
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 5000;

// ----------------- MIDDLEWARE -----------------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  })
);

// ----------------- MYSQL CONNECTION -----------------
const db = await mysql.createConnection({
  host: "localhost",
  user: "Vrushali",
  password: "Vrushali@1220",
  database: "vehiclerental",
});
console.log("Connected to MySQL!");

// ----------------- MULTER SETUP -----------------
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));

// ----------------- SIGNUP -----------------
app.post("/api/signup", async (req, res) => {
  const { fullName, dob, email, contact, city, state, pincode, username, password } = req.body;
  if (!fullName || !dob || !email || !contact || !city || !state || !pincode || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const [existing] = await db.execute("SELECT * FROM users WHERE email = ? OR username = ?", [email, username]);
    if (existing.length > 0) return res.status(400).json({ message: "Email or username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      `INSERT INTO users
       (full_name, dob, email, contact, city, state, pincode, username, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, dob, email, contact, city, state, pincode, username, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- LOGIN -----------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    req.session.userId = user.id;
    res.status(200).json({ message: "Login successful", user: { id: user.id, username: user.username, fullName: user.full_name } });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- CURRENT USER -----------------
app.get("/api/current-user", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
  try {
    const [rows] = await db.execute("SELECT id, username, full_name FROM users WHERE id = ?", [req.session.userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user: rows[0] });
  } catch (error) {
    console.error("Current User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- BOOKING API -----------------
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      vehicleId,
      pickup,
      drop,
      dateFrom,
      timeFrom,
      dateTo,
      timeTo,
      price,
      driverName,
      driverContact,
      driverAge,
      driverLicense,
      branchName
    } = req.body;

    const transactionId = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

    await db.query(
      `INSERT INTO bookings 
       (user_id, transaction_id, vehicle_id, pickup_location, drop_location, date_from, time_from, date_to, time_to, price, driver_name, driver_contact, driver_age, driver_license, branch_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        transactionId,
        vehicleId,
        pickup,
        drop,
        dateFrom,
        timeFrom,
        dateTo,
        timeTo,
        price,
        driverName,
        driverContact,
        driverAge,
        driverLicense,
        branchName
      ]
    );

    res.status(201).json({ message: "Booking saved successfully", transactionId });
  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

// ----------------- BOOKINGS HISTORY -----------------
app.get("/api/bookings-history", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Please login first" });
  try {
    const [rows] = await db.execute(
      `SELECT 
         b.id AS booking_id,
         b.transaction_id,
         b.vehicle_id,
         COALESCE(v.name, 'Unknown Vehicle') AS vehicle_name,
         b.pickup_location,
         b.drop_location,
         b.date_from,
         b.date_to,
         b.price,
         b.driver_name,
         b.driver_contact,
         b.driver_age,
         b.driver_license,
         b.created_at,
        b.branch_name
         
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.session.userId]
    );
    res.json({ bookings: rows.map(row => ({ id: row.booking_id, ...row })) });
  } catch (err) {
    console.error("Bookings History Error:", err);
    res.status(500).json({ message: "Failed to fetch bookings history" });
  }
});

// ----------------- LOGOUT -----------------
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// ----------------- PROFILE -----------------
app.get("/api/profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const [rows] = await db.query(
      `SELECT full_name, email, username, dob, city, state, pincode, contact,
       TIMESTAMPDIFF(YEAR, dob, CURDATE()) AS age
       FROM users WHERE id = ?`,
      [req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/update-profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  const { city, state, pincode, password } = req.body;
  try {
    await db.query("UPDATE users SET city = ?, state = ?, pincode = ? WHERE id = ?", [city, state, pincode, req.session.userId]);
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, req.session.userId]);
    }
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- UPLOAD AVATAR -----------------
app.post("/api/upload-avatar", upload.single("avatar"), async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const avatarPath = `/uploads/${req.file.filename}`;
    await db.query("UPDATE users SET profile_picture = ? WHERE id = ?", [avatarPath, req.session.userId]);
    res.json({ message: "Avatar updated successfully", avatar: avatarPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading avatar" });
  }
});

// ----------------- VEHICLES -----------------
app.get("/api/vehicles", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM vehicles");
    res.json({ vehicles: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------- ORS DISTANCE API PROXY -----------------

app.post("/api/directions", async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Start and end coordinates required" });
    }

    // Ensure coordinates are [lng, lat]
    const coordinates = [start, end];

    const orsRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: {
        Authorization: process.env.VITE_ORS_API_KEY, // real key from .env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    });

    const data = await orsRes.json();

    if (!orsRes.ok) {
      console.error("ORS API Error:", data);
      return res.status(orsRes.status).json({ error: data });
    }

    res.json(data);
  } catch (err) {
    console.error("ORS Proxy Error:", err);
    res.status(500).json({ message: "Failed to fetch route" });
  }
});

// ----------------- FEEDBACK -----------------

// ---------- POST feedback for a vehicle ----------
app.post("/api/vehicles/:vehicleId/feedback", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Please login first" });

  const { vehicleId } = req.params;
  const { comment, rating } = req.body;


if (!rating === undefined) 
    return res.status(400).json({ message: "Rating required" });

// Optional: validate rating range
if (rating < 0 || rating > 5) 
    return res.status(400).json({ message: "Rating must be between 0 and 5" });


  try {
    // Optional: Check if user has booked this vehicle before allowing feedback
    const [bookings] = await db.query(
      "SELECT id FROM bookings WHERE user_id = ? AND vehicle_id = ?",
      [req.session.userId, vehicleId]
    );

    if (!bookings.length) {
      return res.status(403).json({ message: "You cannot give feedback for a vehicle you haven't booked" });
    }

    await db.query(
      "INSERT INTO feedback (vehicle_id, user_id, comment, rating, created_at) VALUES (?, ?, ?, ?, NOW())",
      [vehicleId, req.session.userId, comment, rating]
    );

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

// ---------- GET all feedback for a vehicle ----------
app.get("/api/vehicles/:vehicleId/feedback", async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT f.id, f.comment, f.rating, f.created_at, u.full_name AS userName
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.vehicle_id = ?
       ORDER BY f.created_at DESC`,
      [vehicleId]
    );

    res.json({ feedback: rows });
  } catch (err) {
    console.error("Error fetching vehicle feedback:", err);
    res.status(500).json({ message: "Failed to fetch vehicle feedback" });
  }
});

// ----------------- CANCEL BOOKING -----------------
app.delete("/api/bookings/:bookingId", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Please login first" });
  const { bookingId } = req.params;

  try {
    const [bookingRows] = await db.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [bookingId, req.session.userId]);
    if (!bookingRows.length) return res.status(403).json({ message: "Booking not found or unauthorized" });

    await db.query("DELETE FROM bookings WHERE id = ?", [bookingId]);
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});



// ----------------- SERVE REACT BUILD -----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));
app.get(/^\/(?!api).*/, (req, res) => { res.sendFile(path.join(__dirname, "dist", "index.html"));});

// ----------------- START SERVER -----------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));