require("dotenv").config();
const { geocode } = require("./utils/geocodingService");

const test = async () => {
    const addresses = [
        "Molyko, Buea",
        "Mile 17 Yard, Buea",
        "Limbe, Cameroon",
        "Invalid Address 1234567890"
    ];

    console.log("--- Testing Geocoding (Refined) ---");
    for (const addr of addresses) {
        console.log(`\nAddress: "${addr}"`);
        try {
            const result = await geocode(addr);
            console.log(`RESULT: Lat: ${result.latitude}, Lng: ${result.longitude}`);
        } catch (err) {
            console.log(`CAUGHT EXPECTED ERROR: ${err.message}`);
        }
    }
    console.log("\n--- Test Complete ---");
};

test();
