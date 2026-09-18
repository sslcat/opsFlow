import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "./prisma.ts"

const MAX_TRANSACTION_ATTEMPTS = 3

export async function runSerializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      const isRetryableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"

      if (!isRetryableConflict || attempt === MAX_TRANSACTION_ATTEMPTS - 1) {
        throw error
      }
    }
  }

  throw new Error("Serializable transaction failed")
}
