const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    console.log("Verifying token for request:", req.path);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    if (req.headers.authorization) {
       console.log("Failed Token:", req.headers.authorization.substring(0, 20) + "...");
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }

};
