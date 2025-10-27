// frontend/src/pages/Landing.jsx
import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  SimpleGrid,
  Icon,
  Image,
  Badge,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FaUsers, FaProjectDiagram, FaBrain } from "react-icons/fa";

export default function Landing() {
  return (
    <Box bg="gray.50" minH="100vh" pb={20}>
      <Container maxW="container.xl" py={12}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={12} alignItems="center">
          {/* Hero left */}
          <VStack align="start" spacing={6}>
            <Badge colorScheme="blue" px={3} py={1} borderRadius="md">CogniWork (Demo)</Badge>
            <Heading size="2xl" lineHeight="short">
              Unified AI for People, Projects & Product
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="lg">
              Streamline hiring, simulate product interviews, and manage projects with a single AI-powered
              interface. Built as a demo for the hackathon — fast to review, simple to extend.
            </Text>

            <HStack spacing={4}>
              <Button as={RouterLink} to="/employee-demo" colorScheme="blue" size="lg">
                View Employee Demo
              </Button>
              <Button as={RouterLink} to="/login" variant="ghost" size="lg">
                Sign in
              </Button>
            </HStack>

            <HStack spacing={4} pt={4}>
              <Box>
                <Text fontWeight="bold">Stack</Text>
                <Text fontSize="sm" color="gray.500">FastAPI • React • Chakra UI • MongoDB</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Status</Text>
                <Text fontSize="sm" color="gray.500">Demo-ready (no backend required for UI preview)</Text>
              </Box>
            </HStack>
          </VStack>

          {/* Hero right - illustration */}
          <Box>
            {/* If you have a screenshot, replace the Image src with its path */}
            <Image
              src="https://images.unsplash.com/photo-1581092580496-274f3d7f1b6b?w=1200&q=80&auto=format&fit=crop"
              alt="dashboard screenshot"
              borderRadius="lg"
              boxShadow="lg"
            />
          </Box>
        </SimpleGrid>

        {/* Features */}
        <Box mt={16}>
          <Heading size="lg" mb={6}>What it does</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Feature
              icon={FaUsers}
              title="People & Hiring"
              desc="Auto-screen resumes, match candidates to roles, and save interviewer notes."
            />
            <Feature
              icon={FaProjectDiagram}
              title="Project Management"
              desc="AI-assisted team building, task assignment and risk prediction."
            />
            <Feature
              icon={FaBrain}
              title="Product Intelligence"
              desc="Simulate thousands of user interviews and connect market signals to product decisions."
            />
          </SimpleGrid>
        </Box>

        {/* Callout */}
        <Box mt={16} bg="white" p={8} borderRadius="md" boxShadow="sm">
          <HStack spacing={8} align="center">
            <Box flex="1">
              <Heading size="md">Want to review quickly?</Heading>
              <Text color="gray.600" mt={2}>
                Use the <strong>Employee Demo</strong> link to preview the UI without running the backend.
              </Text>
            </Box>
            <Button as={RouterLink} to="/employee-demo" colorScheme="blue" size="lg">
              Open demo
            </Button>
          </HStack>
        </Box>
      </Container>
    </Box>
  );
}

/* small Feature subcomponent */
function Feature({ icon: IconCmp, title, desc }) {
  return (
    <HStack spacing={4} align="start" bg="white" p={5} borderRadius="md" boxShadow="sm">
      <Icon as={IconCmp} w={7} h={7} color="blue.500" />
      <Box>
        <Text fontWeight="bold">{title}</Text>
        <Text fontSize="sm" color="gray.600">{desc}</Text>
      </Box>
    </HStack>
  );
}
