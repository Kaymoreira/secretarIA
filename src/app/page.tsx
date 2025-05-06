'use client';

import dynamic from 'next/dynamic';
import { Box, Container, Flex, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from './components/Header';

const Calendar = dynamic(() => import('./components/Calendar'), {
  ssr: false,
  loading: () => <div>Carregando...</div>
});

const Chat = dynamic(() => import('./components/Chat'), {
  ssr: false,
  loading: () => <div>Carregando...</div>
});

const PasswordManager = dynamic(() => import('./components/PasswordManager'), {
  ssr: false,
  loading: () => <div>Carregando...</div>
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('calendar');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        Carregando...
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <VStack minH="100vh" bg="gray.50" spacing={0}>
      <Header />
      <Container maxW="container.xl" py={4} flex="1">
        <Box 
          bg="white" 
          borderRadius="lg" 
          boxShadow="lg" 
          overflow="hidden"
        >
          <Flex borderBottom="1px" borderColor="gray.200">
            <Box
              as="button"
              px={8}
              py={4}
              fontWeight="semibold"
              color={activeTab === 'calendar' ? 'white' : 'gray.600'}
              bg={activeTab === 'calendar' ? 'purple.500' : 'transparent'}
              onClick={() => setActiveTab('calendar')}
              _hover={{ bg: activeTab === 'calendar' ? 'purple.600' : 'gray.100' }}
              transition="all 0.2s"
              borderRight="1px"
              borderColor="gray.200"
            >
              Calendário
            </Box>
            <Box
              as="button"
              px={8}
              py={4}
              fontWeight="semibold"
              color={activeTab === 'chat' ? 'white' : 'gray.600'}
              bg={activeTab === 'chat' ? 'purple.500' : 'transparent'}
              onClick={() => setActiveTab('chat')}
              _hover={{ bg: activeTab === 'chat' ? 'purple.600' : 'gray.100' }}
              transition="all 0.2s"
              borderRight="1px"
              borderColor="gray.200"
            >
              Chat
            </Box>
            <Box
              as="button"
              px={8}
              py={4}
              fontWeight="semibold"
              color={activeTab === 'passwords' ? 'white' : 'gray.600'}
              bg={activeTab === 'passwords' ? 'purple.500' : 'transparent'}
              onClick={() => setActiveTab('passwords')}
              _hover={{ bg: activeTab === 'passwords' ? 'purple.600' : 'gray.100' }}
              transition="all 0.2s"
            >
              Senhas
            </Box>
          </Flex>

          <Box p={6} minH="calc(100vh - 180px)">
            {activeTab === 'calendar' && <Calendar />}
            {activeTab === 'chat' && <Chat />}
            {activeTab === 'passwords' && <PasswordManager />}
          </Box>
        </Box>
      </Container>
    </VStack>
  );
} 