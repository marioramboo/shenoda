import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

let activePrisma: PrismaClient =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = activePrisma;
}

export const setPrismaClient = (client: PrismaClient) => {
  activePrisma = client;
};

export const getPrismaClient = (): PrismaClient => activePrisma;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (activePrisma as any)[prop];
  },
  set(_target, prop, value) {
    (activePrisma as any)[prop] = value;
    return true;
  },
});

