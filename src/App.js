// src/App.js
import React from 'react';
import FlightSearchForm from './FlightSearchForm';
import './App.css';

function App() {
  return (
    <div className="App dark-theme">
      <main className="main-content">
        <FlightSearchForm />
      </main>
    </div>
  );
}

export default App;