import { NextResponse } from 'next/server';
import { getPublicConfigProfile } from '@/app/utils/config';
import { serverConfigUpdateSchema } from '@/lib/schemas/api';
import { authorizeRequest } from '@/lib/server/authorization';
import { updateLocalEnvironment } from '@/lib/server/local-environment';
import { apiErrorResponse, validateJsonRequest } from '@/lib/server/security';

export async function POST(request: Request) {
  const denied = await authorizeRequest(request, 'admin');
  if (denied) return denied;

  try {
    const validated = await validateJsonRequest(request, serverConfigUpdateSchema, 40_000);
    if (!validated.ok) return validated.response;

    const updatedKeys = await updateLocalEnvironment(validated.data);
    return NextResponse.json({
      success: true,
      message: 'Configurações locais salvas. Reinicie a aplicação para aplicar autenticação e variáveis públicas.',
      updatedKeys,
      config: getPublicConfigProfile(),
      restartRequired: updatedKeys.some((key) => key.startsWith('NEXT_PUBLIC_') || key.startsWith('CLERK_')),
    });
  } catch (error: unknown) {
    return apiErrorResponse(error, request.headers.get('x-request-id') || undefined);
  }
}
