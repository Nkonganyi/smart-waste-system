require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const authRoutes = require("./routes/authRoutes")
const reportRoutes = require("./routes/reportRoutes")

app.use("/api/auth", authRoutes)
app.use("/api/reports", reportRoutes)

app.get("/", (req, res) => {
    res.send("Smart Waste Backend Running")
})

app.listen(5000, () => {
    console.log("Server running on port 5000")
})