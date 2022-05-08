/* Library imports */
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const axios = require("axios");
const uuid = require("uuid");
const http = require("http");

/* Model imports */
const User = require("./models/user");
const Channel = require("./models/channel");
const Document = require("./models/document");
const Interview = require("./models/interview");

/* Utils imports */
const authMiddleware = require("./middlewares/authMiddleware");
const userDataFilter = require("./utils/userDataFilter");
const createJWToken = require("./utils/createJWToken");

require("dotenv").config();

// Create express app and open socket.io
const app = express();
const port = process.env.PORT || 9000;
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: ["https://prepintech-api.herokuapp.com"],
    "Access-Control-Allow-Origin": "*",
  },
});

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
    server.listen(port);
  })
  .catch((err) => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/*
 * Middleware to log all requests
 * authMiddleware is used to check if the user is logged in
 * cors handling
 */
app.use(morgan("dev"));
app.use(cors());

// POST requesting for scheduling an interview
app.post("/schedule", authMiddleware, (req, res) => {
  try {
    const token = req.headers.jwt;
    const { dateAndTime } = req.body;
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log(err);
        res.status(404).json("Invalid token");
      }
      const channelName = uuid.v4();
      axios
        .get(
          `https://prepintech-rtc.herokuapp.com/rtm/${channelName}/${process.env.GO_SECRET}`
        )
        .then(async (result) => {
          const { data } = result;
          const interview = new Interview({
            dateAndTime,
            peerFirst: decoded.id,
            token: data.rtmToken,
            channelName,
          });
          await interview
            .save()
            .then((result) => res.send(result))
            .catch(() => res.status(404).send("Error scheduling interview"));
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send({ error: "Internal Server Error." });
        });
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

// GET request for getting all interviews
app.get("/schedule", authMiddleware, async (req, res) => {
  try {
    Interview.find({ available: true })
      .then((interviews) => {
        res.send(interviews);
      })
      .catch(() => res.status(404).send("Error fetching interviews"));
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

// PATCH request for updating a interview
app.patch("/schedule/:id", authMiddleware, async (req, res) => {
  try {
    const token = req.headers.jwt;
    const { id } = req.params;
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log(err);
        res.status(404).json("Invalid token");
      }
      await Interview.findOneAndUpdate(
        { _id: id },
        { peerSecond: decoded.id, available: false }
      );
      res.send("Interview scheduled");
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
});

/* Verify user JWT */
app.get("/verify", (req, res, next) => {
  authMiddleware(req, res, next, true);
});

/* PATCH request to update user data */
app.patch("/users", authMiddleware, async (req, res) => {
  try {
    const token = req.headers.jwt;
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      await User.findOneAndUpdate({ _id: decoded?.id }, req.body);

      User.findById(decoded?.id)
        .then((user) => res.send(userDataFilter(user)))
        .catch((err) => {
          console.error(err);
          res.status(500).send("Internal server error.");
        });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

/* GET request to dynamically generate token from GO server */
app.get("/token", authMiddleware, async (req, res, next) => {
  try {
    const channels = await Channel.find();
    if (channels.length > 0) {
      const { token, channelName } = channels[0];
      await Channel.findOneAndDelete({ token, channelName });
      res.status(200).send({ token, channelName });
    } else {
      const channelName = uuid.v4();
      axios
        .get(
          `https://prepintech-rtc.herokuapp.com/rtm/${channelName}/${process.env.GO_SECRET}`
        )
        .then((result) => {
          const { data } = result;
          const channel = new Channel({
            token: data.rtmToken,
            channelName,
          });
          channel
            .save()
            .then((response) => res.status(200).send(response))
            .catch((err) => {
              console.error(err);
              res.status(500).send("Internal server error.");
            });
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send({ error: "Internal Server Error." });
        });
    }
  } catch (err) {
    return res.status(500).send("Internal server error.");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const userDetails = await User.find({ email }).exec();
    if (userDetails.length > 0) {
      return res.status(404).send("User already exists");
    }

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
  try {
    const { email, password } = req.body;
    const userDetails = await User.find({ email }).exec();
    if (userDetails.length > 0) {
      if (await bcrypt.compare(password, userDetails[0].password)) {
        const user = userDataFilter(userDetails[0]);
        res.send({
          jwt: createJWToken(user),
          userData: user,
        });
      } else res.status(401).send("Password/Email is incorrect");
    } else {
      return res.status(401).send("Password/Email is incorrect");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

// Get all user data
app.get("/users", authMiddleware, (req, res) => {
  try {
    User.find()
      .then((users) => users.map(userDataFilter))
      .then((users) => res.send(users))
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal server error.");
      });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

app.get("/users/:id", authMiddleware, (req, res, next) => {
  try {
    User.findById(req.params.id)
      .then((user) => res.send(userDataFilter(user)))
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal server error.");
      });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
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

const defaultValue = "";

io.on("connection", (socket) => {
  try {
    socket.on("get-document", async (documentId) => {
      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);
      socket.emit("load-document", document.data);

      socket.on("send-changes", (delta) => {
        socket.broadcast.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async (data) => {
        await Document.findByIdAndUpdate(documentId, { data });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
