'use client';

import {
  Box,
  Flex,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Container,
  Icon,
} from '@chakra-ui/react';
import { signOut, useSession } from 'next-auth/react';
import { FiLogOut } from 'react-icons/fi';
import { RiAiGenerate } from 'react-icons/ri';

export default function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <Box 
      bg="linear-gradient(to right, #6B46C1, #805AD5)"
      px={4} 
      py={3}
      boxShadow="md"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
            <Icon as={RiAiGenerate} w={6} h={6} color="white" />
            <Text fontSize="xl" fontWeight="bold" color="white">
              SecretarIA
            </Text>
          </Flex>

          {session?.user && (
            <Menu>
              <MenuButton
                _hover={{ opacity: 0.9 }}
                transition="all 0.2s"
              >
                <Flex 
                  align="center" 
                  gap={3}
                  bg="whiteAlpha.200"
                  p={2}
                  borderRadius="full"
                >
                  <Avatar
                    size="sm"
                    name={session.user.name || 'Usuário'}
                    src={session.user.image || undefined}
                  />
                  <Text color="white" fontWeight="medium" pr={2}>
                    {session.user.name}
                  </Text>
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem
                  icon={<FiLogOut />}
                  onClick={handleLogout}
                  color="red.500"
                  _hover={{ bg: 'red.50' }}
                >
                  Sair
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Container>
    </Box>
  );
} 