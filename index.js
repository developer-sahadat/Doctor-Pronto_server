const express = require("express");
const app = express();
require("dotenv").config();
var cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Doctor Pronto listening on port ${port}`);
});
