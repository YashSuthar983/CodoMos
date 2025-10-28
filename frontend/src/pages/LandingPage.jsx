import React from 'react';
import {
  Box, Container, Heading, Text, Button, Stack, Flex, Grid, Icon, Badge,
  useColorModeValue, VStack, HStack, SimpleGrid, List, ListItem, ListIcon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { 
  FaRocket, FaUsers, FaChartLine, FaCheckCircle, FaTrophy, FaBullseye,
  FaCalendarAlt, FaHandshake, FaStar, FaArrowRight, FaGithub, FaCode
} from 'react-icons/fa';

export default function LandingPage() {
  const navigate = useNavigate();
  const bgGradient = useColorModeValue(
    'linear(to-br, cyan.400, blue.500, teal.400)',
    'linear(to-br, cyan.600, blue.700, teal.600)'
  );
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const features = [
    {
      icon: FaUsers,
      title: 'Employee Management',
      description: 'Centralized system to manage your entire workforce with profiles, roles, and permissions'
    },
    {
      icon: FaBullseye,
      title: 'Goals & OKRs',
      description: 'Set, track, and achieve organizational and individual goals with powerful OKR framework'
    },
    {
      icon: FaChartLine,
      title: 'Performance Reviews',
      description: '360-degree feedback system with self-assessments, peer reviews, and manager evaluations'
    },
    {
      icon: FaCalendarAlt,
      title: '1:1 Meetings',
      description: 'Schedule and document one-on-one meetings with action item tracking and templates'
    },
    {
      icon: FaTrophy,
      title: 'XP & Leaderboards',
      description: 'Gamified experience system that rewards achievements and encourages growth'
    },
    {
      icon: FaCode,
      title: 'GitHub Integration',
      description: 'Track commits, PRs, issues, and code contributions with automatic XP rewards'
    },
    {
      icon: FaHandshake,
      title: 'Hiring Pipeline',
      description: 'End-to-end recruitment management with applicant tracking and automated workflows'
    },
    {
      icon: FaRocket,
      title: 'Project Management',
      description: 'Organize teams, assign tasks, and track progress across multiple projects'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '49',
      period: 'month',
      description: 'Perfect for small teams',
      features: [
        'Up to 10 employees',
        'Basic performance reviews',
        'Goals & OKRs tracking',
        '1:1 meeting management',
        'Email support',
        '5GB storage'
      ],
      popular: false,
      color: 'blue'
    },
    {
      name: 'Professional',
      price: '99',
      period: 'month',
      description: 'For growing businesses',
      features: [
        'Up to 50 employees',
        'Advanced 360° reviews',
        'XP & Leaderboards',
        'GitHub integration',
        'Hiring pipeline (10 positions)',
        'Priority support',
        '50GB storage',
        'Custom branding'
      ],
      popular: true,
      color: 'purple'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Unlimited everything',
      features: [
        'Unlimited employees',
        'Full 360° feedback system',
        'Advanced analytics',
        'Unlimited GitHub repos',
        'Unlimited hiring positions',
        'Dedicated account manager',
        'Unlimited storage',
        'SLA guarantee',
        'Custom integrations',
        'On-premise deployment'
      ],
      popular: false,
      color: 'pink'
    }
  ];

  const stats = [
    { label: 'Companies Trust Us', value: '500+' },
    { label: 'Employee Profiles', value: '50K+' },
    { label: 'Performance Reviews', value: '100K+' },
    { label: 'Customer Satisfaction', value: '99%' }
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        as="nav"
        bg={cardBg}
        borderBottom="1px"
        borderColor={borderColor}
        py={4}
        position="sticky"
        top={0}
        zIndex={10}
        boxShadow="sm"
      >
        <Container maxW="1200px">
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FaRocket} boxSize={10} color="cyan.500" />
              <Heading size="xl" bgGradient={bgGradient} bgClip="text" fontWeight="black">
                CogniWork
              </Heading>
            </HStack>
            <HStack spacing={4}>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                _hover={{ bg: 'cyan.50' }}
              >
                Login
              </Button>
              <Button
                bgGradient="linear(to-r, cyan.400, blue.500)"
                color="white"
                onClick={() => navigate('/signup')}
                rightIcon={<FaArrowRight />}
                _hover={{ bgGradient: 'linear(to-r, cyan.500, blue.600)', transform: 'translateY(-2px)', shadow: 'lg' }}
                shadow="md"
                size="lg"
              >
                Start Free Trial
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        bgGradient={bgGradient}
        color="white"
        py={20}
        textAlign="center"
      >
        <Container maxW="1200px">
          <VStack spacing={6}>
            <Badge
              bgGradient="linear(to-r, cyan.400, blue.500)"
              color="white"
              fontSize="md"
              px={4}
              py={2}
              borderRadius="full"
              shadow="md"
            >
              🚀 Trusted by 500+ Companies
            </Badge>
            <Heading
              as="h1"
              size="3xl"
              fontWeight="extrabold"
              maxW="800px"
            >
              Transform Your Workplace with Intelligent Performance Management
            </Heading>
            <Text fontSize="xl" maxW="700px" opacity={0.9}>
              All-in-one platform for employee management, performance reviews,
              goal tracking, and team development. Built for modern teams.
            </Text>
            <HStack spacing={4} pt={4}>
              <Button
                size="lg"
                bg="white"
                color="cyan.600"
                _hover={{ bg: 'cyan.50', transform: 'translateY(-2px)', shadow: 'xl' }}
                onClick={() => navigate('/signup')}
                rightIcon={<FaArrowRight />}
                shadow="xl"
                px={8}
                fontWeight="bold"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                color="white"
                borderColor="white"
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Watch Demo
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box py={12} bg={cardBg}>
        <Container maxW="1200px">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8}>
            {stats.map((stat, idx) => (
              <VStack key={idx} textAlign="center">
                <Heading size="2xl" bgGradient="linear(to-r, cyan.500, blue.600)" bgClip="text">
                  {stat.value}
                </Heading>
                <Text color="gray.600">{stat.label}</Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20}>
        <Container maxW="1200px">
          <VStack spacing={4} textAlign="center" mb={16}>
            <Badge bgGradient="linear(to-r, cyan.400, blue.500)" color="white" fontSize="md" px={3} py={1} borderRadius="full">FEATURES</Badge>
            <Heading size="2xl">Everything You Need to Excel</Heading>
            <Text fontSize="lg" color="gray.600" maxW="600px">
              Comprehensive tools to manage, motivate, and measure your team's success
            </Text>
          </VStack>

          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
            gap={8}
          >
            {features.map((feature, idx) => (
              <Box
                key={idx}
                p={6}
                bg={cardBg}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderColor}
                _hover={{
                  transform: 'translateY(-8px)',
                  boxShadow: '2xl',
                  borderColor: 'cyan.400',
                  bg: 'cyan.50'
                }}
                transition="all 0.3s"
              >
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bgGradient="linear(to-br, cyan.400, blue.500)" 
                  display="inline-block"
                  mb={4}
                >
                  <Icon as={feature.icon} boxSize={8} color="white" />
                </Box>
                <Heading size="md" mb={2}>
                  {feature.title}
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  {feature.description}
                </Text>
              </Box>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box py={20} bg={useColorModeValue('gray.50', 'gray.900')}>
        <Container maxW="1200px">
          <VStack spacing={4} textAlign="center" mb={16}>
            <Badge bgGradient="linear(to-r, cyan.400, blue.500)" color="white" fontSize="md" px={3} py={1} borderRadius="full">PRICING</Badge>
            <Heading size="2xl">Choose Your Plan</Heading>
            <Text fontSize="lg" color="gray.600" maxW="600px">
              Simple, transparent pricing that grows with you. Try any plan free for 14 days.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {pricingPlans.map((plan, idx) => (
              <Box
                key={idx}
                borderRadius="2xl"
                borderWidth="2px"
                borderColor={plan.popular ? 'cyan.400' : borderColor}
                bg={plan.popular ? 'cyan.50' : cardBg}
                p={8}
                position="relative"
                transform={plan.popular ? 'scale(1.05)' : 'none'}
                boxShadow={plan.popular ? '2xl' : 'md'}
              >
                {plan.popular && (
                  <Badge
                    position="absolute"
                    top="-3"
                    right="8"
                    bgGradient="linear(to-r, cyan.400, blue.500)"
                    color="white"
                    fontSize="sm"
                    px={3}
                    py={1}
                    shadow="lg"
                  >
                    <Flex align="center" gap={1}>
                      <FaStar />
                      MOST POPULAR
                    </Flex>
                  </Badge>
                )}
                
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Heading size="lg" mb={2}>
                      {plan.name}
                    </Heading>
                    <Text color="gray.600" fontSize="sm">
                      {plan.description}
                    </Text>
                  </Box>

                  <Flex align="baseline" gap={2}>
                    {plan.price !== 'Custom' && (
                      <Text fontSize="4xl" fontWeight="bold">
                        ${plan.price}
                      </Text>
                    )}
                    {plan.price === 'Custom' && (
                      <Text fontSize="4xl" fontWeight="bold">
                        {plan.price}
                      </Text>
                    )}
                    {plan.period && (
                      <Text color="gray.600">/{plan.period}</Text>
                    )}
                  </Flex>

                  <Button
                    bgGradient={plan.popular ? 'linear(to-r, cyan.400, blue.500)' : undefined}
                    colorScheme={plan.popular ? undefined : 'cyan'}
                    size="lg"
                    variant={plan.popular ? 'solid' : 'outline'}
                    color={plan.popular ? 'white' : undefined}
                    onClick={() => navigate('/signup')}
                    _hover={plan.popular ? { bgGradient: 'linear(to-r, cyan.500, blue.600)', transform: 'translateY(-2px)' } : { transform: 'translateY(-2px)' }}
                  >
                    {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
                  </Button>

                  <List spacing={3} pt={4}>
                    {plan.features.map((feature, featureIdx) => (
                      <ListItem key={featureIdx} display="flex" alignItems="center">
                        <ListIcon as={FaCheckCircle} color="cyan.500" />
                        <Text fontSize="sm">{feature}</Text>
                      </ListItem>
                    ))}
                  </List>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        bgGradient={bgGradient}
        color="white"
        py={20}
        textAlign="center"
      >
        <Container maxW="800px">
          <VStack spacing={6}>
            <Heading size="2xl">
              Ready to Transform Your Team?
            </Heading>
            <Text fontSize="lg" opacity={0.9}>
              Join thousands of companies already using CogniWork to build high-performing teams.
              Start your free 14-day trial today - no credit card required.
            </Text>
            <HStack spacing={4} pt={4}>
              <Button
                size="lg"
                bg="white"
                color="cyan.600"
                _hover={{ bg: 'cyan.50', transform: 'translateY(-2px)', shadow: 'xl' }}
                onClick={() => navigate('/signup')}
                rightIcon={<FaArrowRight />}
                shadow="xl"
                px={8}
                fontWeight="bold"
              >
                Start Free Trial
              </Button>
              <Button
                size="lg"
                variant="outline"
                color="white"
                borderColor="white"
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Schedule a Demo
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box bg={cardBg} borderTop="1px" borderColor={borderColor} py={12}>
        <Container maxW="1200px">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={8}>
            <VStack align="flex-start" spacing={4}>
              <HStack spacing={2}>
                <Icon as={FaRocket} boxSize={8} color="cyan.500" />
                <Heading size="md" bgGradient="linear(to-r, cyan.500, blue.600)" bgClip="text">CogniWork</Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Modern performance management for forward-thinking teams.
              </Text>
            </VStack>

            <VStack align="flex-start" spacing={2}>
              <Heading size="sm" mb={2}>Product</Heading>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Features</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Pricing</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Security</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Roadmap</Text>
            </VStack>

            <VStack align="flex-start" spacing={2}>
              <Heading size="sm" mb={2}>Company</Heading>
              <Text fontSize="sm" color="gray.600" cursor="pointer">About</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Blog</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Careers</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Contact</Text>
            </VStack>

            <VStack align="flex-start" spacing={2}>
              <Heading size="sm" mb={2}>Legal</Heading>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Privacy</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Terms</Text>
              <Text fontSize="sm" color="gray.600" cursor="pointer">Compliance</Text>
            </VStack>
          </Grid>

          <Flex
            mt={12}
            pt={8}
            borderTop="1px"
            borderColor={borderColor}
            justify="space-between"
            align="center"
            flexWrap="wrap"
            gap={4}
          >
            <Text fontSize="sm" color="gray.600">
              © 2024 CogniWork. All rights reserved.
            </Text>
            <HStack spacing={4}>
              <Icon as={FaGithub} boxSize={5} color="gray.600" cursor="pointer" />
              <Icon as={FaStar} boxSize={5} color="gray.600" cursor="pointer" />
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
