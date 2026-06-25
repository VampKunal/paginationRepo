const express = require("express");
const cors = require("cors");
const productsroute = require("./routes/product");
const app = express();

app.use(cors());
app.use(express.json());
// app.get("/", (req, res) => {
//     res.json({
//         success: true,
//     });
// });
app.use("/products", productsroute);
module.exports = app;