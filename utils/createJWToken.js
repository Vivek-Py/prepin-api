const jwt = require("jsonwebtoken");

const createJWToken = (payload) => {
  const expiresIn = 3 * 24 * 60 * 60;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

module.exports = createJWToken;
