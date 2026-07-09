import { config } from '../config'

// ---------------------------------------------------------------------------
// Courier integration (Bangladesh: Pathao, Steadfast, RedX).
//
// Provider-agnostic: each provider has a `createConsignment` that calls the
// real API when merchant credentials are configured, and otherwise returns a
// MOCK tracking code so the whole flow works in development. Fill in the
// credentials (see .env.example) and the real API calls below to go live.
// ---------------------------------------------------------------------------

export const COURIERS = ['pathao', 'steadfast', 'redx'] as const
export type Courier = (typeof COURIERS)[number]

export interface ConsignmentInput {
  orderId: string
  name: string
  phone: string
  address: string
  city: string
  amount: number // COD amount to collect (0 for prepaid)
  itemsCount: number
}

export interface ConsignmentResult {
  trackingCode: string
  mock: boolean
}

const mock = (provider: Courier, orderId: string): ConsignmentResult => ({
  trackingCode: `${provider.toUpperCase()}-${orderId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  mock: true,
})

// Steadfast Courier — https://portal.packzy.com/api/v1
async function steadfast(input: ConsignmentInput): Promise<ConsignmentResult> {
  const creds = config.courier.steadfast
  if (!creds.apiKey || !creds.secret) return mock('steadfast', input.orderId)
  const res = await fetch('https://portal.packzy.com/api/v1/create_order', {
    method: 'POST',
    headers: { 'Api-Key': creds.apiKey, 'Secret-Key': creds.secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice: input.orderId,
      recipient_name: input.name,
      recipient_phone: input.phone,
      recipient_address: `${input.address}, ${input.city}`,
      cod_amount: input.amount,
      note: `${input.itemsCount} item(s)`,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { consignment?: { tracking_code?: string } }
  const code = data.consignment?.tracking_code
  if (!res.ok || !code) throw new Error('Steadfast: could not create consignment')
  return { trackingCode: code, mock: false }
}

// Pathao / RedX real integrations follow the same shape — add their API calls
// here once you have a merchant account. Until then they return a mock code.
async function pathao(input: ConsignmentInput): Promise<ConsignmentResult> {
  const creds = config.courier.pathao
  if (!creds.clientId) return mock('pathao', input.orderId)
  // TODO: OAuth token + POST /aladdin/api/v1/orders — see Pathao merchant docs.
  return mock('pathao', input.orderId)
}

async function redx(input: ConsignmentInput): Promise<ConsignmentResult> {
  const creds = config.courier.redx
  if (!creds.apiToken) return mock('redx', input.orderId)
  // TODO: POST https://openapi.redx.com.bd/v1.0.0-beta/parcel — see RedX docs.
  return mock('redx', input.orderId)
}

export async function createConsignment(provider: Courier, input: ConsignmentInput): Promise<ConsignmentResult> {
  switch (provider) {
    case 'steadfast':
      return steadfast(input)
    case 'pathao':
      return pathao(input)
    case 'redx':
      return redx(input)
    default:
      return mock(provider, input.orderId)
  }
}
