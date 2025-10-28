import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Checkbox,
  Stack,
  Alert,
  AlertIcon,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import api from '../../api/client';

export default function CustomReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState({
    report_name: '',
    report_type: 'custom',
    description: '',
    metrics: [],
    visualization_type: 'table',
    is_scheduled: false,
    schedule_frequency: '',
    schedule_time: '',
    recipients: []
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/reports');
      setReports(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      await api.post('/analytics/reports', formData);
      onClose();
      fetchReports();
      setFormData({
        report_name: '',
        report_type: 'custom',
        description: '',
        metrics: [],
        visualization_type: 'table',
        is_scheduled: false,
        schedule_frequency: '',
        schedule_time: '',
        recipients: []
      });
    } catch (err) {
      console.error('Failed to create report:', err);
      alert('Failed to create report');
    }
  };

  const handleGenerateReport = async (reportId) => {
    try {
      setGeneratingReport(reportId);
      const response = await api.post(`/analytics/reports/${reportId}/generate`);
      
      // Show generated data in a new window or download
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}-${new Date().toISOString()}.json`;
      link.click();
      
      fetchReports(); // Refresh to show last_generated date
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleExportReport = async (reportId, format) => {
    try {
      const response = await api.get(`/analytics/reports/${reportId}/export?format=${format}`);
      
      const dataStr = format === 'json' ? JSON.stringify(response.data, null, 2) : JSON.stringify(response.data);
      const dataBlob = new Blob([dataStr], { type: `application/${format}` });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-export-${reportId}.${format}`;
      link.click();
    } catch (err) {
      console.error('Failed to export report:', err);
      alert('Failed to export report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await api.delete(`/analytics/reports/${reportId}`);
      fetchReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report');
    }
  };

  const handleMetricToggle = (metric) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="xl" color="blue.500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Heading size="md">Custom Reports</Heading>
            <Button colorScheme="blue" onClick={onOpen}>
              + Create New Report
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No custom reports created yet</p>
              <p className="text-sm">Create your first report to get started</p>
            </div>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Report Name</Th>
                  <Th>Type</Th>
                  <Th>Metrics</Th>
                  <Th>Visualization</Th>
                  <Th>Scheduled</Th>
                  <Th>Last Generated</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {reports.map((report) => (
                  <Tr key={report.id}>
                    <Td>
                      <div>
                        <div className="font-semibold">{report.report_name}</div>
                        {report.description && (
                          <div className="text-sm text-gray-500">{report.description}</div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <Badge colorScheme="purple">{report.report_type}</Badge>
                    </Td>
                    <Td>
                      <div className="text-sm">
                        {report.metrics.length} metric{report.metrics.length !== 1 ? 's' : ''}
                      </div>
                    </Td>
                    <Td>
                      <Badge colorScheme="teal">{report.visualization_type}</Badge>
                    </Td>
                    <Td>
                      {report.is_scheduled ? (
                        <Badge colorScheme="green">
                          {report.schedule_frequency}
                        </Badge>
                      ) : (
                        <Badge>Manual</Badge>
                      )}
                    </Td>
                    <Td>
                      {report.last_generated ? (
                        <div className="text-sm">
                          {new Date(report.last_generated).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleGenerateReport(report.id)}
                          isLoading={generatingReport === report.id}
                        >
                          Generate
                        </Button>
                        <Menu>
                          <MenuButton as={Button} size="sm" variant="outline">
                            Export ▼
                          </MenuButton>
                          <MenuList>
                            <MenuItem onClick={() => handleExportReport(report.id, 'json')}>
                              Export as JSON
                            </MenuItem>
                            <MenuItem onClick={() => handleExportReport(report.id, 'csv')}>
                              Export as CSV
                            </MenuItem>
                          </MenuList>
                        </Menu>
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          icon={<span>🗑️</span>}
                          onClick={() => handleDeleteReport(report.id)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Create Report Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Report Name</FormLabel>
                <Input
                  value={formData.report_name}
                  onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                  placeholder="e.g., Monthly Team Performance"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this report"
                  rows={3}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Report Type</FormLabel>
                <Select
                  value={formData.report_type}
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                >
                  <option value="custom">Custom</option>
                  <option value="executive">Executive</option>
                  <option value="team">Team</option>
                  <option value="hiring">Hiring</option>
                  <option value="project">Project</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Metrics to Include</FormLabel>
                <Stack spacing={2}>
                  <Checkbox
                    isChecked={formData.metrics.includes('executive_dashboard')}
                    onChange={() => handleMetricToggle('executive_dashboard')}
                  >
                    Executive Dashboard KPIs
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.metrics.includes('team_productivity')}
                    onChange={() => handleMetricToggle('team_productivity')}
                  >
                    Team Productivity Metrics
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.metrics.includes('hiring_pipeline')}
                    onChange={() => handleMetricToggle('hiring_pipeline')}
                  >
                    Hiring Pipeline Health
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.metrics.includes('project_status')}
                    onChange={() => handleMetricToggle('project_status')}
                  >
                    Project Status Overview
                  </Checkbox>
                  <Checkbox
                    isChecked={formData.metrics.includes('employee_satisfaction')}
                    onChange={() => handleMetricToggle('employee_satisfaction')}
                  >
                    Employee Satisfaction Scores
                  </Checkbox>
                </Stack>
              </FormControl>

              <FormControl>
                <FormLabel>Visualization Type</FormLabel>
                <Select
                  value={formData.visualization_type}
                  onChange={(e) => setFormData({ ...formData, visualization_type: e.target.value })}
                >
                  <option value="table">Table</option>
                  <option value="chart">Chart</option>
                  <option value="mixed">Mixed (Table + Charts)</option>
                </Select>
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={formData.is_scheduled}
                  onChange={(e) => setFormData({ ...formData, is_scheduled: e.target.checked })}
                >
                  Schedule automatic delivery
                </Checkbox>
              </FormControl>

              {formData.is_scheduled && (
                <>
                  <FormControl>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      value={formData.schedule_frequency}
                      onChange={(e) => setFormData({ ...formData, schedule_frequency: e.target.value })}
                    >
                      <option value="">Select frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Time</FormLabel>
                    <Input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Email Recipients (comma-separated)</FormLabel>
                    <Input
                      value={formData.recipients.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData,
                        recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                      })}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </FormControl>
                </>
              )}
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateReport}
              isDisabled={!formData.report_name || formData.metrics.length === 0}
            >
              Create Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
