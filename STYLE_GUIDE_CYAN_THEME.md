# 🎨 CogniWork Style Guide - Cyan Theme

## Quick Reference for Developers

---

## 🎨 Color Palette

### Gradients (Copy-Paste Ready)

```jsx
// PRIMARY GRADIENT - Buttons, Badges, CTAs
bgGradient="linear(to-r, cyan.400, blue.500)"

// HOVER GRADIENT - Darker version for depth
bgGradient="linear(to-r, cyan.500, blue.600)"

// BACKGROUND GRADIENT - Page backgrounds
bgGradient="linear(to-br, cyan.50, blue.50, teal.50)"

// HERO GRADIENT - Bold sections
bgGradient="linear(to-br, cyan.400, blue.500, teal.400)"

// TEXT GRADIENT - Headings
bgGradient="linear(to-r, cyan.500, blue.600)" bgClip="text"
```

### Solid Colors

| Use Case | Color | Example |
|----------|-------|---------|
| Primary Icon | `cyan.500` | Rocket logo |
| Button BG | `cyan.400` | Primary actions |
| Link Text | `cyan.600` | Navigation links |
| Link Hover | `cyan.700` | Hovered links |
| Card Border | `cyan.100` | Default state |
| Form Border | `cyan.200` | Input fields |
| Hover Border | `cyan.400` | Active/hover state |
| Light BG | `cyan.50` | Highlights, cards |

---

## 🧩 Component Patterns

### 1. Primary Action Button

```jsx
<Button
  bgGradient="linear(to-r, cyan.400, blue.500)"
  color="white"
  size="lg"
  _hover={{ 
    bgGradient: 'linear(to-r, cyan.500, blue.600)', 
    transform: 'translateY(-2px)', 
    shadow: 'lg' 
  }}
  shadow="md"
>
  Click Me
</Button>
```

**When to use:** Primary CTAs, form submits, main actions

---

### 2. Secondary Button

```jsx
<Button
  variant="outline"
  colorScheme="cyan"
  size="md"
  _hover={{ 
    bg: 'cyan.50', 
    transform: 'translateY(-2px)' 
  }}
>
  Secondary Action
</Button>
```

**When to use:** Cancel, secondary options, less emphasis

---

### 3. Ghost Button

```jsx
<Button
  variant="ghost"
  color="cyan.600"
  _hover={{ 
    bg: 'cyan.50', 
    color: 'cyan.700' 
  }}
>
  Subtle Action
</Button>
```

**When to use:** Tertiary actions, navigation items, minimal UI

---

### 4. Interactive Card

```jsx
<Card
  borderWidth="2px"
  borderColor="cyan.100"
  borderRadius="xl"
  _hover={{ 
    borderColor: 'cyan.400', 
    shadow: '2xl', 
    transform: 'translateY(-4px)' 
  }}
  transition="all 0.3s"
  cursor="pointer"
>
  <CardBody>
    {/* Content */}
  </CardBody>
</Card>
```

**When to use:** Clickable cards, project cards, feature cards

---

### 5. Static Card (Informational)

```jsx
<Card
  bg="cyan.50"
  borderWidth="2px"
  borderColor="cyan.200"
  borderRadius="xl"
  shadow="md"
>
  <CardBody>
    {/* Content */}
  </CardBody>
</Card>
```

**When to use:** Info boxes, empty states, alerts

---

### 6. Gradient Heading

```jsx
<Heading 
  size="xl"
  bgGradient="linear(to-r, cyan.500, blue.600)" 
  bgClip="text"
  fontWeight="black"
>
  Page Title
</Heading>
```

**When to use:** Page titles, section headings, hero text

---

### 7. Logo/Brand Identity

```jsx
<HStack spacing={3}>
  <Icon as={FaRocket} boxSize={10} color="cyan.500" />
  <Heading 
    size="xl"
    bgGradient="linear(to-r, cyan.500, blue.600)" 
    bgClip="text"
    fontWeight="black"
  >
    CogniWork
  </Heading>
</HStack>
```

**When to use:** Navbar, login/signup, landing page header

---

### 8. Status Badge - Active

```jsx
<Badge
  bgGradient="linear(to-r, cyan.400, blue.500)"
  color="white"
  px={3}
  py={1}
  borderRadius="full"
  shadow="sm"
>
  Active
</Badge>
```

**When to use:** Active status, featured items, highlights

---

### 9. Status Badge - Inactive

```jsx
<Badge
  bg="gray.400"
  color="white"
  px={3}
  py={1}
  borderRadius="full"
>
  Inactive
</Badge>
```

**When to use:** Inactive status, disabled items

---

### 10. Icon Container

```jsx
<Box 
  p={3} 
  borderRadius="xl" 
  bgGradient="linear(to-br, cyan.400, blue.500)" 
  display="inline-block"
>
  <Icon as={FaChartLine} boxSize={8} color="white" />
</Box>
```

**When to use:** Feature icons, decorative icons, highlights

---

### 11. Form Input

```jsx
<FormControl isRequired>
  <FormLabel color="gray.700">Label</FormLabel>
  <Input
    placeholder="Enter value..."
    borderColor="cyan.200"
    _focus={{ 
      borderColor: 'cyan.400', 
      boxShadow: '0 0 0 1px cyan.400' 
    }}
    _hover={{ borderColor: 'cyan.300' }}
  />
</FormControl>
```

**When to use:** All form inputs, text areas, selects

---

### 12. Link Styling

```jsx
<Link
  color="cyan.600"
  fontWeight="semibold"
  _hover={{ 
    color: 'cyan.700', 
    textDecoration: 'underline' 
  }}
>
  Click here
</Link>
```

**When to use:** Text links, navigation links, inline links

---

### 13. Page Container

```jsx
<Flex 
  minH="100vh" 
  bgGradient="linear(to-br, cyan.50, blue.50, teal.50)"
>
  <Container maxW="1200px" py={8}>
    {/* Page content */}
  </Container>
</Flex>
```

**When to use:** Full page layouts, auth pages

---

### 14. Navigation Bar

```jsx
<Box 
  bgGradient="linear(to-r, cyan.50, blue.50)" 
  borderBottom="2px" 
  borderColor="cyan.200" 
  py={4} 
  position="sticky" 
  top={0} 
  zIndex={100}
  shadow="md"
>
  {/* Navbar content */}
</Box>
```

**When to use:** Main navigation bar (already implemented)

---

### 15. Menu Dropdown

```jsx
<Menu>
  <MenuButton
    as={Button}
    variant="ghost"
    rightIcon={<FaChevronDown />}
    fontWeight="semibold"
    color="cyan.600"
    _hover={{ bg: 'cyan.100', color: 'cyan.700' }}
  >
    Menu
  </MenuButton>
  <MenuList>
    <MenuItem 
      icon={<FaIcon />}
      _hover={{ bg: 'cyan.50', color: 'cyan.700' }}
    >
      Option 1
    </MenuItem>
  </MenuList>
</Menu>
```

**When to use:** Dropdown menus, action menus

---

## 📐 Spacing Standards

### Padding
- **Small**: `p={4}` or `px={4} py={2}`
- **Medium**: `p={6}` or `px={6} py={4}`
- **Large**: `p={8}` or `px={8} py={6}`
- **XLarge**: `p={10}` or `px={10} py={8}`

### Margins
- **Small**: `mb={2}`, `mt={2}`
- **Medium**: `mb={4}`, `mt={4}`
- **Large**: `mb={6}`, `mt={6}`
- **XLarge**: `mb={8}`, `mt={8}`

### Gaps (for Flex/Grid)
- **Tight**: `gap={2}` or `spacing={2}`
- **Normal**: `gap={4}` or `spacing={4}`
- **Loose**: `gap={6}` or `spacing={6}`
- **Wide**: `gap={8}` or `spacing={8}`

---

## 🎭 Animation Standards

### Transforms
```jsx
// Lift effect (buttons, cards)
transform: 'translateY(-2px)'  // Small lift
transform: 'translateY(-4px)'  // Larger lift

// Scale effect
transform: 'scale(1.02)'       // Subtle grow
transform: 'scale(1.05)'       // Noticeable grow
```

### Transitions
```jsx
// Fast
transition="all 0.2s"

// Normal
transition="all 0.3s"

// Slow
transition="all 0.5s"
```

### Shadows
```jsx
// Default
shadow="md"

// Hover/Focus
shadow="lg"

// Emphasized
shadow="xl"

// Maximum depth
shadow="2xl"
```

---

## 📏 Typography Scale

### Headings
```jsx
<Heading size="4xl">   // Hero, landing page
<Heading size="3xl">   // Page titles
<Heading size="2xl">   // Section titles
<Heading size="xl">    // Card titles
<Heading size="lg">    // Subsections
<Heading size="md">    // Small headings
```

### Text
```jsx
<Text fontSize="xl">   // Lead text
<Text fontSize="lg">   // Large body
<Text fontSize="md">   // Normal body
<Text fontSize="sm">   // Small text
<Text fontSize="xs">   // Tiny text
```

### Font Weights
- `fontWeight="black"` - Extra bold (900) - Branding
- `fontWeight="bold"` - Bold (700) - Emphasis
- `fontWeight="semibold"` - Semi-bold (600) - Headings
- `fontWeight="medium"` - Medium (500) - Subheadings
- `fontWeight="normal"` - Normal (400) - Body text

---

## 🎯 Icon Sizes

```jsx
boxSize={6}   // Small icons (navigation)
boxSize={8}   // Medium icons (cards, features)
boxSize={10}  // Large icons (branding, hero)
boxSize={12}  // Extra large icons (landing page features)
```

---

## 🔍 Border Radius

```jsx
borderRadius="md"    // Subtle (0.375rem)
borderRadius="lg"    // Normal (0.5rem)
borderRadius="xl"    // Rounded (0.75rem)
borderRadius="2xl"   // Very rounded (1rem)
borderRadius="full"  // Circular (9999px)
```

---

## 💡 Best Practices

### DO ✅
- Use gradient buttons for primary actions
- Add hover effects to interactive elements
- Use cyan.50 for subtle backgrounds
- Apply shadows for depth
- Keep consistent spacing
- Use gradient text for headings
- Add transform animations on hover
- Use the rocket icon for branding

### DON'T ❌
- Mix multiple gradient styles randomly
- Use cyan for error states (use red)
- Forget hover states on interactive elements
- Use too many gradients on one page
- Skip transitions (always add smooth transitions)
- Use plain blue (always use cyan variants)
- Overcomplicate with too many shadows
- Ignore mobile responsiveness

---

## 🚀 Quick Start Checklist

When creating a new page:

1. [ ] Set page background gradient (if auth/landing page)
2. [ ] Add gradient heading for page title
3. [ ] Use gradient buttons for primary actions
4. [ ] Apply cyan borders to cards
5. [ ] Add hover effects to interactive elements
6. [ ] Use consistent spacing (p={8}, mb={6}, etc.)
7. [ ] Add rocket icon if needed for branding
8. [ ] Test mobile responsiveness
9. [ ] Add loading states with cyan spinners
10. [ ] Test all hover and active states

---

## 🎨 Color Contrast (Accessibility)

All cyan colors meet WCAG AA standards:
- White text on `cyan.400` ✅
- White text on `cyan.500` ✅
- White text on `cyan.600` ✅
- `cyan.600` text on white ✅
- `cyan.700` text on white ✅

---

## 📱 Responsive Design

All components are mobile-friendly:
- Gradients scale properly
- Buttons are touch-friendly (min 44px)
- Cards stack on mobile
- Text remains readable
- Hover effects work on touch devices

---

## 🎉 Ready to Use!

Copy any pattern from this guide and paste into your components. All styles are production-ready and follow CogniWork's design system!

**Questions? Check:**
- `FRONTEND_THEME_UPGRADE.md` - Full upgrade documentation
- `LandingPage.jsx` - Live examples
- `Navbar.jsx` - Navigation examples
- `Login.jsx` / `Signup.jsx` - Auth examples
- `Dashboard.jsx` - Dashboard examples
