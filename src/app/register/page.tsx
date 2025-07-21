'use client';

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Container,
  Link,
  InputGroup,
  InputRightElement,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações básicas
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao registrar usuário');
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você pode fazer login agora.',
        status: 'success',
        duration: 3000,
      });

      router.push('/login');
    } catch (error) {
      toast({
        title: 'Erro no registro',
        description: error instanceof Error ? error.message : 'Erro ao criar conta',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="container.sm" py={10}>
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Flex justifyContent="center" mb={4}>
              <Box 
                bg="purple.500" 
                p={3} 
                borderRadius="md" 
                display="inline-flex" 
                alignItems="center"
                boxShadow="md"
              >
                <Text fontSize="2xl" fontWeight="bold" color="white" mr={2}>SecretarIA</Text>
                <Box 
                  bg="purple.600" 
                  borderRadius="lg" 
                  p={2}
                  position="relative"
                  transform="rotate(12deg)"
                  _hover={{ transform: "rotate(0deg)" }}
                  transition="transform 0.3s"
                >
                  <Box as="svg" 
                    stroke="currentColor" 
                    fill="none" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-5 h-5 text-white" 
                    height="1em" 
                    width="1em" 
                    color="white"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </Box>
                  <Box 
                    position="absolute" 
                    top="-4px" 
                    right="-4px" 
                    width="8px" 
                    height="8px" 
                    bg="purple.300" 
                    borderRadius="full"
                  ></Box>
                  <Box 
                    position="absolute" 
                    bottom="-4px" 
                    left="-4px" 
                    width="8px" 
                    height="8px" 
                    bg="purple.300" 
                    borderRadius="full"
                  ></Box>
                </Box>
              </Box>
            </Flex>
            <Text mt={2} color="gray.600">
              Crie sua conta
            </Text>
          </Box>

          <Box
            as="form"
            onSubmit={handleSubmit}
            p={8}
            borderWidth={1}
            borderRadius="lg"
            boxShadow="lg"
            bg="white"
          >
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Senha</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirmar Senha</FormLabel>
                <InputGroup>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Button
                type="submit"
                colorScheme="purple"
                width="full"
                isLoading={isLoading}
              >
                Criar Conta
              </Button>
            </VStack>
          </Box>

          <Text textAlign="center">
            Já tem uma conta?{' '}
            <Link as={NextLink} href="/login" color="purple.500">
              Faça login
            </Link>
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
