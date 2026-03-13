const axios = require("axios");

/**
 * Geocoding Service using OpenCage Data API
 * Converts user-entered location text into geographic coordinates.
 * 
 * @param {string} address - The location text to geocode.
 * @returns {Promise<{latitude: number, longitude: number}>}
 * @throws {Error} If no results are found or if the API request fails.
 */
const geocode = async (address) => {
    try {
        const apiKey = process.env.OPENCAGE_API_KEY;
        if (!apiKey) {
            throw new Error("Geocoding service configuration error: API key missing.");
        }

        const url = "https://api.opencagedata.com/geocode/v1/json";
        
        const response = await axios.get(url, {
            params: {
                q: address,
                key: apiKey,
                countrycode: "cm",
                proximity: "4.155,9.231" // Favor Buea
            }
        });

        if (response.data && response.data.results && response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry;
            return {
                latitude: lat,
                longitude: lng
            };
        }
        
        // Return null if location not found (graceful failure)
        return null;
        
    } catch (error) {
        if (error.response) {
            console.error(`Geocoding API error: ${error.response.data.status?.message || error.message}`);
        } else {
            console.error(`Geocoding error: ${error.message}`);
        }
        return null;
    }
};

/**
 * Fetches location suggestions for autocomplete
 * @param {string} query - The search text
 * @returns {Promise<string[]>} - Array of formatted location strings
 */
const getLocationSuggestions = async (query) => {
    try {
        const apiKey = process.env.OPENCAGE_API_KEY;
        if (!apiKey) return [];

        const url = "https://api.opencagedata.com/geocode/v1/json";
        const response = await axios.get(url, {
            params: {
                q: query,
                key: apiKey,
                limit: 5,
                countrycode: "cm",
                proximity: "4.155,9.231" // Favor Buea
            }
        });

        if (response.data && response.data.results) {
            return response.data.results.map(res => res.formatted);
        }
        return [];
    } catch (error) {
        console.error("Geocoding suggestions error:", error.message);
        return [];
    }
};

module.exports = { geocode, getLocationSuggestions };
