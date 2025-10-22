import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  colors: {
    brand: {
      50: '#f5faff',
      100: '#e6f2ff',
      200: '#cce5ff',
      300: '#99ccff',
      400: '#66b3ff',
      500: '#339aff',
      600: '#007fff',
      700: '#0066cc',
      800: '#004c99',
      900: '#003366',
    },
  },
  components: {
    Button: {
      baseStyle: {
        rounded: 'md',
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'blue.400',
      },
    },
  },
})

export default theme
