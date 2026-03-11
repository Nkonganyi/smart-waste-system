const supabase = require("../config/supabase");

/**
 * Get currently logged-in user's profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[UserController] Fetching profile for userID: ${userId}`);

        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, role, is_verified, phone, address, created_at")
            .eq("id", userId)
            .single();

        if (error) {
            console.error(`[UserController] Supabase Error fetching profile for ${userId}:`, error);
            return res.status(500).json({
                error: "Fetch failed",
                message: "Could not retrieve user profile"
            });
        }

        if (!user) {
            console.warn(`[UserController] User profile not found for ${userId}`);
            return res.status(404).json({
                error: "Not found",
                message: "User profile not found"
            });
        }

        console.log(`[UserController] Successfully retrieved profile for ${userId}`);
        return res.status(200).json(user);
    } catch (error) {
        console.error("getProfile exception:", error);
        return res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred while fetching profile"
        });
    }
};

/**
 * Update user's profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, address } = req.body;

        // Build update object with only provided fields
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: "No data provided",
                message: "At least one field (name, phone, address) must be provided for update"
            });
        }

        updates.updated_at = new Date().toISOString();

        const { data: updatedUser, error } = await supabase
            .from("users")
            .update(updates)
            .eq("id", userId)
            .select("id, name, email, role, is_verified, phone, address, created_at")
            .single();

        if (error) {
            console.error("Error updating profile:", error);
            return res.status(500).json({
                error: "Update failed",
                message: "Failed to update user profile"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("updateProfile exception:", error);
        return res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred while updating profile"
        });
    }
};
