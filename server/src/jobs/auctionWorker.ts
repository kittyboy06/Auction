import { Worker, Job } from 'bullmq';
import { connection } from './auctionQueue';
import { prisma, redisPublisher } from '../index';

export const auctionWorker = new Worker(
  'AuctionResolutionQueue',
  async (job: Job) => {
    const { auctionId } = job.data;
    console.log(`[Worker] Resolving auction ${auctionId}...`);

    try {
      // Find the auction and ensure it's ACTIVE
      const auction = await prisma.auction.findUnique({ where: { id: auctionId } });

      if (!auction) {
        throw new Error('Auction not found during resolution task.');
      }

      if (auction.status === 'CLOSED') {
        console.log(`[Worker] Auction ${auctionId} is already closed.`);
        return;
      }

      // Transition to CLOSED
      const closedAuction = await prisma.auction.update({
        where: { id: auctionId },
        data: { status: 'CLOSED' }
      });

      console.log(`[Worker] Successfully closed auction ${auctionId}. Winner ID: ${closedAuction.highest_bidder_id || 'None (No valid bids)'}. Final Price: ${closedAuction.current_highest_bid}`);

      // Broadcast the CLOSED state to clients so UI responds instantly
      redisPublisher.publish('auction_updates', JSON.stringify({
        auction_id: auctionId,
        type: 'AUCTION_CLOSED',
        winner_id: closedAuction.highest_bidder_id,
        final_amount: closedAuction.current_highest_bid
      }));

    } catch (error) {
      console.error(`[Worker] Failed to resolve auction ${auctionId}:`, error);
      throw error;
    }
  },
  { connection }
);

auctionWorker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} has completed!`);
});

auctionWorker.on('failed', (job, err) => {
  console.log(`[BullMQ] Job ${job?.id} has failed with ${err.message}`);
});
