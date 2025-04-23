'use client'

import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Box p={8}>
      <VStack spacing={4} align="center">
        <Heading>Algo deu errado!</Heading>
        <Text>Desculpe pelo inconveniente. Por favor, tente novamente.</Text>
        <Button
          onClick={reset}
          colorScheme="blue"
        >
          Tentar novamente
        </Button>
      </VStack>
    </Box>
  )
} 