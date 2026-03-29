import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authMiddleware } from '../middlewares/auth';
import { scheduleAuctionClosure } from '../jobs/auctionQueue';

const router = Router();

// Create new auction
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, image_url, start_price, duration_in_minutes } = req.body;
    const user = req.user;

    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only sellers can create auctions' });
    }

    if (!title || !description || start_price === undefined || !duration_in_minutes) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    const end_time = new Date(Date.now() + duration_in_minutes * 60000);

    const auction = await prisma.auction.create({
      data: {
        title,
        description,
        image_url,
        start_price,
        current_highest_bid: start_price, // Initially, highest bid starts at starting price
        end_time,
        seller_id: user.id
      }
    });

    // Schedule BullMQ job
    const delay = end_time.getTime() - Date.now();
    await scheduleAuctionClosure(auction.id, delay);

    res.status(201).json({ message: 'Auction scheduled successfully', auction });
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

// List Active Auctions
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const auctions = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        end_time: {
          gt: new Date() // Must be in the future
        }
      },
      include: {
        seller: { select: { name: true } },
        highest_bidder: { select: { name: true } }
      },
      orderBy: {
        end_time: 'asc'
      }
    });
    
    res.json(auctions);
  } catch (error) {
    console.error('Fetch auctions error:', error);
    res.status(500).json({ error: 'Failed to list active auctions' });
  }
});

// Get Auction by ID (including Bid history)
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        seller: { select: { name: true } },
        bids: {
          orderBy: { created_at: 'desc' },
          take: 50,
          include: { bidder: { select: { name: true } } }
        }
      }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    res.json(auction);
  } catch (error) {
    console.error('Fetch auction error:', error);
    res.status(500).json({ error: 'Failed to retrieve auction' });
  }
});

export default router;
