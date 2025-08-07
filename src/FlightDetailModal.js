import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchPriceHistory } from './api';
import './FlightDetailModal.css';

import tuLogo from './assets/tu_logo.png';
import bjLogo from './assets/bj_logo.png';

import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';
import { parseISO, differenceInDays, format } from 'date-fns';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler, ChartDataLabels
);

const airlineLogos = {
    TU: tuLogo,
    BJ: bjLogo,
};

const AirlineDisplay = ({ code, name }) => {
    const logoSrc = airlineLogos[code];
    return (
        <div className="airline-display">
            {logoSrc ? (
                <img src={logoSrc} alt={`${name} logo`} className="airline-logo" />
            ) : (
                <span className="airline-name">{name}</span>
            )}
        </div>
    );
};

const PriceGauge = ({ current, analytics }) => {
    if (!analytics) return null;
    const { gaugeMin, gaugeMax, lowThreshold, highThreshold, status } = analytics;
    const gaugeRange = gaugeMax - gaugeMin;

    if (gaugeRange <= 0) return null;

    const lowWidth = 25;
    const avgWidth = 50;
    const highWidth = 25;

    const lowLabelPosition = 25;
    const highLabelPosition = 75;

    const position = ((current - gaugeMin) / gaugeRange) * 100;
    const clampedPosition = Math.max(3, Math.min(97, position));

    return (
        <div className="price-gauge-container">
            <div className="gauge-track">
                <div className="gauge-bar-low" style={{ width: `${lowWidth}%` }}></div>
                <div className="gauge-bar-avg" style={{ width: `${avgWidth}%` }}></div>
                <div className="gauge-bar-high" style={{ width: `${highWidth}%` }}></div>
            </div>
            <div className="gauge-handle" style={{ left: `${clampedPosition}%` }}>
                <div className="gauge-handle-label">{`€${current.toFixed(2)} is ${status}`}</div>
                <div className="gauge-handle-dot"></div>
            </div>
            <div className="gauge-labels">
                <span style={{ left: `${lowLabelPosition}%` }}>€{lowThreshold.toFixed(0)}</span>
                <span style={{ left: `${highLabelPosition}%` }}>€{highThreshold.toFixed(0)}</span>
            </div>
        </div>
    );
};


const FlightDetailModal = ({ flight, onClose, airlines, userEmail }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetPrice, setTargetPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const priceAnalytics = useMemo(() => {
        if (history.length < 2) return null;
        const prices = history.map(h => h.priceEur);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const historicalRange = maxPrice - minPrice;

        if (historicalRange <= 0) return null;

        const padding = historicalRange / 4;
        const gaugeMin = minPrice - padding;
        const gaugeMax = maxPrice + padding;
        const gaugeRange = gaugeMax - gaugeMin;

        const lowThreshold = gaugeMin + (gaugeRange * 0.25);
        const highThreshold = gaugeMin + (gaugeRange * 0.75);

        let status = 'average';
        if (flight.priceEur < lowThreshold) status = 'low';
        else if (flight.priceEur > highThreshold) status = 'high';

        return {
            minPrice,
            maxPrice,
            gaugeMin,
            gaugeMax,
            lowThreshold,
            highThreshold,
            status
        };
    }, [history, flight.priceEur]);


    useEffect(() => {
        const loadModalData = async () => {
            if (!flight || !flight.id) return;
            setLoading(true);
            try {
                const historyData = await fetchPriceHistory(flight.id);
                setHistory(historyData);
            } catch (err) { console.error("Failed to load flight history:", err); }
            setLoading(false);
        };
        loadModalData();
    }, [flight]);

    const chartOptions = useMemo(() => {
        if (!priceAnalytics || history.length === 0) return {};

        const timestamps = history.map(h => parseISO(h.timestamp).getTime());
        const minTimestamp = Math.min(...timestamps);
        const maxTimestamp = Math.max(...timestamps);

        let totalRangeMs = maxTimestamp - minTimestamp;
        if (totalRangeMs === 0) {
            totalRangeMs = 5 * 24 * 60 * 60 * 1000;
        }

        const startPaddingMs = totalRangeMs * 0.05;
        const endPaddingMs = totalRangeMs * 0.10;

        const xMin = minTimestamp - startPaddingMs;
        const xMax = maxTimestamp + endPaddingMs;

        const { minPrice, maxPrice } = priceAnalytics;
        const range = maxPrice - minPrice;
        const stepSize = range > 100 ? 25 : (range > 50 ? 10 : 5);
        const yMin = Math.floor(minPrice / stepSize) * stepSize - stepSize / 2;
        const yMax = Math.ceil(maxPrice / stepSize) * stepSize + stepSize / 2;

        return {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false }, datalabels: { display: false },
                tooltip: {
                    enabled: true, backgroundColor: '#5a8eec', padding: 12, cornerRadius: 16,
                    displayColors: false, yAlign: 'bottom', caretPadding: 15,
                    xAlign: (context) => (context.tooltip.x + context.tooltip.width / 2 > context.chart.width) ? 'right' : 'left',
                    callbacks: { title: () => '', label: (context) => `${differenceInDays(new Date(), new Date(context.parsed.x))} days ago - €${context.parsed.y.toFixed(2)}` }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#909090', callback: (val) => `${differenceInDays(new Date(), new Date(val))} days ago` },
                    min: xMin,
                    max: xMax,
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#909090', stepSize: stepSize, callback: (val) => `€${val}` },
                    min: yMin,
                    max: yMax,
                }
            }
        };
    }, [priceAnalytics, history]);

    if (!flight) return null;

    const airline = airlines.find(a => a.code === flight.airlineCode);
    const departureDateFormatted = format(parseISO(flight.departureDate), 'EEE, dd MMM yyyy');
    const chartData = {
        datasets: [{
            label: 'Price History', data: history.map(h => ({ x: parseISO(h.timestamp), y: h.priceEur })),
            borderColor: '#88aaff', backgroundColor: 'rgba(136, 170, 255, 0.15)',
            fill: true, tension: 0.1, pointRadius: 0, pointHoverRadius: 6,
            pointHoverBackgroundColor: '#88aaff', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
        }]
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>×</button>
                <div className="modal-column-left">
                    <div className="price-history-section">
                        <h3>Price History for this Search</h3>
                        <div className="modal-chart-container">
                            {!loading && chartData.datasets[0].data.length > 1 ? (<Line options={chartOptions} data={chartData} />) : (<p>Loading chart...</p>)}
                        </div>
                    </div>
                </div>

                <div className="modal-column-right">
                    <div className="modal-top-info">
                        <AirlineDisplay code={airline?.code} name={airline?.name || flight.airlineCode} />
                        <span className="flight-date">{departureDateFormatted}</span>
                    </div>

                    <div className="price-analysis-section">
                        <h2 className="price-analysis-header">Prices are currently <span className={`price-status ${priceAnalytics?.status || ''}`}>{priceAnalytics?.status || '...'}</span></h2>
                        <p className="price-range-info">
                            Similar trips usually cost between €{priceAnalytics?.lowThreshold.toFixed(0)}–€{priceAnalytics?.highThreshold.toFixed(0)}.
                        </p>
                    </div>

                    <div className="price-gauge-wrapper">
                        {!loading && <PriceGauge current={flight.priceEur} analytics={priceAnalytics} />}
                    </div>

                    <div className="modal-actions-panel">
                        <div className="subscription-form-container">
                            <h3>Track this Flight</h3>
                            <div className="form-group">
                                <input type="number" placeholder="Target Price" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="target-price-input" disabled={submitting || !userEmail} />
                                <button type="button" className="action-button" disabled={submitting || !userEmail}>Set Alert</button>
                            </div>
                        </div>
                        <div className="book-now-container">
                            <h3>Ready to Book?</h3>
                            <a href={flight.bookingUrl || '#'} target="_blank" rel="noopener noreferrer" className={`action-button book-now-button ${!flight.bookingUrl ? 'disabled' : ''}`}>Book Now ✈️</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlightDetailModal;