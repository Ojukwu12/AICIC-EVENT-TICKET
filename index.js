const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });

const app = require("./app");
const mongoose = require("mongoose");

const port = 5000;
