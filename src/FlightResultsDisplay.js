import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import FlightDetailModal from './FlightDetailModal';
import { fetchMinMaxPrice, fetchAirports } from './api';
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
import { format as dateFormatFns, parseISO } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const FlightResultsDisplay = ({ groupedFlights, airlines, userEmail, userSubscriptions, setUserSubscriptions, enableEmailNotifications }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [flightMinMaxHistory, setFlightMinMaxHistory] = useState({});
    const [minMaxLoading, setMinMaxLoading] = useState(true);
    const [allAirports, setAllAirports] = useState([]);

    const chartTitleColor = '#FFFFFF';
    const axisTitleColor = '#CCCCCC';
    const axisTickColor = '#FFFFFF';
    const gridLineColor = 'rgba(255, 255, 255, 0.15)';

    const barBackgroundColor = 'rgba(52, 152, 219, 0.9)';
    const barBorderColor = 'rgba(41, 128, 185, 1)';
    const minLabelColor = 'rgba(144, 238, 144, 1)';
    const maxLabelColor = 'rgba(255, 105, 97, 1)';
    const labelBackgroundColor = 'rgba(30, 30, 30, 0.8)';

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
        const loadAirports = async () => {
            try {
                const airports = await fetchAirports();
                setAllAirports(airports);
            } catch (err) {
                console.error("Failed to load airports for chart titles:", err);
            }
        };
        loadAirports();
    }, []);

    useEffect(() => {
        const fetchAllFlightMinMaxHistory = async () => {
            setMinMaxLoading(true);
            const newFlightMinMaxHistory = {};
            const uniqueFlightIds = new Set();

            Object.values(groupedFlights).forEach(flightsInRoute => {
                flightsInRoute.forEach(flight => {
                    uniqueFlightIds.add(flight.id);
                });
            });

            const promises = Array.from(uniqueFlightIds).map(async (id) => {
                const data = await fetchMinMaxPrice(id);
                newFlightMinMaxHistory[id] = data;
            });

            await Promise.all(promises);
            setFlightMinMaxHistory(newFlightMinMaxHistory);
            setMinMaxLoading(false);
        };

        if (Object.keys(groupedFlights).length > 0 && allAirports.length > 0) {
            fetchAllFlightMinMaxHistory();
        } else if (Object.keys(groupedFlights).length === 0) {
            setFlightMinMaxHistory({});
            setMinMaxLoading(false);
        }
    }, [groupedFlights, allAirports]);

    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="flight-results-container">
                <h2>
                    Flight Price Trends
                    <span className="click-details-text"> (Click a bar to show details)</span>
                </h2>
                {minMaxLoading && <p className="loading-spinner">Loading historical price ranges...</p>}
                <div className="results-grid">
                    {Object.keys(groupedFlights).sort().map(route => {
                        const flightsForRoute = groupedFlights[route];

                        const sortedFlights = [...flightsForRoute].sort((a, b) =>
                            new Date(a.departureDate) - new Date(b.departureDate)
                        );

                        const labels = sortedFlights.map(f => f.departureDate.split('T')[0]);
                        const prices = sortedFlights.map(f => f.priceEur);

                        const [depCode, arrCode] = route.split('-');
                        const depName = getAirportDisplayName(depCode);
                        const arrName = getAirportDisplayName(arrCode);
                        const chartRouteTitle = `${depName} → ${arrName}`;

                        const data = {
                            labels: labels,
                            datasets: [
                                {
                                    type: 'bar',
                                    label: 'Current Price (EUR)',
                                    data: prices,
                                    backgroundColor: barBackgroundColor,
                                    borderColor: barBorderColor,
                                    borderWidth: 1,
                                    maxBarThickness: 100,
                                    order: 1,
                                    datalabels: {
                                        display: true,
                                        labels: {
                                            currentPrice: {
                                                align: 'center',
                                                anchor: 'center',
                                                color: 'white',
                                                font: {
                                                    weight: 'bold',
                                                    size: 18
                                                },
                                                formatter: function (value, context) {
                                                    const flight = sortedFlights[context.dataIndex];
                                                    const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                                    return `${value.toFixed(2)}€ ${isSubscribed ? '★' : ''}`;
                                                }
                                            },
                                            minPrice: {
                                                align: 'center',
                                                anchor: 'start',
                                                offset: -4,
                                                color: minLabelColor,
                                                font: {
                                                    weight: 'bold',
                                                    size: 14
                                                },
                                                formatter: function (value, context) {
                                                    const flight = sortedFlights[context.dataIndex];
                                                    const flightHistory = flightMinMaxHistory[flight.id];
                                                    return flightHistory && flightHistory.minPrice !== null
                                                        ? `Min: ${flightHistory.minPrice.toFixed(2)}`
                                                        : '';
                                                },
                                                padding: { top: 2, bottom: 2, left: 4, right: 4 },
                                                backgroundColor: labelBackgroundColor,
                                                borderRadius: 4,
                                                clip: false,
                                            },
                                            maxPrice: {
                                                align: 'center',
                                                anchor: 'end',
                                                offset: -4,
                                                color: maxLabelColor,
                                                font: {
                                                    weight: 'bold',
                                                    size: 14
                                                },
                                                formatter: function (value, context) {
                                                    const flight = sortedFlights[context.dataIndex];
                                                    const flightHistory = flightMinMaxHistory[flight.id];
                                                    return flightHistory && flightHistory.maxPrice !== null
                                                        ? `Max: ${flightHistory.maxPrice.toFixed(2)}`
                                                        : '';
                                                },
                                                padding: { top: 2, bottom: 2, left: 4, right: 4 },
                                                backgroundColor: labelBackgroundColor,
                                                borderRadius: 4,
                                                clip: false,
                                            }
                                        }
                                    }
                                }
                            ],
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            onClick: (event, elements) => {
                                if (elements.length > 0) {
                                    const clickedElement = elements[0];
                                    if (clickedElement.datasetIndex === 0) {
                                        const dataIndex = clickedElement.index;
                                        const clickedFlight = sortedFlights[dataIndex];
                                        if (clickedFlight) {
                                            handleFlightClick(clickedFlight);
                                        }
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Prices for Route: ${chartRouteTitle}`,
                                    color: chartTitleColor,
                                    font: {
                                        size: 20,
                                        weight: 'bold'
                                    },
                                    padding: {
                                        top: 0,
                                        bottom: 50
                                    }
                                },
                                legend: {
                                    display: false,
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            const flight = sortedFlights[context.dataIndex];
                                            const flightHistory = flightMinMaxHistory[flight.id];
                                            const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                            let tooltipText = `Price: ${context.parsed.y.toFixed(2)}€`;
                                            if (isSubscribed) tooltipText += ' ★';
                                            if (flightHistory && flightHistory.minPrice !== null) {
                                                tooltipText += `\nHistorical Min: ${flightHistory.minPrice.toFixed(2)}€`;
                                            }
                                            if (flightHistory && flightHistory.maxPrice !== null) {
                                                tooltipText += `\nHistorical Max: ${flightHistory.maxPrice.toFixed(2)}€`;
                                            }
                                            return tooltipText;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    type: 'category',
                                    title: {
                                        display: true,
                                        text: 'Departure Date',
                                        color: axisTitleColor,
                                        font: { size: 14 }
                                    },
                                    ticks: {
                                        color: axisTickColor,
                                        font: { size: 13 },
                                        callback: function (value, index, ticks) {
                                            const dateString = this.getLabelForValue(value);
                                            const date = parseISO(dateString);
                                            if (isNaN(date.getTime())) {
                                                return '';
                                            }
                                            return dateFormatFns(date, 'dd MMM');
                                        }
                                    },
                                    grid: {
                                        color: gridLineColor,
                                    }
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Price (EUR)',
                                        color: axisTitleColor,
                                        font: { size: 14 }
                                    },
                                    ticks: {
                                        color: axisTickColor,
                                        font: { size: 13 }
                                    },
                                    grid: {
                                        color: gridLineColor,
                                    },
                                    beginAtZero: true,
                                },
                            },
                        };

                        return (
                            <div key={route} className="chart-card">
                                <div style={{ height: '400px', cursor: 'pointer' }}>
                                    {!minMaxLoading && sortedFlights.length > 0 ? (
                                        <Bar data={data} options={options} />
                                    ) : (
                                        minMaxLoading ? (
                                            <p className="loading-spinner">Loading chart data...</p>
                                        ) : (
                                            <p className="info-message">No flight data to display for this route yet.</p>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <FlightDetailModal
                    flight={selectedFlight}
                    onClose={() => setIsModalOpen(false)}
                    airlines={airlines}
                    userEmail={userEmail}
                    userSubscriptions={userSubscriptions}
                    setUserSubscriptions={setUserSubscriptions}
                    enableEmailNotifications={enableEmailNotifications}
                />
            )}
        </>
    );
};

export default FlightResultsDisplay;