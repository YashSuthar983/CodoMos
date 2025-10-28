import React, { useState, useEffect } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Alert, AlertIcon } from '@chakra-ui/react';
import ExecutiveDashboard from '../components/analytics/ExecutiveDashboard';
import CustomReports from '../components/analytics/CustomReports';
import PredictiveAnalytics from '../components/analytics/PredictiveAnalytics';
import api from '../api/client';

export default function Analytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setCurrentUser(response.data);
        
        if (response.data.role !== 'admin') {
          setError('Admin access required to view analytics dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        setError('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error || currentUser?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert status="error">
          <AlertIcon />
          {error || 'Admin access required to view analytics dashboard'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          📊 Analytics & Reporting
        </h1>
        <p className="text-gray-600 mt-2">
          Comprehensive insights, reports, and predictive analytics for data-driven decisions
        </p>
      </div>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            <span className="flex items-center gap-2">
              📈 Executive Dashboard
            </span>
          </Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            <span className="flex items-center gap-2">
              📄 Custom Reports
            </span>
          </Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            <span className="flex items-center gap-2">
              🔮 Predictive Analytics
            </span>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <ExecutiveDashboard />
          </TabPanel>
          <TabPanel>
            <CustomReports />
          </TabPanel>
          <TabPanel>
            <PredictiveAnalytics />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
