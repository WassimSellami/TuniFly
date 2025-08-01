// src/App.js
import React, { useState, useEffect } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchSubscriptionsByEmail } from './api'; // Import new API call
import './App.css';

function App() {
  const [userEmail, setUserEmail] = useState(() => {
    // Initialize email from localStorage on first load
    return localStorage.getItem('userEmail') || '';
  });
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState(null);

  // Effect to save email to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
  }, [userEmail]);

  // Effect to fetch subscriptions when email changes or on initial load if email exists
  useEffect(() => {
    const loadSubscriptions = async () => {
      if (userEmail) {
        setSubscriptionsLoading(true);
        setSubscriptionsError(null);
        try {
          const subs = await fetchSubscriptionsByEmail(userEmail);
          setUserSubscriptions(subs);
        } catch (err) {
          setSubscriptionsError("Failed to load your subscriptions.");
          console.error("Subscription fetch error:", err);
        } finally {
          setSubscriptionsLoading(false);
        }
      } else {
        setUserSubscriptions([]); // Clear subscriptions if email is empty
      }
    };
    loadSubscriptions();
  }, [userEmail]); // Re-fetch when userEmail changes

  return (
    <div className="App dark-theme">
      <main className="main-content">
        <FlightSearchForm
          userEmail={userEmail}
          setUserEmail={setUserEmail}
          userSubscriptions={userSubscriptions}
          setUserSubscriptions={setUserSubscriptions}
          subscriptionsLoading={subscriptionsLoading}
          subscriptionsError={subscriptionsError}
        />
      </main>
    </div>
  );
}

export default App;