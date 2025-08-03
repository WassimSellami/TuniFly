import React, { useState, useEffect, useCallback } from 'react';
import { fetchAirlines, fetchAirports, searchFlights, deleteSubscription, updateUserEmailNotificationSetting, fetchFlightById, fetchSubscriptionsByEmail, fetchUserByEmail, createUser } from './api';
import { isBefore, addDays, format, differenceInDays, addMonths, startOfDay } from 'date-fns';
import FlightResultsDisplay from './FlightResultsDisplay';
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDatePicker.css';
import FlightDetailModal from './FlightDetailModal';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
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
    const [isTunisiaDeparture, setIsTunisiaDeparture] = useState(true);
    const [tunisianAirports, setTunisianAirports] = useState([]);
    const [germanAirports, setGermanAirports] = useState([]);
    const [selectedDepartureAirportCodes, setSelectedDepartureAirportCodes] = useState([]);
    const [selectedArrivalAirportCodes, setSelectedArrivalAirportCodes] = useState([]);
    const minSelectableDate = startOfDay(new Date());
    const maxSelectableDate = addMonths(minSelectableDate, 3);
    const initialStartDays = 0;
    const initialEndDays = differenceInDays(addMonths(minSelectableDate, 1), minSelectableDate);
    const [dateRangeSliderValues, setDateRangeSliderValues] = useState([initialStartDays, initialEndDays]);
    const [startDate, setStartDate] = useState(addDays(minSelectableDate, initialStartDays));
    const [endDate, setEndDate] = useState(addDays(minSelectableDate, initialEndDays));
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

    const handleDepartureAirportToggle = (airportCode) => {
        setSelectedDepartureAirportCodes(prev => {
            const newCodes = prev.includes(airportCode)
                ? prev.filter(code => code !== airportCode)
                : [...prev, airportCode];
            if (newCodes.length > 0) {
                setFormErrors(prev => ({ ...prev, selectedDepartureAirportCodes: null }));
            }
            return newCodes;
        });
    };

    const handleArrivalAirportToggle = (airportCode) => {
        setSelectedArrivalAirportCodes(prev => {
            const newCodes = prev.includes(airportCode)
                ? prev.filter(code => code !== airportCode)
                : [...prev, airportCode];
            if (newCodes.length > 0) {
                setFormErrors(prev => ({ ...prev, selectedArrivalAirportCodes: null }));
            }
            return newCodes;
        });
    };

    const handleDirectionSwitch = () => {
        setIsTunisiaDeparture(prev => !prev);
        setSelectedDepartureAirportCodes([]);
        setSelectedArrivalAirportCodes([]);
        setFormErrors(prev => ({ ...prev, selectedDepartureAirportCodes: null, selectedArrivalAirportCodes: null }));
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
        if (selectedDepartureAirportCodes.length === 0) {
            errors.selectedDepartureAirportCodes = "Please select at least one departure airport.";
        }
        if (selectedArrivalAirportCodes.length === 0) {
            errors.selectedArrivalAirportCodes = "Please select at least one arrival airport.";
        }
        if (!startDate || !endDate) {
            errors.dateRange = "Please select a date range.";
        } else {
            const today = startOfDay(new Date());
            if (isBefore(endDate, startDate)) {
                errors.dateRange = "End date cannot be before start date.";
            }
            if (isBefore(startDate, today)) {
                errors.dateRange = "Start date cannot be before today's date.";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [userEmail, userExists, selectedDepartureAirportCodes, selectedArrivalAirportCodes, startDate, endDate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setLoading(true);
        setError(null);
        setSearchResults(null);
        try {
            const flights = await searchFlights({
                departureAirportCodes: selectedDepartureAirportCodes,
                arrivalAirportCodes: selectedArrivalAirportCodes,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
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
        } catch (err) {
            setError("Failed to fetch flights. " + err.message);
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

    const onSliderChange = useCallback((values) => {
        const [startDays, endDays] = values;
        const newStartDate = addDays(minSelectableDate, startDays);
        const newEndDate = addDays(minSelectableDate, endDays);
        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setDateRangeSliderValues(values);
        setFormErrors(prev => ({ ...prev, dateRange: null }));
    }, [minSelectableDate]);

    const generateMarks = useCallback(() => {
        const marks = {};
        const totalDays = differenceInDays(maxSelectableDate, minSelectableDate);
        const numIntervals = 4;
        const intervalDays = Math.ceil(totalDays / numIntervals);
        for (let i = 0; i <= totalDays; i += intervalDays) {
            const date = addDays(minSelectableDate, i);
            marks[i] = format(date, 'dd MMM yyyy');
        }
        if (!(totalDays in marks)) {
            marks[totalDays] = format(maxSelectableDate, 'dd MMM yyyy');
        }
        return marks;
    }, [minSelectableDate, maxSelectableDate]);

    const loadingMessage = loading && searchResults === null && error === null && (
        <div className="info-message">Searching flights...</div>
    );
    const errorMessage = error && (!allAirports.length || !allAirlines.length) && (
        <div className="info-message">Error: {error}</div>
    );
    const noFlightsMessage = searchResults && Object.keys(searchResults).length === 0 && !loading && (
        <div className="info-message">No flights found for your selected criteria.</div>
    );

    return (
        <div className="flight-search-container">
            <h1>Welcome to Tunisia Flights Tracker !</h1>
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
                            <p className="subscription-info-text">
                                To add a new subscription, first search for flights, then click on a result to set a price alert.
                            </p>
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
                <fieldset className="airport-selection-section full-span">
                    <legend>1. Select Departure & Arrival Airports</legend>
                    <div className="airport-selection-grid">
                        <div className="departure-airports-column">
                            <h3>Departure: {isTunisiaDeparture ? 'Tunisia' : 'Germany'}</h3>
                            <div className="button-group-vertical">
                                {(isTunisiaDeparture ? tunisianAirports : germanAirports).map(airport => (
                                    <button
                                        key={airport.code}
                                        type="button"
                                        onClick={() => handleDepartureAirportToggle(airport.code)}
                                        className={`airport-button ${selectedDepartureAirportCodes.includes(airport.code) ? 'selected' : ''}`}
                                    >
                                        {getAirportDisplayName(airport.code)}
                                    </button>
                                ))}
                            </div>
                            {formErrors.selectedDepartureAirportCodes && <p className="error-message-inline">{formErrors.selectedDepartureAirportCodes}</p>}
                        </div>
                        <div className="direction-switch-column">
                            <button
                                type="button"
                                className="direction-switch-button"
                                onClick={handleDirectionSwitch}
                                title="Switch Direction"
                            >
                                ⇄
                            </button>
                        </div>
                        <div className="arrival-airports-column">
                            <h3>Arrival: {isTunisiaDeparture ? 'Germany' : 'Tunisia'}</h3>
                            <div className="button-group-vertical">
                                {(isTunisiaDeparture ? germanAirports : tunisianAirports).map(airport => (
                                    <button
                                        key={airport.code}
                                        type="button"
                                        onClick={() => handleArrivalAirportToggle(airport.code)}
                                        className={`airport-button ${selectedArrivalAirportCodes.includes(airport.code) ? 'selected' : ''}`}
                                    >
                                        {getAirportDisplayName(airport.code)}
                                    </button>
                                ))}
                            </div>
                            {formErrors.selectedArrivalAirportCodes && <p className="error-message-inline">{formErrors.selectedArrivalAirportCodes}</p>}
                        </div>
                    </div>
                </fieldset>
                <fieldset className="date-range-section full-span">
                    <legend>3. Select Date Range</legend>
                    <div className="date-range-slider-container">
                        <div className="selected-date-display">
                            <span>Start: {format(startDate, 'dd MMM yyyy')}</span>
                            <span>End: {format(endDate, 'dd MMM yyyy')}</span>
                        </div>
                        <Slider
                            range
                            min={0}
                            max={differenceInDays(maxSelectableDate, minSelectableDate)}
                            value={dateRangeSliderValues}
                            onChange={onSliderChange}
                            marks={generateMarks()}
                            step={1}
                            trackStyle={[{ backgroundColor: 'var(--primary-button-bg)' }]}
                            handleStyle={[
                                { backgroundColor: 'var(--primary-button-bg)', borderColor: 'var(--primary-button-bg)' },
                                { backgroundColor: 'var(--primary-button-bg)', borderColor: 'var(--primary-button-bg)' }
                            ]}
                            railStyle={{ backgroundColor: 'var(--border-color)' }}
                            dotStyle={{ borderColor: 'var(--border-color)' }}
                        />
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