// src/FlightDetailModal.js
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchPriceHistory, createSubscription } from './api';
import './FlightDetailModal.css';

// Import format from date-fns
import { format as dateFormatFns } from 'date-fns';

// Chart.js imports and registrations
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const FlightDetailModal = ({ flight, onClose, airlines }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [targetPrice, setTargetPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    useEffect(() => {
        const loadHistory = async () => {
            if (!flight || !flight.id) {
                setError("Invalid flight data provided.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                setHistory([]);
                const historyData = await fetchPriceHistory(flight.id);
                setHistory(historyData);
            } catch (err) {
                console.error("Error in loadHistory:", err);
                setError("Could not load price history. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [flight]);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!targetPrice || isNaN(targetPrice) || targetPrice <= 0) {
            setSubmitMessage("Please enter a valid target price.");
            return;
        }

        setSubmitting(true);
        setSubmitMessage('');

        try {
            const subscriptionPayload = {
                flight_id: flight.id,
                target_price: parseFloat(targetPrice),
            };
            const result = await createSubscription(subscriptionPayload);
            setSubmitMessage(result.message || "Subscription successful!");
            setTimeout(onClose, 2000);
        } catch (err) {
            setSubmitMessage(err.message || "Subscription failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!flight) {
        return null;
    }

    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const filteredHistory = sortedHistory.reduce((acc, currentItem, index) => {
        if (index === 0) {
            acc.push(currentItem);
            return acc;
        }
        const lastAddedItem = acc[acc.length - 1];
        if (currentItem.price !== lastAddedItem.price || index === sortedHistory.length - 1) {
            acc.push(currentItem);
        }
        return acc;
    }, []);

    const chartData = filteredHistory.map(h => ({
        x: new Date(h.timestamp),
        y: h.price
    }));

    const airline = airlines.find(a => a.code === flight.airlineCode);
    const airlineName = airline ? airline.name : flight.airlineCode;

    // --- CRITICAL CHANGE: Format departure date using date-fns format ---
    const departureDateFormatted = dateFormatFns(new Date(flight.departureDate), 'dd MMM yyyy');


    const data = {
        datasets: [{
            label: 'Price History',
            data: chartData,
            fill: true,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointRadius: 5,
            pointHoverRadius: 7,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: false },
            legend: { display: false },
            datalabels: {
                display: true,
                align: 'top',
                offset: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: 4,
                color: 'white',
                font: {
                    weight: 'bold',
                    size: 14,
                },
                padding: {
                    top: 4, bottom: 4, left: 6, right: 6
                },
                formatter: function (value, context) {
                    return value.y;
                }
            },
            tooltip: {
                callbacks: {
                    title: function (context) {
                        return context[0].label;
                    },
                    label: function (context) {
                        return `Price: ${context.parsed.y} EUR`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    tooltipFormat: 'MMM d, yyyy, h:mm a',
                    unit: 'hour',
                    displayFormats: {
                        millisecond: 'h:mm:ss.SSS a',
                        second: 'h:mm:ss a',
                        minute: 'h:mm a',
                        hour: 'h a',
                        day: 'MMM d',
                        week: 'MMM d',
                        month: 'MMM yyyy',
                        quarter: 'qqq yyyy',
                        year: 'yyyy',
                    }
                },
                ticks: {
                    color: '#e0e0e0',
                    callback: function (value, index, ticks) {
                        const dataPointTimestamps = chartData.map(d => d.x.getTime());
                        const currentTickTimestamp = new Date(value).getTime();

                        if (dataPointTimestamps.includes(currentTickTimestamp)) {
                            const date = new Date(value);
                            return [
                                date.toLocaleDateString(),
                                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ];
                        }
                        return '';
                    }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: {
                    display: false,
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        },
        layout: {
            padding: {
                top: 30,
                left: 30,
                right: 30
            }
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>×</button>
                <h2>Price History for {flight.departureAirportCode} → {flight.arrivalAirportCode}</h2>
                <div className="flight-info">
                    <span><strong>Airline:</strong> {airlineName}</span>
                    <span><strong>Departure:</strong> {departureDateFormatted}</span>
                    <span><strong>Current Price:</strong> <span className="current-price">{flight.price}€</span></span>
                </div>

                <div className="modal-chart-container">
                    {loading && <p>Loading history...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && !error && history.length > 0 && (
                        chartData.length > 1 ? (
                            <Line key={flight.id} data={data} options={options} />
                        ) : (
                            <div className="single-point-message" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <p style={{ fontSize: '1.2em', marginBottom: '10px' }}>Only one price point recorded:</p>
                                <p style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--primary-button-bg)' }}>{chartData[0]?.y}€</p>
                                <p style={{ marginTop: '10px' }}>Check back later for a price history graph.</p>
                            </div>
                        )
                    )}
                    {!loading && !error && history.length === 0 && <p>No price history available for this flight.</p>}
                </div>

                <form className="subscription-form" onSubmit={handleSubscribe}>
                    <h3>Track this Flight</h3>
                    <p>Get notified when the price drops below your target.</p>
                    <div className="form-group">
                        <input
                            type="number"
                            placeholder="Enter Target Price (EUR)"
                            value={targetPrice}
                            onChange={e => setTargetPrice(e.target.value)}
                            className="target-price-input"
                            required
                        />
                        <button type="submit" className="subscribe-button" disabled={submitting}>
                            {submitting ? 'Subscribing...' : 'Subscribe'}
                        </button>
                    </div>
                    {submitMessage && <p className="submit-message">{submitMessage}</p>}
                </form>
            </div>
        </div>
    );
};

export default FlightDetailModal;