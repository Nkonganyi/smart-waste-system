require("dotenv").config()
const express = require("express")
const cors = require("cors")
const path = require("path")

// helpers for file upload and storage
const upload = require("./middleware/uploadMiddleware")
const { authenticate } = require("./middleware/authMiddleware")
const supabase = require("./config/supabase")

// Routes
const authRoutes = require("./routes/authRoutes")
const reportRoutes = require("./routes/reportRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const userRoutes = require("./routes/userRoutes")
const adminRoutes = require("./routes/adminRoutes")

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Debug Logger - logs EVERY request to help catch shadowing
app.use((req, res, next) => {
    console.log(`[DEBUG LOG] Received ${req.method} request for ${req.url}`);
    next();
});

/* -------------------------------------------------------------------------- */
/*                                API ROUTES                                  */
/* -------------------------------------------------------------------------- */
console.log("DEBUG: Registering API routes...");

app.use("/api/users", userRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/admin", adminRoutes)

// Test endpoints
app.get("/api/ping", (req, res) => res.json({ message: "pong" }));
app.get("/api/test", (req, res) => res.json({ message: "API base is working" }));

// Image upload endpoint
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
            if (uploadError) return res.status(400).json({ error: uploadError.message })
            const { data: publicUrl } = supabase.storage.from("waste-images").getPublicUrl(fileName)
            return res.json({ url: publicUrl.publicUrl })
        } catch (err) {
            return res.status(500).json({ error: "Upload failed" })
        }
    }
)

/* -------------------------------------------------------------------------- */
/*                               STATIC ASSETS                                */
/* -------------------------------------------------------------------------- */

// Serve static files AFTER API routes to prevent shadowing
app.use(express.static('./Frontend'))

// Explicit pages for clean routing
const pages = ["login", "register", "profile", "verify-email", "reset-password", "admin"];
pages.forEach(page => {
    const fileName = (page === "login") ? "index.html" : `${page}.html`;
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, "Frontend", fileName));
    });
});

/* -------------------------------------------------------------------------- */
/*                               ERROR HANDLING                               */
/* -------------------------------------------------------------------------- */

// Catch-all for undefined routes
app.use((req, res) => {
    console.warn(`[SERVER 404] No route matched: ${req.method} ${req.url}`);
    res.status(404).json({
        error: "Not Found",
        message: `The path ${req.url} does not exist on this server.`,
        availableEndpoints: [
            "/api/users/profile",
            "/api/auth",
            "/api/reports",
            "/api/test"
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
