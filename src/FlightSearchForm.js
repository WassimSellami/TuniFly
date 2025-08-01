// src/FlightSearchForm.js
import React, { useState, useEffect } from 'react';
import { fetchAirlines, fetchAirports, searchFlights } from './api';
import { isBefore, addDays, format } from 'date-fns';
import FlightResultsDisplay from './FlightResultsDisplay';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDatePicker.css';

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

// Accept userEmail and setUserEmail from App.js
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

    useEffect(() => {
        if (!direction) {
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
    }, [direction, tunisianAirports, germanAirports]);

    const handleDirectionChange = (e) => {
        setDirection(e.target.value);
    };

    const handleRouteToggle = (route) => {
        setSelectedRoutes(prev =>
            prev.includes(route)
                ? prev.filter(r => r !== route)
                : [...prev, route]
        );
    };

    const handleAirlineToggle = (airlineCode) => {
        setSelectedAirlineCodes(prev =>
            prev.includes(airlineCode)
                ? prev.filter(code => code !== airlineCode)
                : [...prev, airlineCode]
        );
    };

    const validateForm = () => {
        if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
            alert("Please enter a valid email address to proceed.");
            return false;
        }
        if (!direction) {
            alert("Please select a travel direction.");
            return false;
        }
        if (selectedRoutes.length === 0) {
            alert("Please select at least one route.");
            return false;
        }
        if (!startDate || !endDate) {
            alert("Please select both a start and end date.");
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isBefore(endDate, startDate)) {
            alert("End date cannot be before start date.");
            return false;
        }
        if (isBefore(startDate, today)) {
            alert("Start date cannot be before today's date.");
            return false;
        }
        return true;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
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

        } catch (err) {
            setError("Failed to fetch flights. " + err.message);
        } finally {
            setLoading(false);
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
                    <legend>0. Your Email</legend>
                    <div className="input-group">
                        <label htmlFor="userEmail">Email:</label>
                        <input
                            type="email"
                            id="userEmail"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="text-input"
                            required
                        />
                    </div>
                    {/* --- NEW CLARIFICATION TEXT --- */}
                    <p className="email-clarification-text">We'll use this email to save your preferences and send price alerts.</p>
                    {subscriptionsLoading && <p className="loading-spinner">Loading your subscriptions...</p>}
                    {subscriptionsError && <p className="error-text-small">{subscriptionsError}</p>}
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
                </fieldset>

                {direction && possibleRoutes.length > 0 && (
                    <fieldset className="route-selection-section full-span">
                        <legend>2. Select Routes (Multi-select)</legend>
                        <div className="button-group">
                            {possibleRoutes.map(route => (
                                <button
                                    key={route}
                                    type="button"
                                    onClick={() => handleRouteToggle(route)}
                                    className={`route-button ${selectedRoutes.includes(route) ? 'selected' : ''}`}
                                >
                                    {route.replace('-', ' -> ')}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                <fieldset className="date-range-section full-span">
                    <legend>3. Select Date Range</legend>
                    <div className="date-picker-group">
                        <div>
                            <label htmlFor="startDate">Start Date:</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
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
                                onChange={(date) => setEndDate(date)}
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
                                {airline.name} ({airline.code})
                            </button>
                        ))}
                    </div>
                </fieldset>
            </form>

            <button type="submit" className="submit-button" onClick={handleSubmit}>
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
                />
            ) : null}
        </div>
    );
};

export default FlightSearchForm;