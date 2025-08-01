// src/api.js
const BASE_URL = 'http://127.0.0.1:8000';

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
    const params = new URLSearchParams();
    if (searchParams.departureAirportCodes && searchParams.departureAirportCodes.length > 0) {
        searchParams.departureAirportCodes.forEach(code => params.append('departureAirportCodes', code));
    }
    if (searchParams.arrivalAirportCodes && searchParams.arrivalAirportCodes.length > 0) {
        searchParams.arrivalAirportCodes.forEach(code => params.append('arrivalAirportCodes', code));
    }
    if (searchParams.startDate) {
        params.append('startDate', searchParams.startDate);
    }
    if (searchParams.endDate) {
        params.append('endDate', searchParams.endDate);
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
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching price history for flight ${flightId}:`, error);
        throw error;
    }
};

// --- NEW SUBSCRIPTION API CALLS ---

export const fetchSubscriptionsByEmail = async (email) => {
    if (!email) return []; // Don't fetch if no email is provided
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            if (response.status === 404) { // No subscriptions found
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscriptions for ${email}:`, error);
        throw error;
    }
};

export const fetchSubscriptionByFlightAndEmail = async (flightId, email) => {
    if (!flightId || !email) return null;
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/flight/${flightId}?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            if (response.status === 404) { // Not found means not subscribed
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscription for flight ${flightId} and email ${email}:`, error);
        return null; // Return null if fetching fails
    }
};

export const createSubscription = async (subscriptionData) => {
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json(); // Returns the created subscription object (SubscriptionOut)
    } catch (error) {
        console.error("Error creating subscription:", error);
        throw error;
    }
};

export const updateSubscription = async (subscriptionId, subscriptionData) => {
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json(); // Returns the updated subscription object
    } catch (error) {
        console.error(`Error updating subscription ${subscriptionId}:`, error);
        throw error;
    }
};

export const deleteSubscription = async (subscriptionId) => {
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json(); // Returns the deleted subscription object
    } catch (error) {
        console.error(`Error deleting subscription ${subscriptionId}:`, error);
        throw error;
    }
};