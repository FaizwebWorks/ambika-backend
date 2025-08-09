require("dotenv").config();
const express = require("express");
const app = express();
const dbConfig = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const PORT = process.env.PORT || 3000;

dbConfig();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
