import React, { useState } from 'react';
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
  Alert,
  AlertIcon,
  Spinner,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  FormControl,
  FormLabel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { WarningIcon, CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';
import api from '../../api/client';

export default function PredictiveAnalytics() {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [modelType, setModelType] = useState('all');
  const [error, setError] = useState(null);

  const runPredictiveAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/analytics/predictive/analyze', {
        model_type: modelType,
        time_horizon_days: 90,
        include_recommendations: true
      });
      setPredictions(response.data);
    } catch (err) {
      console.error('Failed to run predictive analysis:', err);
      setError('Failed to run predictive analysis');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Heading size="md">🔮 Predictive Analytics</Heading>
            <div className="flex gap-3 items-center">
              <FormControl maxW="300px">
                <Select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                >
                  <option value="all">All Models</option>
                  <option value="attrition">Employee Attrition</option>
                  <option value="project_risk">Project Risk</option>
                  <option value="resource_shortage">Resource Shortage</option>
                  <option value="hiring_demand">Hiring Demand</option>
                </Select>
              </FormControl>
              <Button
                colorScheme="blue"
                onClick={runPredictiveAnalysis}
                isLoading={loading}
              >
                Run Analysis
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {!predictions && !loading && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No predictions generated yet</p>
              <p className="text-sm">Select a model type and click "Run Analysis" to get started</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-12">
              <Spinner size="xl" color="blue.500" />
              <span className="ml-4 text-gray-600">Analyzing data and generating predictions...</span>
            </div>
          )}

          {predictions && !loading && (
            <div className="space-y-6">
              {/* Overall Summary */}
              <Card bg="blue.50">
                <CardBody>
                  <Heading size="sm" mb={4}>📊 Analysis Summary</Heading>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    {predictions.overall_summary.high_risk_employees !== undefined && (
                      <Stat>
                        <StatLabel>High Risk Employees</StatLabel>
                        <StatNumber color="red.500">
                          {predictions.overall_summary.high_risk_employees}
                        </StatNumber>
                        <StatHelpText>Need immediate attention</StatHelpText>
                      </Stat>
                    )}
                    {predictions.overall_summary.at_risk_projects !== undefined && (
                      <Stat>
                        <StatLabel>At-Risk Projects</StatLabel>
                        <StatNumber color="orange.500">
                          {predictions.overall_summary.at_risk_projects}
                        </StatNumber>
                        <StatHelpText>Require intervention</StatHelpText>
                      </Stat>
                    )}
                    {predictions.overall_summary.skill_gaps !== undefined && (
                      <Stat>
                        <StatLabel>Skill Gaps Identified</StatLabel>
                        <StatNumber color="yellow.600">
                          {predictions.overall_summary.skill_gaps}
                        </StatNumber>
                        <StatHelpText>Training or hiring needed</StatHelpText>
                      </Stat>
                    )}
                    {predictions.overall_summary.predicted_hires !== undefined && (
                      <Stat>
                        <StatLabel>Predicted Hires</StatLabel>
                        <StatNumber color="green.500">
                          {predictions.overall_summary.predicted_hires}
                        </StatNumber>
                        <StatHelpText>Next 90 days</StatHelpText>
                      </Stat>
                    )}
                  </Grid>
                </CardBody>
              </Card>

              {/* Employee Attrition Predictions */}
              {predictions.attrition_predictions && predictions.attrition_predictions.length > 0 && (
                <Card>
                  <CardHeader>
                    <Heading size="sm">⚠️ Employee Attrition Risk</Heading>
                  </CardHeader>
                  <CardBody>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Employee</Th>
                          <Th>Position</Th>
                          <Th>Risk Level</Th>
                          <Th>Risk Score</Th>
                          <Th>Risk Factors</Th>
                          <Th>Recommendations</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {predictions.attrition_predictions.map((pred, idx) => (
                          <Tr key={idx}>
                            <Td>{pred.employee_name}</Td>
                            <Td>{pred.position}</Td>
                            <Td>
                              <Badge colorScheme={getRiskColor(pred.attrition_risk)}>
                                {pred.attrition_risk}
                              </Badge>
                            </Td>
                            <Td>{(pred.risk_score * 100).toFixed(0)}%</Td>
                            <Td>
                              <List spacing={1}>
                                {pred.risk_factors.map((factor, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={WarningIcon} color="orange.500" />
                                    {factor}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                            <Td>
                              <List spacing={1}>
                                {pred.recommendations.map((rec, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={CheckCircleIcon} color="green.500" />
                                    {rec}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {/* Project Risk Predictions */}
              {predictions.project_risks && predictions.project_risks.length > 0 && (
                <Card>
                  <CardHeader>
                    <Heading size="sm">📉 Project Delivery Risks</Heading>
                  </CardHeader>
                  <CardBody>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Project</Th>
                          <Th>Risk Level</Th>
                          <Th>Risk Score</Th>
                          <Th>Est. Delay</Th>
                          <Th>Risk Factors</Th>
                          <Th>Recommendations</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {predictions.project_risks.map((pred, idx) => (
                          <Tr key={idx}>
                            <Td>{pred.project_name}</Td>
                            <Td>
                              <Badge colorScheme={getRiskColor(pred.risk_level)}>
                                {pred.risk_level}
                              </Badge>
                            </Td>
                            <Td>{(pred.risk_score * 100).toFixed(0)}%</Td>
                            <Td>{pred.estimated_delay_days} days</Td>
                            <Td>
                              <List spacing={1}>
                                {pred.risk_factors.map((factor, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={WarningIcon} color="orange.500" />
                                    {factor}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                            <Td>
                              <List spacing={1}>
                                {pred.recommendations.map((rec, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={CheckCircleIcon} color="green.500" />
                                    {rec}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {/* Resource Shortage Predictions */}
              {predictions.resource_shortages && predictions.resource_shortages.length > 0 && (
                <Card>
                  <CardHeader>
                    <Heading size="sm">👥 Resource & Skill Shortages</Heading>
                  </CardHeader>
                  <CardBody>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Skill Area</Th>
                          <Th>Severity</Th>
                          <Th>Current</Th>
                          <Th>Projected Need</Th>
                          <Th>Gap</Th>
                          <Th>Timeline</Th>
                          <Th>Recommendations</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {predictions.resource_shortages.map((pred, idx) => (
                          <Tr key={idx}>
                            <Td fontWeight="semibold">{pred.skill_area}</Td>
                            <Td>
                              <Badge colorScheme={getSeverityColor(pred.shortage_severity)}>
                                {pred.shortage_severity}
                              </Badge>
                            </Td>
                            <Td>{pred.current_capacity} people</Td>
                            <Td>{pred.projected_demand} people</Td>
                            <Td>
                              <span className="text-red-600 font-semibold">
                                -{pred.shortage_gap}
                              </span>
                            </Td>
                            <Td>{pred.timeline_weeks} weeks</Td>
                            <Td>
                              <List spacing={1}>
                                {pred.recommendations.map((rec, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={CheckCircleIcon} color="green.500" />
                                    {rec}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {/* Hiring Demand Predictions */}
              {predictions.hiring_demands && predictions.hiring_demands.length > 0 && (
                <Card>
                  <CardHeader>
                    <Heading size="sm">📈 Future Hiring Demand</Heading>
                  </CardHeader>
                  <CardBody>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Position</Th>
                          <Th>Predicted Openings</Th>
                          <Th>Confidence</Th>
                          <Th>Start Date</Th>
                          <Th>Time to Fill</Th>
                          <Th>Reasoning</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {predictions.hiring_demands.map((pred, idx) => (
                          <Tr key={idx}>
                            <Td fontWeight="semibold">{pred.position}</Td>
                            <Td>
                              <Badge colorScheme="blue" fontSize="md">
                                {pred.predicted_openings}
                              </Badge>
                            </Td>
                            <Td>{(pred.confidence * 100).toFixed(0)}%</Td>
                            <Td>{new Date(pred.recommended_start_date).toLocaleDateString()}</Td>
                            <Td>{pred.estimated_time_to_fill_days} days</Td>
                            <Td>
                              <List spacing={1}>
                                {pred.reasoning.map((reason, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={InfoIcon} color="blue.500" />
                                    {reason}
                                  </ListItem>
                                ))}
                              </List>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {/* Overall Recommendations */}
              {predictions.recommendations && predictions.recommendations.length > 0 && (
                <Card bg="green.50">
                  <CardHeader>
                    <Heading size="sm">💡 Strategic Recommendations</Heading>
                  </CardHeader>
                  <CardBody>
                    <List spacing={3}>
                      {predictions.recommendations.map((rec, idx) => (
                        <ListItem key={idx}>
                          <ListIcon as={CheckCircleIcon} color="green.500" />
                          <span className="font-medium">{rec}</span>
                        </ListItem>
                      ))}
                    </List>
                  </CardBody>
                </Card>
              )}

              <div className="text-center text-sm text-gray-500 mt-6">
                Analysis generated: {new Date(predictions.prediction_date).toLocaleString()}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
