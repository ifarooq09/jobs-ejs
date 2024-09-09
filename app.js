require('dotenv').config();
const express = require('express');
require('express-async-errors');

const app = express();

app.set("view engine", "ejs");
app.use(require("body-parser").urlencoded({ extended: true }));

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const url = process.env.MONGO_URI;

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
app.use(require("connect-flash")());

app.get("/secretWord", (req, res) => {
    if (!req.session.secretWord) {
        req.session.secretWord = "syzygy";
    }
    const errors = req.flash("error");
    const info = req.flash("info");
    res.render("secretWord", {
        secretWord: req.session.secretWord,
        errors: errors,
        info: info
    });
});

app.post("/secretWord", (req, res) => {
    if (req.body.secretWord.toUpperCase()[0] === "P") {
      req.flash("error", "That word won't work!");
      req.flash("error", "You can't use words that start with p.");
    } else {
      req.session.secretWord = req.body.secretWord;
      req.flash("info", "The secret word was changed.");
    }
    res.redirect("/secretWord");
});

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
        app.listen(port, () => {
            console.log(`Server started on port ${port}...`);
        });
    } catch (error) {
        console.log(error);
    }
};

start();
