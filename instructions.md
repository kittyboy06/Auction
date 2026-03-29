# Live Auction Platform - Design & Architecture Document

## Understanding Summary
- **What is being built:** A unified, real-time auction platform backend serving both a React (Vite) Web client and a React Native mobile application.
- **Why it exists:** To facilitate live, time-limited item auctions where bids need instant reflection across all users watching an item.
- **Who it is for:** Buyers looking for deals, Sellers listing inventory, and Admins overseeing the platform.
- **Key Constraints:** Bids require high transactional integrity to avoid race conditions. Bidders must see live price movements instantly over WebSockets. Scale is low/moderate for the initial release.
- **Explicit Non-goals:** We are strictly excluding AI/ML features, Proxy/Auto-Bidding mechanics, and formal Payment Gateways from this MVP release. 

## Assumptions
- **Performance:** Sub-second latency from a user placing a bid to another user seeing that bid drop on their screen.
- **Infrastructure:** Node.js (TypeScript) API, backed by PostgreSQL for state/transactions, and Redis for fast caching, job queuing, and WebSocket message brokering.
- **Auction Resolution:** A reliable job scheduler (BullMQ on Redis) will handle background tasks specifically to fire exactly when a countdown timer hits zero to mark the winner.
- **Authentication:** Standard secure JWT-based authentication for regular and admin users.

## Decision Log
1. **Target Platform:** Web (React Vite) & Mobile (React Native).
2. **Scale Target:** Low/Moderate MVP initially.
3. **Tech Stack:** Node.js (TypeScript), PostgreSQL, Redis.
4. **Scope Constraint:** Core features only (exclude AI, Proxy Bidding, Payments).
5. **Architecture Approach:** The Queue + Pub/Sub Architecture (Node.js API + PostgreSQL Transactions + Redis Pub/Sub + BullMQ scheduling).

## Final Design

### Part 1: Architecture & Core Entities (Database)
We will build a central Node.js/Express API connected to PostgreSQL. Here is the core state structure:

1. **Users Table**
   - Fields: `id, name, email, password_hash, role (buyer/seller/admin)`
   - Handles standard JWT authentication. 

2. **Auctions Table**
   - Fields: `id, seller_id, title, description, image_url, start_price, end_time, status (active/closed)`
   - *Crucial fields:* `current_highest_bid` (denormalized for fast reads) and `highest_bidder_id`. This prevents having to calculate the max bid on the fly every time someone loads the page.

3. **Bids Table (Immutable Ledger)**
   - Fields: `id, auction_id, bidder_id, amount, created_at`
   - This is append-only. Insertions only proceed if the incoming bid amount is strictly greater than the `Auctions.current_highest_bid`. 

### Part 2: The Bidding Data Flow & WebSockets
When a user clicks "Bid $50":

1. **The Request:** The Web/Mobile client sends an HTTP `POST /api/auctions/:id/bids` with the `amount`.
2. **The Lock (Concurrency Control):** The backend starts a PostgreSQL Transaction. It runs a `SELECT * FROM auctions WHERE id = X FOR UPDATE` query to lock the row and prevent overlapping bids.
3. **The Validation:** The server checks if `status == 'active'` and `amount > current_highest_bid`. If false, the transaction rolls back returning a `400 Bad Request`.
4. **The Write:** If true, the system writes the new bid to the `Bids` table and updates `Auctions.current_highest_bid`.
5. **The Broadcast:** The transaction commits. The Node.js server immediately fires a message (`NEW_BID`) to **Redis Pub/Sub** on a channel specific to that auction.
6. **The Live Update:** Every connected client listening to that auction via **WebSockets** receives the Redis message instantly pushed down to their screen, updating the UI price dynamically.

### Part 3: Auction Resolution (The Background Worker)
To guarantee an auction closes exactly when it is supposed to:

1. **Job Scheduling:** When a new auction is created via the API, the backend calculates the delay until the end time and pushes a delayed job payload to **BullMQ** (powered by Redis).
2. **The Waiting:** BullMQ securely holds this job in Redis memory.
3. **Execution Delivery:** Exactly when the auction timer expires, BullMQ picks up the job and triggers the **Resolution Worker**.
4. **Resolution Task:**
   - The worker executes a database update: `UPDATE auctions SET status = 'closed' WHERE id = X AND status = 'active'`.
   - The worker runs logic to query the highest bid, identify the winning user, and save the result.
   - It triggers standard notification events (e.g., sending an email or push notification to the winner and the seller).
5. **The Edge Case (Simultaneous Last-Second Bid):** Because all bids check `end_time > NOW()` inside their strict database transaction, any bid arriving at the exact closing second will mathematically fail. The job worker processing the resolution ensures the auction transitions gracefully to a closed state.