require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", function(req, res) {
    res.render("home");
});

app.route("/login")
.get(function(req, res) {
    res.render("login");
})
.post(async function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const data = await User.findOne({email: username});
    if(data) {
        if(data.password === password) {
            res.render("secrets");
        }else {
            res.redirect("/login");
        }
    } else {
        res.redirect("/login");
    }
});

app.route("/register")
.get(function(req, res) {
    res.render("register");
})
.post(async function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const user = new User({
        email: username,
        password: password,
    });
    await user.save();
    res.render("secrets");
});

app.listen(3000, function() {
    console.log("Server running at port 3000");
});