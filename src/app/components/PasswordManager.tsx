import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  Stack,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  HStack,
  useToast,
  SimpleGrid,
  Badge,
  InputGroup,
  InputRightElement,
  Flex,
  Image,
  Divider,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, LockIcon } from '@chakra-ui/icons';
import Logo from './Logo';

interface Credential {
  _id: string;
  title: string;
  login: string;
  password: string;
}

export default function PasswordManager() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [newCredential, setNewCredential] = useState({ title: '', login: '', password: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      const data = await response.json();
      if (data.success) {
        setCredentials(data.credentials);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredential),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Credencial salva com sucesso!',
          status: 'success',
          duration: 3000,
          position: 'top-right',
        });
        fetchCredentials();
        onClose();
        setNewCredential({ title: '', login: '', password: '' });
      }
    } catch (error) {
      console.error('Error saving credential:', error);
      toast({
        title: 'Erro ao salvar credencial',
        description: 'Por favor, tente novamente.',
        status: 'error',
        duration: 3000,
        position: 'top-right',
      });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box>
      <Flex align="center" mb={6}>
        <HStack spacing={6} align="center">
          <Logo />
          <HStack spacing={2}>
            <Divider orientation="vertical" height="20px" borderColor="gray.300" />
            <Text fontSize="xl" color="gray.600" fontWeight="normal">
              Gerenciador de Senhas
            </Text>
          </HStack>
        </HStack>
        <Button
          ml="auto"
          colorScheme="purple"
          size="md"
          onClick={onOpen}
          leftIcon={<LockIcon />}
          boxShadow="sm"
          _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
          transition="all 0.2s"
        >
          Adicionar Nova Senha
        </Button>
      </Flex>

      {credentials.length === 0 ? (
        <Box textAlign="center" py={10}>
          <LockIcon boxSize={12} color="purple.200" mb={4} />
          <Text color="gray.500" fontSize="lg">
            Nenhuma senha salva ainda. Comece adicionando uma nova senha!
          </Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {credentials.map((cred) => (
            <Card
              key={cred._id}
              borderRadius="lg"
              overflow="hidden"
              boxShadow="sm"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
              transition="all 0.2s"
              border="1px solid"
              borderColor="purple.100"
            >
              <CardBody>
                <Stack spacing={3}>
                  <HStack justify="space-between">
                    <Heading size="md" color="purple.700">{cred.title}</Heading>
                    <Badge colorScheme="purple" fontSize="xs" px={2} py={1} borderRadius="full">
                      Seguro
                    </Badge>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>Login</Text>
                    <Text fontWeight="medium">{cred.login}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>Senha</Text>
                    <HStack>
                      <Text fontWeight="medium" fontFamily="monospace">
                        {showPassword[cred._id] ? cred.password : '••••••••'}
                      </Text>
                      <IconButton
                        aria-label={showPassword[cred._id] ? 'Esconder senha' : 'Mostrar senha'}
                        icon={showPassword[cred._id] ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => togglePasswordVisibility(cred._id)}
                        size="sm"
                        variant="ghost"
                        colorScheme="purple"
                      />
                    </HStack>
                  </Box>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Box boxSize={8} bg="purple.500" borderRadius="md" p={1.5}>
                <LockIcon w="100%" h="100%" color="white" />
              </Box>
              <Text>Nova Senha</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Título</FormLabel>
                  <Input
                    value={newCredential.title}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Gmail, Facebook, etc."
                    focusBorderColor="purple.500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Login</FormLabel>
                  <Input
                    value={newCredential.login}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, login: e.target.value }))}
                    placeholder="Seu login ou email"
                    focusBorderColor="purple.500"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Senha</FormLabel>
                  <InputGroup>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newCredential.password}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Sua senha"
                      focusBorderColor="purple.500"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showNewPassword ? 'Esconder senha' : 'Mostrar senha'}
                        icon={showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        size="sm"
                        variant="ghost"
                        colorScheme="purple"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <Button type="submit" colorScheme="purple" size="lg" w="full">
                  Salvar
                </Button>
              </Stack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
} 