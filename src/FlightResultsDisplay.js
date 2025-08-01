// src/FlightResultsDisplay.js
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

const FlightResultsDisplay = ({ groupedFlights, airlines }) => {
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
                <h2>Flight Price Trends</h2>
                <div className="results-grid">
                    {Object.keys(groupedFlights).sort().map(route => {
                        const flightsForRoute = groupedFlights[route];

                        const sortedFlights = [...flightsForRoute].sort((a, b) =>
                            new Date(a.departureDate) - new Date(b.departureDate)
                        );

                        const labels = sortedFlights.map(f => f.departureDate.split('T')[0]);
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
                                    // --- CRITICAL FIX: Changed 'clickedLight' to 'clickedFlight' ---
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
                                        return value;
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
                />
            )}
        </>
    );
};

export default FlightResultsDisplay;