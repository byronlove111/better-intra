import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

const healthSchema = z.object({
  status: z.string(),
  service: z.string().optional(),
})

export type HealthResponse = z.infer<typeof healthSchema>

export async function getHealth(): Promise<HealthResponse> {
  const data = await apiClient<unknown>('/health')
  return healthSchema.parse(data)
}
