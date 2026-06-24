import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./config/db.js";
import { initializePushNotifications } from "./utils/push_notifications.js";
import notificationRoutes from "./routes/notification_routes.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import sevaRoutes from "./routes/sevaRoutes.js";
import sevaMasterRoutes from "./routes/sevaMasterRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import supermanPhaseRoutes from "./routes/supermanPhaseRoutes.js";
import satsangRoutes from "./routes/satsangRoutes.js";

import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🚀 0. GLOBAL LOGGER - First thing to run
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📡 ${req.method} ${req.url} - Origin: ${req.headers.origin || 'None'}`);
  next();
});

// 📡 1. CORS - MUST BE FIRST
const allowedOrigins = [
  "https://uatrsatsang.bharatmentors.com",
  "https://apipunesatsang.bharatmentors.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // 🔥 DEBUG: Log every incoming origin to server console
    console.log(`🌐 Incoming Request Origin: ${origin || 'No Origin (Direct/Mobile)'}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.toLowerCase().includes("bharatmentors.com") ||
                     origin.toLowerCase().includes("localhost") ||
                     origin.toLowerCase().includes("127.0.0.1") ||
                     origin.includes("10.") ||
                     origin.includes("192.168.") ||
                     origin.includes("172.");

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🔒 [CORS BLOCK] Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'x-user-id', 'Accept', 'Origin'],
  exposedHeaders: ['X-User-Id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ✅ Handle Preflight Requests Globally
app.options("*", cors());

// 🛡️ 2. SECURITY & UTILS
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "no-referrer-when-downgrade" }
})); 
app.use(compression()); 

// Rate Limiting & Load Balancer support
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx, Cloudflare)

// 🛡️ 3. WAF & BODY PARSING
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Custom "WAF" to block suspicious patterns
app.use((req, res, next) => {
  // Skip WAF for OPTIONS requests and static files
  if (req.method === 'OPTIONS') return next();
  if (req.path.startsWith('/uploads')) return next();
  
  const suspiciousPatterns = [/UNION SELECT/i, /<script>/i, /OR 1=1/i, /\.\.\//];
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const clientIp = String(rawIp).split(':')[0].split(',')[0].trim();
  
  let bodyString = "";
  try {
    if (req.body && JSON.stringify(req.body).length < 10000) {
      bodyString = JSON.stringify(req.body);
    }
  } catch (e) {}

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(bodyString)
  );

  if (isSuspicious) {
    console.error(`🚨 [WAF BLOCK] Suspicious activity from IP ${clientIp} on ${req.url}`);
    return res.status(403).json({ success: false, error: "Forbidden activity detected." });
  }
  next();
});

// Apply global rate limiting to all /api routes
app.use("/api", apiLimiter);
// Apply stricter limit to auth routes
app.use("/api/auth", authLimiter);

// Debug middleware to log all requests
app.use((req, res, next) => {
  if (req.path === "/api/attendance" && req.method === "POST") {
    console.log("🔍 DEBUG - Attendance POST Request:");
    console.log("   Headers:", req.headers);
    console.log("   Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve static files (profile photos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "✅ Server is running", timestamp: new Date() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/seva", sevaRoutes);
app.use("/api/seva-master", sevaMasterRoutes);
app.use("/api/superman-phases", supermanPhaseRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/satsang-categories", satsangRoutes);

// Initialize Web Push Notifications
console.log("🔔 Initializing Web Push Notifications...");
initializePushNotifications(
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
  process.env.VAPID_EMAIL
);

// Root route for server health check
app.get('/', (req, res) => {
  res.json({ 
    status: "✅ Success", 
    message: "Radha Swami Backend API is running successfully.",
    time: new Date().toLocaleString() 
  });
});

// Register Notification Routes
app.use("/api", notificationRoutes);

// Initialize database and start server
(async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log("\n✅ Radha Swami Backend is running!");
      console.log(`🖥️  Local: http://localhost:${PORT}`);
      console.log(`📱 Network: http://10.45.236.80:${PORT}`);
      console.log(`📝 API Health Check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();
