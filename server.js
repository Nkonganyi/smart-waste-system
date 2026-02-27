require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const authRoutes = require("./routes/authRoutes")
const reportRoutes = require("./routes/reportRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")

// helpers for file upload and storage
const upload = require("./middleware/uploadMiddleware")
const { authenticate } = require("./middleware/authMiddleware")
const supabase = require("./config/supabase")

app.use("/api/auth", authRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Image upload endpoint used by both report creation and
// collector completion. Accepts a single file named "file".
app.post(
    "/api/upload",
    authenticate,
    upload.single("file"),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" })
        }

        try {
            const fileName = `${Date.now()}-${req.file.originalname}`
            const { error: uploadError } = await supabase.storage
                .from("waste-images")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype
                })

            if (uploadError) {
                return res.status(400).json({ error: uploadError.message })
            }

            const { data: publicUrl } = supabase.storage
                .from("waste-images")
                .getPublicUrl(fileName)

            return res.json({ url: publicUrl.publicUrl })
        } catch (err) {
            return res.status(500).json({ error: "Upload failed" })
        }
    }
)

app.get("/", (req, res) => {
    res.send("Smart Waste Backend Running")
})

app.listen(5000, () => {
    console.log("Server running on port 5000")
})