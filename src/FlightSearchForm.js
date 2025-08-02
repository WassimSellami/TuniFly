import React, { useState, useEffect, useCallback } from 'react';
import { fetchAirlines, fetchAirports, searchFlights, deleteSubscription, updateUserEmailNotificationSetting, fetchFlightById, fetchSubscriptionsByEmail, fetchUserByEmail, createUser } from './api';
import { isBefore, addDays, format } from 'date-fns';
import FlightResultsDisplay from './FlightResultsDisplay';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDatePicker.css';
import FlightDetailModal from './FlightDetailModal';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const FlightSearchForm = ({ userEmail, setUserEmail, userSubscriptions, subscriptionsLoading, subscriptionsError, setUserSubscriptions }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [allAirports, setAllAirports] = useState([]);
    const [allAirlines, setAllAirlines] = useState([]);

    const [direction, setDirection] = useState('');
    const [tunisianAirports, setTunisianAirports] = useState([]);
    const [germanAirports, setGermanAirports] = useState([]);

    const [possibleRoutes, setPossibleRoutes] = useState([]);
    const [selectedRoutes, setSelectedRoutes] = useState([]);

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(addDays(new Date(), 7));

    const [selectedAirlineCodes, setSelectedAirlineCodes] = useState([]);

    const [searchResults, setSearchResults] = useState(null);

    const [enableEmailNotifications, setEnableEmailNotifications] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlightFromSubscription, setSelectedFlightFromSubscription] = useState(null);

    const [displaySubscriptions, setDisplaySubscriptions] = useState([]);
    const [displaySubsLoading, setDisplaySubsLoading] = useState(false);

    const [userExists, setUserExists] = useState(false);
    const [userCheckLoading, setUserCheckLoading] = useState(true);
    const [userActionError, setUserActionError] = useState(null);

    const [formErrors, setFormErrors] = useState({});
    // Removed formSubmitMessage state


    const capitalizeWords = useCallback((str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ').split('-').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join('-');
    }, []);

    const getAirportDisplayName = useCallback((code) => {
        const airport = allAirports.find(a => a.code === code);
        return airport ? `${capitalizeWords(airport.name)} (${code})` : code;
    }, [allAirports, capitalizeWords]);


    useEffect(() => {
        const checkUser = async () => {
            setUserCheckLoading(true);
            setUserActionError(null);
            if (!userEmail) {
                setUserExists(false);
                setEnableEmailNotifications(true);
                setUserCheckLoading(false);
                return;
            }

            try {
                const user = await fetchUserByEmail(userEmail);
                if (user) {
                    setUserExists(true);
                    setEnableEmailNotifications(user.enableNotificationsSetting);
                } else {
                    setUserExists(false);
                    setEnableEmailNotifications(true);
                }
            }
            catch (err) {
                console.error("Failed to check user existence:", err);
                setUserActionError("Could not verify user status. " + err.message);
                setUserExists(false);
            } finally {
                setUserCheckLoading(false);
            }
        };

        checkUser();
    }, [userEmail]);


    useEffect(() => {
        if (userEmail && userExists && !userCheckLoading) {
            updateUserEmailNotificationSetting(userEmail, enableEmailNotifications)
                .catch(err => console.error("Failed to update user email notification setting:", err));
        }
    }, [enableEmailNotifications, userEmail, userExists, userCheckLoading]);


    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [airlines, airports] = await Promise.all([
                    fetchAirlines(),
                    fetchAirports()
                ]);

                setAllAirlines(airlines);
                setAllAirports(airports);

                const tnAirports = airports.filter(a => a.country === 'TN');
                const deAirports = airports.filter(a => a.country === 'DE');
                setTunisianAirports(tnAirports);
                setGermanAirports(deAirports);

            } catch (err) {
                setError("Failed to load initial data. " + err.message);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const loadAndEnrichSubscriptions = useCallback(async () => {
        if (!userEmail || !userExists) {
            setDisplaySubscriptions([]);
            setUserSubscriptions([]);
            return;
        }

        setDisplaySubsLoading(true);
        try {
            const rawSubs = await fetchSubscriptionsByEmail(userEmail);
            const enrichedSubsPromises = rawSubs.map(async (sub) => {
                try {
                    const flightDetails = await fetchFlightById(sub.flightId);
                    return {
                        ...sub,
                        flightDepartureAirportCode: flightDetails.departureAirportCode,
                        flightArrivalAirportCode: flightDetails.arrivalAirportCode,
                        flightDepartureDate: flightDetails.departureDate,
                        flightAirlineCode: flightDetails.airlineCode,
                        flightPrice: flightDetails.price
                    };
                } catch (flightErr) {
                    console.warn(`Could not fetch details for flight ${sub.flightId}:`, flightErr);
                    return {
                        ...sub,
                        flightDepartureAirportCode: 'N/A',
                        flightArrivalAirportCode: 'N/A',
                        flightDepartureDate: null,
                        flightAirlineCode: 'N/A',
                        flightPrice: 'N/A'
                    };
                }
            });
            const enrichedSubs = await Promise.all(enrichedSubsPromises);
            setDisplaySubscriptions(enrichedSubs);
        } catch (err) {
            console.error("Failed to load and enrich subscriptions:", err);
        } finally {
            setDisplaySubsLoading(false);
        }
    }, [userEmail, userExists, setUserSubscriptions]);

    useEffect(() => {
        loadAndEnrichSubscriptions();
    }, [userEmail, userExists, loadAndEnrichSubscriptions]);

    useEffect(() => {
        setUserSubscriptions(displaySubscriptions);
    }, [displaySubscriptions, setUserSubscriptions]);


    useEffect(() => {
        if (!direction || allAirports.length === 0) {
            setPossibleRoutes([]);
            setSelectedRoutes([]);
            return;
        }

        const routes = [];
        if (direction === 'TN-DE') {
            tunisianAirports.forEach(tnA => {
                germanAirports.forEach(deA => {
                    routes.push(`${tnA.code}-${deA.code}`);
                });
            });
        } else if (direction === 'DE-TN') {
            germanAirports.forEach(deA => {
                tunisianAirports.forEach(tnA => {
                    routes.push(`${deA.code}-${tnA.code}`);
                });
            });
        }
        setPossibleRoutes(routes);
        setSelectedRoutes([]);
    }, [direction, tunisianAirports, germanAirports, allAirports]);

    const handleDirectionChange = (e) => {
        setDirection(e.target.value);
        setFormErrors(prev => ({ ...prev, direction: null }));
    };

    const handleRouteToggle = (route) => {
        setSelectedRoutes(prev => {
            const newSelectedRoutes = prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route];
            if (newSelectedRoutes.length > 0) {
                setFormErrors(prev => ({ ...prev, selectedRoutes: null }));
            }
            return newSelectedRoutes;
        });
    };

    const handleAirlineToggle = (airlineCode) => {
        setSelectedAirlineCodes(prev =>
            prev.includes(airlineCode)
                ? prev.filter(code => code !== airlineCode)
                : [...prev, airlineCode]
        );
    };

    const validateForm = useCallback(() => {
        const errors = {};
        if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
            errors.userEmail = "Please enter a valid email address.";
        }
        if (!userExists) {
            errors.userExists = "Please save your email address first to proceed with search.";
        }
        if (!direction) {
            errors.direction = "Please select a travel direction.";
        }
        if (selectedRoutes.length === 0) {
            errors.selectedRoutes = "Please select at least one route.";
        }
        if (!startDate || !endDate) {
            errors.dateRange = "Please select both a start and end date.";
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isBefore(endDate, startDate)) {
                errors.dateRange = "End date cannot be before start date.";
            }
            if (isBefore(startDate, today)) {
                errors.dateRange = "Start date cannot be before today's date.";
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [userEmail, userExists, direction, selectedRoutes, startDate, endDate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        // Removed setFormSubmitMessage(null); as formSubmitMessage state is removed

        if (!validateForm()) {
            // No general message here, just rely on inline errors
            return;
        }

        setLoading(true);
        setError(null);
        setSearchResults(null);

        try {
            const departureAirportCodes = selectedRoutes.map(route => route.split('-')[0]);
            const arrivalAirportCodes = selectedRoutes.map(route => route.split('-')[1]);

            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            const flights = await searchFlights({
                departureAirportCodes,
                arrivalAirportCodes,
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                airlineCodes: selectedAirlineCodes
            });

            const groupedResults = flights.reduce((acc, flight) => {
                const route = `${flight.departureAirportCode}-${flight.arrivalAirportCode}`;
                if (!acc[route]) {
                    acc[route] = [];
                }
                acc[route].push(flight);
                return acc;
            }, {});

            setSearchResults(groupedResults);
            // No general success message after search, data display is enough confirmation

        } catch (err) {
            setError("Failed to fetch flights. " + err.message);
            // setFormSubmitMessage({ type: 'error', message: "Failed to load flights. " + err.message }); // Removed
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubscription = async (subId, event) => {
        event.stopPropagation();
        if (window.confirm("Are you sure you want to delete this subscription?")) {
            try {
                await deleteSubscription(subId);
                setDisplaySubscriptions(prevSubs => prevSubs.filter(sub => sub.id !== subId));
                setUserActionError("Subscription deleted successfully!");
            } catch (err) {
                setUserActionError("Failed to delete subscription: " + err.message);
                console.error("Delete subscription error:", err);
            }
        }
    };

    const handleSubscriptionClick = useCallback(async (subscription) => {
        setLoading(true);
        setError(null);
        try {
            let flightDetails = subscription;
            if (!flightDetails.price || !flightDetails.airlineCode || !flightDetails.departureAirportCode) {
                const fetchedDetails = await fetchFlightById(subscription.flightId);
                flightDetails = { ...subscription, ...fetchedDetails };
            }
            setSelectedFlightFromSubscription(flightDetails);
            setIsModalOpen(true);
        } catch (err) {
            console.error("Error fetching flight details for subscription:", err);
            setError("Failed to load flight details for this subscription.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSaveUser = async () => {
        setUserActionError(null);
        if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
            setUserActionError("Please enter a valid email address.");
            return;
        }

        try {
            await createUser({
                email: userEmail,
                enableNotificationsSetting: enableEmailNotifications
            });
            setUserExists(true);
            setUserActionError("Your email has been saved successfully!");
            loadAndEnrichSubscriptions();
        } catch (err) {
            console.error("Error saving user:", err);
            setUserActionError(err.message || "Failed to save user. Please try again.");
            if (err.message && err.message.includes("already registered")) {
                setUserExists(true);
                setUserActionError("This email is already registered. Data loaded.");
                try {
                    const user = await fetchUserByEmail(userEmail);
                    if (user) setEnableEmailNotifications(user.enableNotificationsSetting);
                } catch (fetchErr) {
                    console.error("Failed to fetch user settings after duplicate error:", fetchErr);
                }
            }
        }
    };


    const loadingMessage = loading && searchResults === null && error === null && (
        <div className="info-message">Searching flights...</div>
    );
    const errorMessage = error && (!allAirports.length || !allAirlines.length) && (
        <div className="info-message error-message">Error: {error}</div>
    );
    const noFlightsMessage = searchResults && Object.keys(searchResults).length === 0 && !loading && (
        <div className="info-message">No flights found for your selected criteria.</div>
    );


    return (
        <div className="flight-search-container">
            <h1>Welcome to Tunisia Flights Helper !</h1>

            <form onSubmit={handleSubmit} className="form-grid">
                <fieldset className="email-section full-span">
                    <legend>0. Flight Price Alerts Subscription</legend>
                    <div className="input-group">
                        <label htmlFor="userEmail">Email:</label>
                        <input
                            type="email"
                            id="userEmail"
                            value={userEmail}
                            onChange={(e) => {
                                setUserEmail(e.target.value);
                                setUserExists(false);
                                setUserActionError(null);
                                setFormErrors(prev => ({ ...prev, userEmail: null }));
                            }}
                            placeholder="Enter your email"
                            className="text-input"
                            required
                            disabled={userCheckLoading}
                        />
                    </div>
                    <p className="email-clarification-text">
                        We'll use this email to save your preferences and send price alerts.
                    </p>
                    {formErrors.userEmail && <p className="error-message-inline">{formErrors.userEmail}</p>}


                    {userCheckLoading && <p className="loading-spinner">Checking user status...</p>}
                    {userActionError && <p className={`feedback-message ${userActionError.includes('success') ? 'success-message-inline' : 'error-message-inline'}`}>{userActionError}</p>}

                    {!userCheckLoading && !userExists && userEmail && userEmail.includes('@') && userEmail.includes('.') && (
                        <div className="save-user-section">
                            <button type="button" className="save-user-button" onClick={handleSaveUser}>
                                Save My Email
                            </button>
                            <p className="save-user-info-text">Save your email to enable subscriptions and notifications.</p>
                        </div>
                    )}


                    {userExists && !userCheckLoading && (
                        <>
                            <div className="notification-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={enableEmailNotifications}
                                        onChange={(e) => setEnableEmailNotifications(e.target.checked)}
                                    /> Enable Email Notifications
                                </label>
                            </div>

                            {displaySubsLoading && <p className="loading-spinner">Loading your subscriptions...</p>}
                            {subscriptionsError && !displaySubsLoading && <p className="error-text-small">{subscriptionsError}</p>}

                            <div className="user-subscriptions-list">
                                <h3 className="subscriptions-header">
                                    Your Subscribed Flights:
                                    <button type="button" onClick={loadAndEnrichSubscriptions} className="refresh-button" title="Refresh Subscriptions">
                                        ↻
                                    </button>
                                </h3>
                                {displaySubscriptions.length > 0 ? (
                                    <ul>
                                        {displaySubscriptions.map(sub => (
                                            <li key={sub.id} onClick={() => sub.flightDepartureDate && handleSubscriptionClick(sub)}>
                                                <span className="subscription-status-icon">
                                                    {sub.isActive ? '🟢' : '⚫'}
                                                </span>
                                                <span className="subscription-details">
                                                    {getAirportDisplayName(sub.flightDepartureAirportCode)} → {getAirportDisplayName(sub.flightArrivalAirportCode)}
                                                    {sub.flightDepartureDate && (
                                                        <span className="sub-date">
                                                            on {format(new Date(sub.flightDepartureDate), 'dd MMM')}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="sub-price">Target: {sub.targetPrice}€</span>
                                                <button
                                                    type="button"
                                                    className="delete-sub-button"
                                                    onClick={(event) => handleDeleteSubscription(sub.id, event)}
                                                    title="Delete Subscription"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-subscriptions-message">You have no active flight price subscriptions.</p>
                                )}
                            </div>
                        </>
                    )}
                    {formErrors.userExists && <p className="error-message-inline">{formErrors.userExists}</p>}
                </fieldset>

                <fieldset className="travel-direction-section full-span">
                    <legend>1. Select Travel Direction</legend>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                value="TN-DE"
                                checked={direction === 'TN-DE'}
                                onChange={handleDirectionChange}
                            /> Tunisia to Germany
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="DE-TN"
                                checked={direction === 'DE-TN'}
                                onChange={handleDirectionChange}
                            /> Germany to Tunisia
                        </label>
                    </div>
                    {formErrors.direction && <p className="error-message-inline">{formErrors.direction}</p>}
                </fieldset>

                {direction && possibleRoutes.length > 0 && (
                    <fieldset className="route-selection-section full-span">
                        <legend>2. Select Routes (Multi-select)</legend>
                        <div className="button-group">
                            {possibleRoutes.map(route => {
                                const [depCode, arrCode] = route.split('-');
                                const depName = getAirportDisplayName(depCode);
                                const arrName = getAirportDisplayName(arrCode);
                                return (
                                    <button
                                        key={route}
                                        type="button"
                                        onClick={() => handleRouteToggle(route)}
                                        className={`route-button ${selectedRoutes.includes(route) ? 'selected' : ''}`}
                                    >
                                        {depName} → {arrName}
                                    </button>
                                );
                            })}
                        </div>
                        {formErrors.selectedRoutes && <p className="error-message-inline">{formErrors.selectedRoutes}</p>}
                    </fieldset>
                )}

                <fieldset className="date-range-section full-span">
                    <legend>3. Select Date Range</legend>
                    <div className="date-picker-group">
                        <div>
                            <label htmlFor="startDate">Start Date:</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => {
                                    setStartDate(date);
                                    setFormErrors(prev => ({ ...prev, dateRange: null }));
                                }}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                minDate={new Date()}
                                dateFormat="yyyy-MM-dd"
                                className="custom-datepicker-input"
                                popperPlacement="bottom-start"
                                showPopperArrow={false}
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate">End Date:</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => {
                                    setEndDate(date);
                                    setFormErrors(prev => ({ ...prev, dateRange: null }));
                                }}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                dateFormat="yyyy-MM-dd"
                                className="custom-datepicker-input"
                                popperPlacement="bottom-end"
                                showPopperArrow={false}
                            />
                        </div>
                    </div>
                    {formErrors.dateRange && <p className="error-message-inline">{formErrors.dateRange}</p>}
                </fieldset>

                <fieldset className="airline-selection-section full-span">
                    <legend>4. Select Preferred Airlines (Multi-select)</legend>
                    <div className="button-group">
                        {allAirlines.filter(a => a.code === 'BJ' || a.code === 'TU').map(airline => (
                            <button
                                key={airline.code}
                                type="button"
                                onClick={() => handleAirlineToggle(airline.code)}
                                className={`airline-button ${selectedAirlineCodes.includes(airline.code) ? 'selected' : ''}`}
                            >
                                {capitalizeWords(airline.name)} ({airline.code})
                            </button>
                        ))}
                    </div>
                </fieldset>
            </form>

            <button type="submit" className="submit-button" onClick={handleSubmit} disabled={!userExists}>
                Show Flights
            </button>
            {/* Removed the general form submission message here */}

            {loadingMessage}
            {errorMessage}
            {noFlightsMessage}

            {searchResults && Object.keys(searchResults).length > 0 ? (
                <FlightResultsDisplay
                    groupedFlights={searchResults}
                    airlines={allAirlines}
                    userEmail={userEmail}
                    userSubscriptions={userSubscriptions}
                    setUserSubscriptions={setUserSubscriptions}
                    enableEmailNotifications={enableEmailNotifications}
                />
            ) : null}

            {isModalOpen && selectedFlightFromSubscription && (
                <FlightDetailModal
                    flight={selectedFlightFromSubscription}
                    onClose={() => setIsModalOpen(false)}
                    airlines={allAirlines}
                    userEmail={userEmail}
                    userSubscriptions={userSubscriptions}
                    setUserSubscriptions={setUserSubscriptions}
                    enableEmailNotifications={enableEmailNotifications}
                />
            )}
        </div>
    );
};

export default FlightSearchForm;