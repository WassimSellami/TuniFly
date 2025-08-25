const BASE_URL = 'https://tunifly-service.onrender.com';

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

export const fetchFlightById = async (flightId) => {
    try {
        const response = await fetch(`${BASE_URL}/flights/${flightId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching flight ${flightId}:`, error);
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

export const fetchUserByEmail = async (email) => {
    if (!email) return null;
    try {
        const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(email)}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching user ${email}:`, error);
        throw error;
    }
};

export const createUser = async (userData) => {
    try {
        const response = await fetch(`${BASE_URL}/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
};

export const updateUserEmailNotificationSetting = async (email, enabled) => {
    try {
        const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(email)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enableNotificationsSetting: enabled }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating user notification setting for ${email}:`, error);
        throw error;
    }
};

export const fetchSubscriptionsByEmail = async (email) => {
    if (!email) return [];
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            if (response.status === 404) {
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
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscription for flight ${flightId} and email ${email}:`, error);
        return null;
    }
};

export const createSubscription = async (subscriptionData) => {
    try {
        const payload = {
            ...subscriptionData,
            enableEmailNotifications: subscriptionData.enableEmailNotifications !== undefined ? subscriptionData.enableEmailNotifications : true
        };

        const response = await fetch(`${BASE_URL}/subscriptions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating subscription:", error);
        throw error;
    }
};

export const updateSubscription = async (subscriptionId, subscriptionData) => {
    try {
        const payload = {
            ...subscriptionData,
            enableEmailNotifications: subscriptionData.enableEmailNotifications !== undefined ? subscriptionData.enableEmailNotifications : true
        };

        const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
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
        return { success: true, message: `Subscription ${subscriptionId} deleted.` };
    } catch (error) {
        console.error(`Error deleting subscription ${subscriptionId}:`, error);
        throw error;
    }
};