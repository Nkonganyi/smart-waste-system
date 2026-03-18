const supabase = require("../config/supabase");
const { optimizeRoute } = require("../utils/routeService");

/**
 * Get optimized route (admin)
 */
exports.getOptimizedRoute = async (req, res) => {
    try {
        const reportIds = req.query.report_ids
            ? req.query.report_ids
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean)
            : [];

        let query = supabase
            .from("reports")
            .select("id, title, latitude, longitude, priority_score, status")
            .not("latitude", "is", null)
            .not("longitude", "is", null);

        if (reportIds.length > 0) {
            query = query.in("id", reportIds);
        } else {
            query = query.in("status", ["approved", "pending"]);
        }

        const { data: reports, error } = await query;

        if (error) {
            console.error("Error fetching reports for route:", error);
            return res.status(500).json({
                error: "Fetch failed",
                message: "Could not retrieve reports"
            });
        }

        const locations = (reports || []).map((report) => ({
            id: report.id,
            title: report.title,
            latitude: report.latitude,
            longitude: report.longitude,
            priority_score: report.priority_score ?? 0
        }));

        const { ordered, fallback } = await optimizeRoute(locations);

        return res.status(200).json({
            route: ordered,
            fallback,
            total: locations.length
        });
    } catch (error) {
        console.error("getOptimizedRoute exception:", error);
        return res.status(500).json({
            error: "Server error",
            message: "An unexpected error occurred while optimizing route"
        });
    }
};
