// src/api.js
const BASE_URL = 'http://127.0.0.1:8000'; // Your FastAPI backend URL

export const fetchAirlines = async () => {
    try {
        const response = await fetch(`${BASE_URL}/airlines/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching airlines:", error);
        throw error;
    }
};

export const fetchAirports = async () => {
    try {
        const response = await fetch(`${BASE_URL}/airports/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching airports:", error);
        throw error;
    }
};

export const searchFlights = async (searchParams) => {
    // Construct URLSearchParams from searchParams object
    const params = new URLSearchParams();
    if (searchParams.departureAirportCodes && searchParams.departureAirportCodes.length > 0) {
        searchParams.departureAirportCodes.forEach(code => params.append('departureAirportCodes', code));
    }
    if (searchParams.arrivalAirportCodes && searchParams.arrivalAirportCodes.length > 0) {
        searchParams.arrivalAirportCodes.forEach(code => params.append('arrivalAirportCodes', code));
    }
    if (searchParams.startDate) {
        params.append('startDate', searchParams.startDate); // YYYY-MM-DD
    }
    if (searchParams.endDate) {
        params.append('endDate', searchParams.endDate);   // YYYY-MM-DD
    }
    if (searchParams.airlineCodes && searchParams.airlineCodes.length > 0) {
        searchParams.airlineCodes.forEach(code => params.append('airlineCodes', code));
    }

    const queryString = params.toString();

    try {
        const response = await fetch(`${BASE_URL}/flights/?${queryString}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error searching flights:", error);
        throw error;
    }
};

export const fetchPriceHistory = async (flightId) => {
    try {
        const response = await fetch(`${BASE_URL}/price-history/flight/${flightId}`);
        if (!response.ok) {
            // Handle case where a flight might not have a price history yet
            if (response.status === 404) {
                return []; // Return an empty array if no history is found
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching price history for flight ${flightId}:`, error);
        throw error;
    }
};


// --- ADD THIS EXPORTED FUNCTION ---
export const createSubscription = async (subscriptionData) => {
    console.log("Submitting subscription with data:", subscriptionData);
    // This is a placeholder for the actual API call
    // I am waiting for your POST /subscriptions details to fill this in.

    // For now, return a success promise after a delay to simulate an API call
    return new Promise(resolve => setTimeout(() => {
        resolve({ success: true, message: "Subscription created (simulation)!" });
    }, 1000));
};