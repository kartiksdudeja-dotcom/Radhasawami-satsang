import jwt from "jsonwebtoken";

// ✅ Verify JWT Token (Authentication)
export const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      // Attach real user from token
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      next();
    });

  } catch (error) {
    console.error("Auth Error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};



// ✅ Admin Authorization (Role-based access)
export const verifyAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    next();

  } catch (error) {
    console.error("Admin Check Error:", error);
    res.status(500).json({ message: "Authorization failed" });
  }
};