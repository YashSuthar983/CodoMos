import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../api/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function ExecutiveDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard/executive');
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="xl" color="blue.500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  const candidatesData = Object.entries(dashboardData?.candidates_by_stage || {}).map(([stage, count]) => ({
    stage: stage.replace('_', ' '),
    count
  }));

  const projectHealthData = [
    { name: 'On Track', value: dashboardData?.projects_on_track || 0, color: '#00C49F' },
    { name: 'At Risk', value: dashboardData?.projects_at_risk || 0, color: '#FF8042' }
  ];

  return (
    <div className="space-y-6">
      {/* Company-Wide KPIs */}
      <Card>
        <CardHeader>
          <Heading size="md">Company-Wide KPIs</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
            <Stat>
              <StatLabel>Total Employees</StatLabel>
              <StatNumber>{dashboardData?.total_employees || 0}</StatNumber>
              <StatHelpText>
                <StatArrow type={dashboardData?.employee_growth_rate >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(dashboardData?.employee_growth_rate || 0).toFixed(1)}% growth
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Active Employees</StatLabel>
              <StatNumber>{dashboardData?.active_employees || 0}</StatNumber>
              <StatHelpText>
                {((dashboardData?.active_employees / dashboardData?.total_employees) * 100).toFixed(0)}% active
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Total Projects</StatLabel>
              <StatNumber>{dashboardData?.total_projects || 0}</StatNumber>
              <StatHelpText>
                {dashboardData?.active_projects || 0} active
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Projects On Track</StatLabel>
              <StatNumber>{dashboardData?.projects_on_track || 0}</StatNumber>
              <StatHelpText>
                <span className="text-green-600">✓ Healthy</span>
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Projects At Risk</StatLabel>
              <StatNumber>{dashboardData?.projects_at_risk || 0}</StatNumber>
              <StatHelpText>
                <span className="text-red-600">⚠ Needs Attention</span>
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Project Completion Rate</StatLabel>
              <StatNumber>{dashboardData?.project_completion_rate || 0}%</StatNumber>
              <StatHelpText>This month</StatHelpText>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      {/* Team Productivity */}
      <Card>
        <CardHeader>
          <Heading size="md">Team Productivity Metrics</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
            <Stat>
              <StatLabel>Total Organization XP</StatLabel>
              <StatNumber>{Math.round(dashboardData?.total_org_xp || 0).toLocaleString()}</StatNumber>
              <StatHelpText>Cumulative experience points</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Avg XP per Employee</StatLabel>
              <StatNumber>{Math.round(dashboardData?.avg_xp_per_employee || 0).toLocaleString()}</StatNumber>
              <StatHelpText>Individual performance</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Commits This Week</StatLabel>
              <StatNumber>{dashboardData?.commits_this_week || 0}</StatNumber>
              <StatHelpText>
                <span className="text-blue-600">📝 Development activity</span>
              </StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>PRs Merged This Week</StatLabel>
              <StatNumber>{dashboardData?.prs_merged_this_week || 0}</StatNumber>
              <StatHelpText>
                <span className="text-purple-600">🔀 Code reviews</span>
              </StatHelpText>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      {/* Hiring Pipeline */}
      <Card>
        <CardHeader>
          <Heading size="md">Hiring Pipeline Health</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
            <Box>
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <Stat>
                  <StatLabel>Total Candidates</StatLabel>
                  <StatNumber>{dashboardData?.total_candidates || 0}</StatNumber>
                  <StatHelpText>In pipeline</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>Avg Time to Hire</StatLabel>
                  <StatNumber>{Math.round(dashboardData?.avg_time_to_hire_days || 0)}</StatNumber>
                  <StatHelpText>days</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>Offer Acceptance Rate</StatLabel>
                  <StatNumber>{dashboardData?.offer_acceptance_rate || 0}%</StatNumber>
                  <StatHelpText>Success rate</StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>Hiring Velocity</StatLabel>
                  <StatNumber>{dashboardData?.hiring_velocity?.toFixed(1) || 0}</StatNumber>
                  <StatHelpText>candidates/day</StatHelpText>
                </Stat>
              </Grid>
            </Box>

            <Box>
              <Heading size="sm" mb={4}>Candidates by Stage</Heading>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={candidatesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </CardBody>
      </Card>

      {/* Project Health Distribution */}
      <Card>
        <CardHeader>
          <Heading size="md">Project Health Distribution</Heading>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectHealthData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectHealthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Placeholder sections for future implementation */}
      <Card bg="gray.50">
        <CardHeader>
          <Heading size="md">Employee Satisfaction</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
            <Stat>
              <StatLabel>Avg Satisfaction Score</StatLabel>
              <StatNumber>{dashboardData?.avg_satisfaction_score || 'N/A'}</StatNumber>
              <StatHelpText>Survey data required</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Engagement Score</StatLabel>
              <StatNumber>{dashboardData?.engagement_score || 'N/A'}</StatNumber>
              <StatHelpText>Survey data required</StatHelpText>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      <Card bg="gray.50">
        <CardHeader>
          <Heading size="md">Budget Utilization</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
            <Stat>
              <StatLabel>Total Budget</StatLabel>
              <StatNumber>${dashboardData?.total_budget?.toLocaleString() || 'N/A'}</StatNumber>
              <StatHelpText>Financial data required</StatHelpText>
            </Stat>

            <Stat>
              <StatLabel>Budget Utilized</StatLabel>
              <StatNumber>${dashboardData?.budget_utilized?.toLocaleString() || 'N/A'}</StatNumber>
              <StatHelpText>
                {dashboardData?.budget_utilization_percent || 0}% of total
              </StatHelpText>
            </Stat>
          </Grid>
        </CardBody>
      </Card>

      <div className="text-center text-sm text-gray-500 mt-6">
        Last updated: {new Date(dashboardData?.snapshot_date).toLocaleString()}
      </div>
    </div>
  );
}
