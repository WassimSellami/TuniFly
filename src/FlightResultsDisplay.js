import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import FlightDetailModal from './FlightDetailModal';
import { fetchAirports } from './api';
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

import tuLogo from './assets/tu_logo.png';
import bjLogo from './assets/bj_logo.png';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const airlineIconSources = {
    TU: tuLogo,
    BJ: bjLogo,
};

const FlightResultsDisplay = ({ groupedFlights, airlines, userEmail, userSubscriptions, setUserSubscriptions, enableEmailNotifications }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [allAirports, setAllAirports] = useState([]);
    const [chartPages, setChartPages] = useState({});
    const [loadedIcons, setLoadedIcons] = useState({});

    const FLIGHTS_PER_PAGE = 9;
    const LOGO_WIDTH = 55;
    const LOGO_HEIGHT = 34;

    const chartTitleColor = '#FFFFFF';
    const axisTitleColor = '#CCCCCC';
    const axisTickColor = '#FFFFFF';
    const gridLineColor = 'rgba(255, 255, 255, 0.15)';

    const barBackgroundColor = 'rgba(52, 152, 219, 0.9)';
    const barBorderColor = 'rgba(41, 128, 185, 1)';
    const minLabelColor = 'rgba(144, 238, 144, 1)';
    const maxLabelColor = 'rgba(255, 105, 97, 1)';
    const labelBackgroundColor = 'rgba(30, 30, 30, 0.8)';

    useEffect(() => {
        const imageObjects = {};
        const promises = Object.entries(airlineIconSources).map(([code, src]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    imageObjects[code] = img;
                    resolve();
                };
                img.onerror = () => resolve();
            });
        });

        Promise.all(promises).then(() => {
            setLoadedIcons(imageObjects);
        });
    }, []);

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
        const initialPages = {};
        Object.keys(groupedFlights).forEach(route => {
            initialPages[route] = 0;
        });
        setChartPages(initialPages);
    }, [groupedFlights]);

    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setIsModalOpen(true);
    };

    const handlePageChange = (route, newPage) => {
        setChartPages(prevPages => ({
            ...prevPages,
            [route]: newPage,
        }));
    };

    return (
        <>
            <div className="flight-results-container">
                <h2>
                    Flight Price Trends
                    <span className="click-details-text"> (Click a bar to show details)</span>
                </h2>
                <div className="results-grid">
                    {Object.keys(groupedFlights).sort().map(route => {
                        const flightsForRoute = groupedFlights[route];
                        const sortedFlights = [...flightsForRoute].sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));

                        const currentPage = chartPages[route] || 0;
                        const totalPages = Math.ceil(sortedFlights.length / FLIGHTS_PER_PAGE);
                        const startIndex = currentPage * FLIGHTS_PER_PAGE;
                        const paginatedFlights = sortedFlights.slice(startIndex, startIndex + FLIGHTS_PER_PAGE);

                        const labels = paginatedFlights.map(f => f.departureDate.split('T')[0]);
                        const prices = paginatedFlights.map(f => f.priceEur);

                        const [depCode, arrCode] = route.split('-');
                        const depName = getAirportDisplayName(depCode);
                        const arrName = getAirportDisplayName(arrCode);
                        const chartRouteTitle = `${depName} → ${arrName}`;

                        const iconPlugin = {
                            id: 'customIcons',
                            afterDatasetsDraw(chart, args, options) {
                                const { ctx } = chart;
                                ctx.save();
                                const meta = chart.getDatasetMeta(0);
                                meta.data.forEach((element, index) => {
                                    const flight = paginatedFlights[index];
                                    if (!flight) return;

                                    const code = flight.airlineCode?.toUpperCase();
                                    const icon = loadedIcons[code];

                                    if (icon) {
                                        const x = element.x - (LOGO_WIDTH / 2);
                                        const y = element.y + 2;
                                        ctx.drawImage(icon, x, y, LOGO_WIDTH, LOGO_HEIGHT);
                                    }
                                });
                                ctx.restore();
                            }
                        };

                        const data = {
                            labels: labels,
                            datasets: [{
                                label: 'Current Price (EUR)',
                                data: prices,
                                backgroundColor: barBackgroundColor,
                                borderColor: barBorderColor,
                                borderWidth: 1,
                                maxBarThickness: 100,
                                datalabels: {
                                    display: true,
                                    labels: {
                                        currentPrice: {
                                            anchor: 'center',
                                            align: 'center',
                                            offset: 30,
                                            color: 'white',
                                            font: { weight: 'bold', size: 18 },
                                            formatter: (value, context) => {
                                                const flight = paginatedFlights[context.dataIndex];
                                                const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                                return `€${value.toFixed(2)} ${isSubscribed ? '★' : ''}`;
                                            }
                                        },
                                        minPrice: {
                                            align: 'center',
                                            anchor: 'start',
                                            offset: 4,
                                            color: minLabelColor,
                                            font: { weight: 'bold', size: 14 },
                                            formatter: (value, context) => {
                                                const flight = paginatedFlights[context.dataIndex];
                                                return flight.minPrice !== null ? `Min: ${flight.minPrice.toFixed(2)}` : '';
                                            },
                                            padding: { top: 2, bottom: 2, left: 4, right: 4 },
                                            backgroundColor: labelBackgroundColor,
                                            borderRadius: 4,
                                        },
                                        maxPrice: {
                                            align: 'center',
                                            anchor: 'end',
                                            offset: 4,
                                            color: maxLabelColor,
                                            font: { weight: 'bold', size: 14 },
                                            formatter: (value, context) => {
                                                const flight = paginatedFlights[context.dataIndex];
                                                return flight.maxPrice !== null ? `Max: ${flight.maxPrice.toFixed(2)}` : '';
                                            },
                                            padding: { top: 2, bottom: 2, left: 4, right: 4 },
                                            backgroundColor: labelBackgroundColor,
                                            borderRadius: 4,
                                        }
                                    }
                                }
                            }],
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                paddingTop: 30
                            },
                            onClick: (event, elements) => {
                                if (elements.length > 0) {
                                    const clickedElement = elements[0];
                                    if (clickedElement.datasetIndex === 0) {
                                        const clickedFlight = paginatedFlights[clickedElement.index];
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
                                    font: { size: 20, weight: 'bold' },
                                    padding: { top: 10, bottom: 40 }
                                },
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            const flight = paginatedFlights[context.dataIndex];
                                            const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                            let tooltipText = `Price: €${context.parsed.y.toFixed(2)}`;
                                            if (isSubscribed) tooltipText += ' ★';
                                            if (flight?.minPrice != null) tooltipText += `\nHistorical Min: €${flight.minPrice.toFixed(2)}`;
                                            if (flight?.maxPrice != null) tooltipText += `\nHistorical Max: €${flight.maxPrice.toFixed(2)}`;
                                            return tooltipText;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    type: 'category',
                                    title: { display: true, text: 'Departure Date', color: axisTitleColor, font: { size: 14 } },
                                    ticks: {
                                        color: axisTickColor, font: { size: 13 },
                                        callback: function (value) {
                                            const date = parseISO(this.getLabelForValue(value));
                                            return !isNaN(date.getTime()) ? dateFormatFns(date, 'dd MMM') : '';
                                        }
                                    },
                                    grid: { color: gridLineColor }
                                },
                                y: {
                                    title: { display: true, text: 'Price (EUR)', color: axisTitleColor, font: { size: 14 } },
                                    ticks: { color: axisTickColor, font: { size: 13 } },
                                    grid: { color: gridLineColor },
                                    beginAtZero: true,
                                },
                            },
                        };

                        return (
                            <div key={route} className="chart-card">
                                <div style={{ height: '400px', cursor: 'pointer' }}>
                                    {paginatedFlights.length > 0 ? (
                                        <Bar data={data} options={options} plugins={[iconPlugin, ChartDataLabels]} />
                                    ) : (
                                        <p className="info-message">No flight data to display for this route.</p>
                                    )}
                                </div>
                                {totalPages > 1 && (
                                    <div className="chart-navigation">
                                        <button onClick={() => handlePageChange(route, currentPage - 1)} disabled={currentPage === 0}>
                                            &larr;
                                        </button>
                                        <span>Page {currentPage + 1} of {totalPages}</span>
                                        <button onClick={() => handlePageChange(route, currentPage + 1)} disabled={currentPage >= totalPages - 1}>
                                            &rarr;
                                        </button>
                                    </div>
                                )}
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