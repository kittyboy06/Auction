import { Router, Request, Response } from 'express';
import { prisma, redisPublisher } from '../index';
import { authMiddleware } from '../middlewares/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// Bid Endpoint
router.post('/:auctionId/bids', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const user = req.user;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid bid amount is required' });
    }

    if (user.role === 'SELLER') {
      return res.status(400).json({ error: 'Sellers cannot bid on items' });
    }

    // THE BIDDING TRANSACTION
    // Using Prisma Interactive Transaction with specific ISOLATION LEVEL to prevent concurrency issues
    const bidResult = await prisma.$transaction(async (tx) => {
      // 1. SELECT FOR UPDATE to lock the auction row globally
      // Prisma `findUnique` doesn't support raw SELECT FOR UPDATE easily, 
      // so we use a raw query which is the most reliable way to create a Row Exclusive Lock in PostgreSQL.
      
      const auctions: any[] = await tx.$queryRaw(
        Prisma.sql`SELECT * FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`
      );

      if (!auctions || auctions.length === 0) {
        throw new Error('Auction not found');
      }

      const auction = auctions[0];

      // 2. Business Logic Validation
      if (auction.status !== 'ACTIVE') {
        throw new Error('This auction is no longer active');
      }

      const now = new Date();
      if (new Date(auction.end_time) <= now) {
        throw new Error('This auction has expired');
      }

      if (amount <= auction.current_highest_bid) {
        throw new Error(`Bid must be strictly greater than ${auction.current_highest_bid}`);
      }
      
      if (auction.seller_id === user.id) {
        throw new Error('You cannot bid on your own auction');
      }

      // 3. The Writes
      const newBid = await tx.bid.create({
        data: {
          auction_id: auction.id,
          bidder_id: user.id,
          amount: parseFloat(amount)
        }
      });

      const updatedAuction = await tx.auction.update({
        where: { id: auction.id },
        data: {
          current_highest_bid: parseFloat(amount),
          highest_bidder_id: user.id
        }
      });

      return { newBid, updatedAuction };
    });

    // Transaction committed successfully, broadcast the event to Redis
    const broadcastPayload = {
      auction_id: auctionId,
      new_bid_amount: bidResult.updatedAuction.current_highest_bid,
      bidder_id: bidResult.newBid.bidder_id,
      bidder_name: user.name || 'Anonymous', // Assuming token contains name, or fetch.
      timestamp: bidResult.newBid.created_at
    };

    redisPublisher.publish('auction_updates', JSON.stringify(broadcastPayload));

    res.status(201).json({ 
      message: 'Bid placed successfully!', 
      bid: bidResult.newBid,
      current_highest_bid: bidResult.updatedAuction.current_highest_bid
    });

  } catch (error: any) {
    if (error.message.includes('not found') || 
        error.message.includes('no longer active') || 
        error.message.includes('expired') || 
        error.message.includes('strictly greater') ||
        error.message.includes('own auction')) {
       // Known business logic errors
       return res.status(400).json({ error: error.message });     
    }
    console.error('Bidding engine error:', error);
    res.status(500).json({ error: 'Failed to place the bid' });
  }
});

export default router;
