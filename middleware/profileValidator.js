/**
 * Profile Validation Middleware
 * Validates data for user profile updates
 */

const validateProfileUpdate = (req, res, next) => {
    const { name, phone, address } = req.body;
    const errors = [];

    // Name validation: must be at least 2 characters if provided
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 2) {
            errors.push("Name must be at least 2 characters long");
        }
    }

    // Phone validation: numbers and optional "+" if provided
    if (phone !== undefined && phone !== null && phone !== "") {
        const phoneRegex = /^\+?[0-9\s\-()]+$/;
        if (!phoneRegex.test(phone)) {
            errors.push("Phone must contain only numbers and optional '+'");
        }
    }

    // Address validation: maximum 255 characters if provided
    if (address !== undefined && address !== null) {
        if (typeof address !== 'string' || address.length > 255) {
            errors.push("Address must not exceed 255 characters");
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Invalid profile data",
            details: errors
        });
    }

    next();
};

module.exports = {
    validateProfileUpdate
};
