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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        // Salvar o email do usuário no localStorage para uso nas notificações por email
        localStorage.setItem('userEmail', email);
        
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: error instanceof Error ? error.message : 'Erro ao fazer login',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro no login com Google',
        description: 'Não foi possível fazer login com o Google',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        Carregando...
      </Box>
    );
  }

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
              Faça login para continuar
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
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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

              <Button
                type="submit"
                colorScheme="purple"
                width="full"
                isLoading={isLoading}
                disabled={isGoogleLoading}
              >
                Entrar
              </Button>

              <Button
                onClick={handleGoogleLogin}
                width="full"
                variant="outline"
                leftIcon={<FcGoogle />}
                isLoading={isGoogleLoading}
                disabled={isLoading}
                loadingText="Conectando com Google"
              >
                Entrar com Google
              </Button>
            </VStack>
          </Box>

          <Text textAlign="center">
            Não tem uma conta?{' '}
            <Link as={NextLink} href="/register" color="purple.500">
              Registre-se
            </Link>
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
