import { prisma } from '../prisma'
import { config } from '../config'

// ---------------------------------------------------------------------------
// Loyalty: points (1 point = ৳1) earned on delivery and spendable at checkout,
// plus a referral bonus paid to both people on the friend's first delivery.
// ---------------------------------------------------------------------------

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I

function randomCode(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

/** A referral code that's unique across users. */
export async function generateReferralCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = 'BT' + randomCode(6)
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
    if (!exists) return code
  }
  return 'BT' + randomCode(9)
}

/** Points a given order subtotal will earn (credited on delivery). */
export function pointsForOrder(subtotal: number): number {
  return Math.max(0, Math.round(subtotal * config.loyalty.earnRate))
}

/**
 * Credit earned points when an order is delivered (once), and pay the referral
 * bonus to the customer + their referrer on the customer's first delivery.
 */
export async function awardOnDelivered(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || !order.userId || order.pointsAwarded) return
  const reward = config.loyalty.referralReward
  await prisma.$transaction(async (tx) => {
    if (order.pointsEarned > 0) {
      await tx.user.update({ where: { id: order.userId! }, data: { points: { increment: order.pointsEarned } } })
    }
    await tx.order.update({ where: { id: order.id }, data: { pointsAwarded: true } })

    const user = await tx.user.findUnique({ where: { id: order.userId! } })
    if (user && user.referredBy && !user.referralRewarded) {
      const referrer = await tx.user.findUnique({ where: { referralCode: user.referredBy } })
      if (referrer && referrer.id !== user.id) {
        await tx.user.update({ where: { id: referrer.id }, data: { points: { increment: reward } } })
        await tx.user.update({ where: { id: user.id }, data: { points: { increment: reward }, referralRewarded: true } })
      } else {
        await tx.user.update({ where: { id: user.id }, data: { referralRewarded: true } })
      }
    }
  })
}

/** Give back points that were redeemed on an order that's cancelled/refunded. */
export async function refundRedeemedPoints(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || !order.userId || order.pointsRedeemed <= 0) return
  await prisma.$transaction([
    prisma.user.update({ where: { id: order.userId }, data: { points: { increment: order.pointsRedeemed } } }),
    prisma.order.update({ where: { id: order.id }, data: { pointsRedeemed: 0 } }),
  ])
}