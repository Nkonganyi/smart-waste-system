//User Registration logic
const supabase = require("../config/supabase")
const bcrypt = require("bcrypt")

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields required" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
        .from("users")
        .insert([
            {
                name,
                email,
                password: hashedPassword,
                role: role || "citizen"
            }
        ])

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    res.status(201).json({ message: "User registered successfully" })
}
// Login Logic
const jwt = require("jsonwebtoken")

exports.login = async (req, res) => {
    const { email, password } = req.body

    const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)

    if (error || users.length === 0) {
        return res.status(400).json({ message: "Invalid credentials" })
    }

    const user = users[0]

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    )

    res.json({ token })
}