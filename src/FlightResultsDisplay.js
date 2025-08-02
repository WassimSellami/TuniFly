import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
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
import { format as dateFormatFns, parseISO } from 'date-fns'; // Ensure parseISO is imported

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

// Accept userEmail, userSubscriptions, setUserSubscriptions, and new enableEmailNotifications
const FlightResultsDisplay = ({ groupedFlights, airlines, userEmail, userSubscriptions, setUserSubscriptions, enableEmailNotifications }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);

    const chartTitleColor = '#FFFFFF';
    const axisTitleColor = '#CCCCCC';
    const axisTickColor = '#FFFFFF';
    const gridLineColor = 'rgba(255, 255, 255, 0.15)';

    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="flight-results-container">
                <h2>Available Flights: Click for more details</h2>
                <div className="results-grid">
                    {Object.keys(groupedFlights).sort().map(route => {
                        const flightsForRoute = groupedFlights[route];

                        const sortedFlights = [...flightsForRoute].sort((a, b) =>
                            new Date(a.departureDate) - new Date(b.departureDate)
                        );

                        const labels = sortedFlights.map(f => f.departureDate.split('T')[0]); // Use split to remove time if present, keeping date string
                        const prices = sortedFlights.map(f => f.price);

                        const data = {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Price',
                                    data: prices,
                                    backgroundColor: 'rgba(75, 192, 192, 0.9)',
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    borderWidth: 1,
                                    maxBarThickness: 100,
                                },
                            ],
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            onClick: (event, elements) => {
                                if (elements.length > 0) {
                                    const chartElement = elements[0];
                                    const dataIndex = chartElement.index;
                                    const clickedFlight = sortedFlights[dataIndex];
                                    if (clickedFlight) {
                                        handleFlightClick(clickedFlight);
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Prices for Route: ${route.replace('-', ' -> ')}`,
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
                                datalabels: {
                                    display: true,
                                    color: 'white',
                                    align: 'end',
                                    anchor: 'end',
                                    offset: 4,
                                    font: {
                                        weight: 'bold',
                                        size: 14
                                    },
                                    formatter: function (value, context) {
                                        // Find the flight in sortedFlights to get its ID
                                        const flightId = sortedFlights[context.dataIndex]?.id;
                                        // Check if any user subscription matches this flight ID
                                        const isSubscribed = userSubscriptions.some(sub => sub.flightId === flightId);
                                        return `${value} ${isSubscribed ? '★' : ''}`; // Add star for subscribed flights
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
                                            // Use parseISO to correctly parse ISO 8601 strings (like "YYYY-MM-DDTHH:MM:SS")
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
                                    <Bar data={data} options={options} />
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