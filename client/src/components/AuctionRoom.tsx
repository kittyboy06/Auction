import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getAuctions, getAuction, placeBid, type Auction, type Bid } from '../services/api';
import { getSocket, joinAuction, leaveAuction } from '../services/socket';


const GALLERY_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDq0Xufy3zrSkT7DooJFbqPdVRUu2RiFpk0OCyAMMHUJ2fXRfMIOcAe_i9y7MgDHjtcdcs4HVYS_4x7_EMalomPqKnTvZZi0iCzZLNPVdOWwEKgzqeGAgcSLk-DGID5PFwbOBJyIkNDZrz7GfgR7U5zbf3peUG76iaWwIvKH_Twnb9PuQOt6e2e7NbSziX_EEyYRAqR3xBlGItQNJfa6IEu4q7C6ziF9I6xxrDhb-uR7PfEHUiLiKP-XSD5FcEpfnD-M1SdR3Pg9gM',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDA-VcWFTuqemSVyApYNVOpwJ2wRQ9HFoQbtc5usqz2Ga-vHIXlu4hugypLSgSFtVVehBD7gzv8zkNQgQAGTJH7ZThERZa2v8EnxxlWizXWxKc2reyZ-0xGHt4133bzhDkzzyiyWR7HMYJ-NT4lcQK21hzx7f-qtc_ychvThtl5rfS10Y96SvqsLR0NiNNR87ceMRjiez9_29WcB6h2EXsSWZcOLeb5Tizr3aSshWX1NtS7ehHAddR5HoBf1K27mcIRxsrwGdyyixo',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFzYUS8zybjs3q6HmeLROHrF4RM4jAcnm0Oq6pLbAZFK5JiV2_aXSbgSV_G3946rqVK-cn_qF1Cr4UClYa-c06Ith6T12EP1Qu0ICxzNwUc73460g_OMmZdlI_RSHlBHKugyW0eNM0lST7aska7FMBkyEfMxMbjYacpJHr2U6wZnG79io56REJBF_ige9co8X3PC-lrzDxcHloDj_QiaKpIhA5sxN2ChHXVh1Jyr810KoOH1NNNJO8TCDtXYvBZXczdWq10lMUys8',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCbkJweJwSUeWbEV2Smlox_aQkNYxGSIFJV9paDor5N9mcKB6f2_2xh67VWlWcxthntyYKt98sULKwvCkNREiTWOfbGYCMyejgGQBS8Zv1Jq-aY2x-GNMZ5mP6m1R6eGoEDCIigp6M1Vc608b8gtRXFDRAmHlPYZkjT2MRw4aWDIhh0ksqsqPP7Y3B5BeNklARCsRcjlHCaEgpadLj_gyCdDv-UoVs6hrqzHYVpxtg11AF5HDJglLWYXgiF_kfVqKFsCFdwG4bN6v0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDQRFbvzhht2i-C1rAcGFgRSPt37S9ZMJ5lXjSgeetz1W5ATfKvWxrw81wFJ4w75qqshdWegBz1EL_ubniBGYa7bIyU_lzX9JLtofjLMMHuet_ZIwuonPhC3vdCW9oo8oMhMth0clxDvjaLTlryAXJI6IbLyhpG-qhZmNkHtFZlizQLpd8eHReLB8NCPGmqvr3EYy0PZhUxemYnqfobJBzGzdpSNeivHbCn2jWTW8jspiCZgJ4QqNFAHZn4vKVhrxWfK9XgDVfwNIg',
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const formatTimeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Seconds ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const AuctionRoom: React.FC = () => {

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [mainImage, setMainImage] = useState(0);
  const bidHistoryRef = useRef<HTMLDivElement>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load auction data
  useEffect(() => {
    const loadAuction = async () => {
      try {
        const res = await getAuctions();
        if (res.data.length > 0) {
          const firstAuction = res.data[0];
          const detail = await getAuction(firstAuction.id);
          setAuction(detail.data);
          setBids(detail.data.bids || []);
        }
      } catch {
        showToast('Failed to load auction', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadAuction();
  }, [showToast]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!auction) return;

    const socket = getSocket();
    joinAuction(auction.id);

    socket.on('new_bid', (data: any) => {
      setAuction(prev => prev ? { ...prev, current_highest_bid: data.new_bid_amount } : prev);
      setBids(prev => [{
        id: crypto.randomUUID(),
        amount: data.new_bid_amount,
        created_at: data.timestamp || new Date().toISOString(),
        bidder: { name: data.bidder_name || 'Anonymous' },
      }, ...prev]);
    });

    return () => {
      leaveAuction(auction.id);
      socket.off('new_bid');
    };
  }, [auction?.id]);

  // Countdown timer
  useEffect(() => {
    if (!auction) return;

    const tick = () => {
      const remaining = new Date(auction.end_time).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        hours: Math.floor(remaining / 3600000),
        minutes: Math.floor((remaining % 3600000) / 60000),
        seconds: Math.floor((remaining % 60000) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  // Handle bid placement
  const handlePlaceBid = async () => {
    if (!auction || !bidAmount) return;

    const parsedAmount = parseFloat(bidAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= auction.current_highest_bid) {
      showToast(`Bid must be greater than ${formatCurrency(auction.current_highest_bid)}`, 'error');
      return;
    }

    setBidding(true);
    try {
      await placeBid(auction.id, parsedAmount);
      setBidAmount('');
      showToast('Bid placed successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to place bid', 'error');
    } finally {
      setBidding(false);
    }
  };

  // Quick bid handler
  const handleQuickBid = (increment: number) => {
    if (!auction) return;
    const newAmount = auction.current_highest_bid + increment;
    setBidAmount(newAmount.toString());
  };

  if (loading) {
    return (
      <main className="main-container">
        <div className="auction-grid">
          <div>
            <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: '0.75rem' }} />
            <div className="skeleton" style={{ height: 200, marginTop: '3rem', borderRadius: '1rem' }} />
          </div>
          <div>
            <div className="skeleton" style={{ height: 500, borderRadius: '1rem' }} />
          </div>
        </div>
      </main>
    );
  }

  if (!auction) {
    return (
      <main className="main-container">
        <div style={{ textAlign: 'center', paddingTop: '8rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#64748b' }}>gavel</span>
          <h2 className="font-headline" style={{ color: 'white', marginTop: '1rem', fontSize: '1.5rem', fontWeight: 800 }}>
            No Active Auctions
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
            Check back soon — new items drop regularly.
          </p>
        </div>
      </main>
    );
  }

  const isExpired = countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <main className="main-container">
      <div className="auction-grid">
        {/* LEFT COLUMN — Gallery & Details */}
        <div>
          {/* Gallery */}
          <section>
            <div className="gallery-main glass-panel">
              <img
                src={auction.image_url || GALLERY_IMAGES[0]}
                alt={auction.title}
              />
              <div className="gallery-gradient" />
              <div className="gallery-tags">
                <span className="gallery-tag">Exterior</span>
                <span className="gallery-tag inactive">Interior</span>
                <span className="gallery-tag inactive">Engine</span>
              </div>
            </div>
            <div className="gallery-thumbnails">
              {GALLERY_IMAGES.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className={`gallery-thumb glass-panel ${mainImage === i ? 'active' : ''}`}
                  onClick={() => setMainImage(i)}
                >
                  <img src={img} alt={`Detail ${i + 1}`} />
                </div>
              ))}
            </div>
          </section>

          {/* Item Info */}
          <div className="info-grid">
            <div className="info-panel glass-panel">
              <span className="info-lot">Lot #402</span>
              <h1 className="info-title">{auction.title}</h1>
              <p className="info-description">{auction.description}</p>
              <div className="info-badges">
                <div className="info-badge">
                  <span className="material-symbols-outlined filled">verified</span>
                  <span>Authenticated</span>
                </div>
                <div className="info-badge">
                  <span className="material-symbols-outlined filled">history</span>
                  <span>Service History</span>
                </div>
                <div className="info-badge">
                  <span className="material-symbols-outlined filled">workspace_premium</span>
                  <span>Concours Grade</span>
                </div>
              </div>
            </div>
            <div className="specs-panel glass-panel">
              <div>
                <div className="spec-item-label">Year</div>
                <div className="spec-item-value">1961</div>
              </div>
              <div>
                <div className="spec-item-label">Mileage</div>
                <div className="spec-item-value">24,300 Miles</div>
              </div>
              <div>
                <div className="spec-item-label">Engine</div>
                <div className="spec-item-value">2,996 cc Inline-6</div>
              </div>
              <div>
                <div className="spec-item-label">Trans</div>
                <div className="spec-item-value">4-Speed Manual</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Bidding Panel */}
        <div>
          <div className="sidebar-sticky" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="bidding-panel glass-panel bidding-glow">
              {/* Countdown */}
              <div className="countdown-section">
                <span className="countdown-label">
                  {isExpired ? 'Auction Ended' : 'Auction Closing In'}
                </span>
                <div className="countdown-timer">
                  {countdown.hours > 0 && (
                    <>
                      <div className="countdown-digit-group">
                        <span className="countdown-digit urgency-pulse">{pad(countdown.hours)}</span>
                        <span className="countdown-unit">Hr</span>
                      </div>
                      <span className="countdown-separator">:</span>
                    </>
                  )}
                  <div className="countdown-digit-group">
                    <span className="countdown-digit urgency-pulse">{pad(countdown.minutes)}</span>
                    <span className="countdown-unit">Min</span>
                  </div>
                  <span className="countdown-separator">:</span>
                  <div className="countdown-digit-group">
                    <span className="countdown-digit urgency-pulse">{pad(countdown.seconds)}</span>
                    <span className="countdown-unit">Sec</span>
                  </div>
                </div>
              </div>

              {/* Current Bid */}
              <div className="current-bid-section">
                <div className="bid-header">
                  <div>
                    <div className="current-bid-label">Current Highest Bid</div>
                    <h2 className="current-bid-amount">{formatCurrency(auction.current_highest_bid)}</h2>
                  </div>
                  <div className="status-badge">
                    <div className="status-dot" />
                    <span className="status-text">{isExpired ? 'Closed' : 'Active'}</span>
                  </div>
                </div>

                {/* Bid History */}
                <div className="bid-history custom-scrollbar" ref={bidHistoryRef}>
                  {bids.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontFamily: 'var(--font-label)', fontSize: '0.8rem' }}>
                      No bids yet — be the first!
                    </div>
                  ) : (
                    bids.map((bid, i) => (
                      <div key={bid.id} className={`bid-entry ${i === 0 ? 'latest bid-flash' : ''}`}>
                        <div className="bid-entry-left">
                          <div className={`bid-avatar ${i === 0 ? 'primary' : 'neutral'}`}>
                            {bid.bidder.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="bid-name">{bid.bidder.name}</div>
                            <div className="bid-time">{formatTimeAgo(bid.created_at)}</div>
                          </div>
                        </div>
                        <span className="bid-amount">{formatCurrency(bid.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bidding Controls */}
              {!isExpired && (
                <div className="bidding-controls">
                  <div className="quick-bids">
                    <button className="quick-bid-btn" onClick={() => handleQuickBid(10000)}>+$10k</button>
                    <button className="quick-bid-btn" onClick={() => handleQuickBid(50000)}>+$50k</button>
                    <button className="quick-bid-btn" onClick={() => handleQuickBid(100000)}>+$100k</button>
                  </div>
                  <div className="bid-input-wrapper">
                    <input
                      id="bid-amount-input"
                      className="bid-input"
                      type="text"
                      placeholder="Custom Bid Amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlaceBid()}
                    />
                    <span className="bid-input-suffix">USD</span>
                  </div>
                  <button
                    id="place-bid-btn"
                    className="place-bid-btn"
                    onClick={handlePlaceBid}
                    disabled={bidding || !bidAmount}
                  >
                    {bidding ? 'PLACING BID...' : 'PLACE BID'}
                  </button>
                  <div className="bid-footer">
                    <span className="bid-footer-item">
                      <span className="material-symbols-outlined">security</span>
                      SSL Secure
                    </span>
                    <span className="bid-footer-item">
                      <span className="material-symbols-outlined">credit_card</span>
                      5% Buyer Premium
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <span className="material-symbols-outlined filled stat-icon">visibility</span>
                <span className="stat-value">1,402</span>
                <span className="stat-label">Watching</span>
              </div>
              <div className="stat-card glass-panel">
                <span className="material-symbols-outlined filled stat-icon">gavel</span>
                <span className="stat-value">{bids.length}</span>
                <span className="stat-label">Total Bids</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type} visible`}>
          {toast.message}
        </div>
      )}
    </main>
  );
};

export default AuctionRoom;
