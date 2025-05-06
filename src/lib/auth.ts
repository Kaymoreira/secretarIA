import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DefaultSession } from "next-auth";
import { User } from "@/server/models/User";
import { connectToDatabase } from "@/lib/mongoose";
import { comparePasswords } from "@/utils/encryption";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Por favor, defina NEXTAUTH_SECRET no arquivo .env');
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email e senha são obrigatórios');
          }

          await connectToDatabase();
          
          const user = await User.findOne({ email: credentials.email });
          if (!user) {
            throw new Error('Usuário não encontrado');
          }

          const isValidPassword = await comparePasswords(credentials.password, user.password);
          if (!isValidPassword) {
            throw new Error('Senha incorreta');
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name
          };
        } catch (error) {
          console.error('Erro na autenticação:', error);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login', // Página para onde redirecionar em caso de erro
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  debug: process.env.NODE_ENV === 'development',
}; 