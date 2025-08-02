import React, { useState, useEffect } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchSubscriptionsByEmail } from './api';
import './App.css';

function App() {
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState(null);

  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
  }, [userEmail]);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (userEmail) {
        setSubscriptionsLoading(true);
        setSubscriptionsError(null);
        try {
          const subs = await fetchSubscriptionsByEmail(userEmail);
          setUserSubscriptions(subs);
        } catch (err) {
          setSubscriptionsError("Failed to load your subscriptions. Please check your network or try again later.");
          console.error("Subscription fetch error:", err);
        } finally {
          setSubscriptionsLoading(false);
        }
      } else {
        setUserSubscriptions([]);
      }
    };
    loadSubscriptions();
  }, [userEmail]);

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