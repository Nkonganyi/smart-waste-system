const axios = require("axios");

const OPTIMIZATION_URL = "https://api.openrouteservice.org/v2/optimization";

const sortByPriority = (locations) =>
    [...locations].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

exports.optimizeRoute = async (locations) => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    if (safeLocations.length < 2) {
        return { ordered: safeLocations, fallback: true };
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
        return { ordered: sortByPriority(safeLocations), fallback: true };
    }

    const depotLng = parseFloat(process.env.DEPOT_LNG || safeLocations[0].longitude);
    const depotLat = parseFloat(process.env.DEPOT_LAT || safeLocations[0].latitude);
    const startEnd = [depotLng, depotLat];

    const jobs = safeLocations.map((loc, index) => ({
        id: index + 1,
        location: [loc.longitude, loc.latitude]
    }));

    const payload = {
        jobs,
        vehicles: [
            {
                id: 1,
                profile: "driving-car",
                start: startEnd,
                end: startEnd
            }
        ]
    };

    try {
        const response = await axios.post(OPTIMIZATION_URL, payload, {
            headers: {
                Authorization: apiKey,
                "Content-Type": "application/json"
            }
        });

        const steps = response?.data?.routes?.[0]?.steps || [];
        const ordered = steps
            .filter(step => step.type === "job")
            .map(step => safeLocations[(step.job || step.id) - 1])
            .filter(Boolean);

        if (ordered.length !== safeLocations.length) {
            return { ordered: sortByPriority(safeLocations), fallback: true };
        }

        return { ordered, fallback: false };
    } catch (error) {
        console.error("Route optimization failed:", error?.response?.data || error);
        return { ordered: sortByPriority(safeLocations), fallback: true };
    }
};

const DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

exports.getRouteGeometry = async (locations) => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    if (safeLocations.length < 2) {
        return { geometry: null, fallback: true };
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
        return { geometry: null, fallback: true };
    }

    const coordinates = safeLocations.map(loc => [loc.longitude, loc.latitude]);

    try {
        const response = await axios.post(
            DIRECTIONS_URL,
            { coordinates },
            {
                headers: {
                    Authorization: apiKey,
                    "Content-Type": "application/json"
                }
            }
        );

        return { geometry: response?.data, fallback: false };
    } catch (error) {
        console.error("Route geometry failed:", error?.response?.data || error);
        return { geometry: null, fallback: true };
    }
};
