require('dotenv').config();
const express = require('express');
require('express-async-errors');

const app = express();
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs");
app.use(require("body-parser").urlencoded({ extended: true }));

const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV == "test") {
    mongoURL = process.env.MONGO_URI_TEST;
}
const passport = require("passport");
const passportInit = require("./passport/passportInit");
const flash = require('connect-flash');
const secretWordRouter = require("./routes/secretWord");
const authMiddleware = require("./middleware/auth");
const jobsRouter = require("./routes/jobs"); // Corrected path

let store;
try {
    store = new MongoDBStore({
        uri: mongoURL,
        collection: "mySessions",
    });
    store.on("error", function (error) {
        console.log("Session Store Error:", error);
    });
} catch (error) {
    console.log("Error connecting to session store:", error);
}

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

// CSRF middleware
const csrf = require('host-csrf');
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.urlencoded({ extended: false }));

let csrf_development_mode = true;
if (app.get("env") === "production") {
    csrf_development_mode = false;
    app.set("trust proxy", 1);
}

const csrf_options = {
    protected_operations: ["PATCH"],
    protected_content_types: ["application/json"],
    development_mode: csrf_development_mode,
};

const csrf_middleware = csrf(csrf_options);

passportInit();
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(require("./middleware/storeLocals"));
app.get("/", csrf_middleware, (req, res) => {
    res.render("index");
});

app.use((req, res, next) => {
    if (req.path == "/multiply") {
        res.set("Content-Type", "application/json");
    } else {
        res.set("Content-Type", "text/html");
    }
    next();
});

app.use("/sessions", csrf_middleware, require("./routes/sessionRoutes"));
app.use("/secretWord", authMiddleware, csrf_middleware, secretWordRouter);
app.use("/jobs", csrf_middleware, authMiddleware, jobsRouter); // Ensure auth middleware is used here

app.get("/multiply", (req, res) => {
    const result = req.query.first * req.query.second;
    if (isNaN(result)) {
        result = "NaN";
    } else if (result == null) {
        result = "null";
    }
    res.json({ result: result });
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
        await require("./db/connect")(mongoURL);
        if (process.env.NODE_ENV !== 'test') {
            app.listen(port, () => {
                console.log(`Server started on port ${port}...`);
            });
        }
    } catch (error) {
        console.log(error);
    }
};

start();

module.exports = app;  
