import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// Create the Queue for Auction Resolutions
export const auctionQueue = new Queue('AuctionResolutionQueue', { connection });

export const scheduleAuctionClosure = async (auctionId: string, delayInMs: number) => {
  await auctionQueue.add(
    'resolveAuction',
    { auctionId },
    { delay: delayInMs, jobId: `resolve_auction_${auctionId}` }
  );
  console.log(`Scheduled closure for auction ${auctionId} in ${delayInMs} ms`);
};
