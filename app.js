require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "I still love Amrita.",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
    res.render("home");
});

app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}));

app.get("/auth/facebook", passport.authenticate("facebook", {scope: ["public_profile"]}));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get('/auth/facebook/secrets', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.route("/login")
.get(function(req, res) {
    res.render("login");
})
.post(function(req, res) {
    const user = new User({
        email: req.body.username,
        password: req.body.password,
    });
    req.login(user, function(err) {
        if(err) console.log(err);
        return res.redirect("/secrets");
    });
});

app.route("/register")
.get(function(req, res) {
    res.render("register");
})
.post(function(req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        }else {
            passport.authenticate("local")(req, user, function() {
                res.redirect("/secrets");
            });
        }
    });
});

app.route("/secrets")
.get(async function(req, res) {
    const users = await User.find({secret: {$ne: null}});
    res.render("secrets", {usersWithSecrets: users});
});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if(err) {
            console.log(err);
        }
    });
    res.redirect("/");
});

app.route("/submit")
.get(function(req, res) {
    if(req.isAuthenticated()) {
        res.render("submit");
    }else {
        res.redirect("/login");
    }
})
.post(async function(req, res) {
    const userId = req.user.id;
    const secret = req.body.secret;
    await User.updateOne({_id: userId}, {$set: {secret: secret}});
    res.redirect("/secrets");
});

app.listen(3000, function() {
    console.log("Server running at port 3000");
});