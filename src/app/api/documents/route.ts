import { authorizeApiRequest } from "../../../lib/auth.ts"
import { prisma } from "../../../lib/prisma.ts"
import type { DocumentType } from "@prisma/client"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest("document.upload")
  if (authorization.response) return authorization.response

  // Read request body
  const body = await request.json()

  const {
    fileName,
    type
  } = body

  // Validation
  if (!fileName || !type) {
    return Response.json(
      {
        error: "fileName and type are required"
      },
      {
        status: 400
      }
    )
  }

  // Create document record
  const document =
    await prisma.document.create({
      data: {
        organizationId: authorization.context.organizationId,
        fileName: path.basename(fileName),
        storageKey: `${authorization.context.organizationId}/${uuidv4()}`,
        type: type as DocumentType,
      }
    })

  return Response.json({
    message: "Document created",
    document
  })
}

export async function GET() {
  const authorization = await authorizeApiRequest("document.read")
  if (authorization.response) return authorization.response

  const documents =
    await prisma.document.findMany({
      where: {
        organizationId: authorization.context.organizationId,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

  return Response.json({
    documents
  })
}
