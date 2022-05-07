const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.jwt;
  if (authHeader) {
    jwt.verify(authHeader, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send("Unauthorized");
      } else {
        console.log(decoded);
        next();
      }
    });
  } else {
    return res.status(401).send("JWT token is missing");
  }
};

module.exports = authMiddleware;
