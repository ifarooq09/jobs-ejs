require('dotenv').config();
const express = require('express');
require('express-async-errors');

const app = express();

app.set("view engine", "ejs");
app.use(require("body-parser").urlencoded({ extended: true }));

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const url = process.env.MONGO_URI;
const passport = require("passport");
const passportInit = require("./passport/passportInit");
const flash = require('connect-flash');
const secretWordRouter = require("./routes/secretWord");
const authMiddleware = require("./middleware/auth");

let store;
try {
    store = new MongoDBStore({
      uri: url,
      collection: "mySessions",
    });
    store.on("error", function (error) {
      console.log("Session Store Error:", error);
    });
} catch (error) {
    console.log("Error connecting to session store:", error);
}

store.on("error", function (error) {
  console.log(error);
});

const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};

if (app.get("env") === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}

app.use(session(sessionParms));
passportInit();
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(require("./middleware/storeLocals"));
app.get("/", (req, res) => {
  res.render("index");
});
app.use("/sessions", require("./routes/sessionRoutes"));

app.use("/secretWord", authMiddleware, secretWordRouter);

app.use((req, res) => {
    res.status(404).send(`That page (${req.url}) was not found`);
});

app.use((err, req, res, next) => {
    res.status(500).send(err.message);
    console.log(err);
});

const port = process.env.PORT || 3000;

const start = async () => {
    try {
        await require("./db/connect")(process.env.MONGO_URI)
        app.listen(port, () => {
            console.log(`Server started on port ${port}...`);
        });
    } catch (error) {
        console.log(error);
    }
};

start();
