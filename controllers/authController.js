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

    const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

    if (!user) {
        return res.status(400).json({ error: "Invalid credentials" })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
        return res.status(400).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.json({
        token,
        role: user.role
    })
}