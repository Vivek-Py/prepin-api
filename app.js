const express = require("express");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("./models/user");

const authMiddleware = require("./middlewares/authMiddleware");
const userDataFilter = require("./utils/userDataFilter");
const createJWToken = require("./utils/createJWToken");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 9000;

/*
 * Connect to MongoDB
 * Followed by Listening to port 9000
 */
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.info("Succesfully connected to DB");
    app.listen(port);
  })
  .catch((err) => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/*
 * Middleware to log all requests
 * authMiddleware is used to check if the user is logged in
 */
app.use(morgan("dev"));

app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const userDetails = await User.find({ email }).exec();
  if (userDetails.length > 0) {
    return res.status(404).send("User already exists");
  }
  try {
    // Hash the password to secure it from data breach
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    user
      .save()
      .then((result) => {
        const filteredUserData = userDataFilter(result);
        res.send({
          jwt: createJWToken(filteredUserData),
          userData: filteredUserData,
        });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal server error.");
      });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDetails = await User.find({ email }).exec();
    if (userDetails.length > 0) {
      if (await bcrypt.compare(password, userDetails[0].password)) {
        const user = userDataFilter(userDetails[0]);
        res.send({
          jwt: createJWToken(user),
          userData: user,
        });
      } else res.send("Password/Email is incorrect");
    } else {
      return res.status(404).send("Password/Email is incorrect");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

// Get all user data
app.get("/users", authMiddleware, (req, res) => {
  User.find()
    .then((users) => users.map(userDataFilter))
    .then((users) => res.send(users))
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal server error.");
    });
});

app.get("/users/:id", authMiddleware, (req, res, next) => {
  User.findById(req.params.id)
    .then((user) => res.send(userDataFilter(user)))
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal server error.");
    });
});

// Handling request URLs
app.get("/", (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  res.send("<h1>PrepInTech API is live!</h1>");
});

app.use((req, res) => {
  res.statusCode = 400;
  res.send("Resource doesn't exist");
});
