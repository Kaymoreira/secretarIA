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
  Heading,
  Link,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
    <Container maxW="container.sm" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading>SecretarIA</Heading>
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
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                disabled={isLoading || isGoogleLoading}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
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
          <Link as={NextLink} href="/register" color="blue.500">
            Registre-se
          </Link>
        </Text>
      </VStack>
    </Container>
  );
} 