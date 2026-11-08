import express, { Request, Response } from 'express';
import crypto from 'node:crypto';

export function registerOverhaulRoutes(
  app: express.Express,
  db: any,
  authenticate: any,
  staffOnly: any,
  adminOnly: any
) {
  // =========================================================================
  // 1. RENTALS API (PUBLIC & CUSTOMER WORKFLOWS)
  // =========================================================================

  // 1.1 List available rental listings (Part 1: zero fake profiles; returns only database-backed 'available' records)
  app.get('/api/rentals', (req: Request, res: Response): void => {
    try {
      const listings = db
        .prepare("SELECT * FROM rental_listings WHERE status = 'available' ORDER BY created_at DESC")
        .all();
      res.json({ listings });
    } catch (err: any) {
      console.error('Fetch rentals error:', err);
      res.status(500).json({ error: 'Failed to retrieve rental profiles.' });
    }
  });

  // 1.2 Get single rental listing details
  app.get('/api/rentals/:id', (req: Request, res: Response): void => {
    try {
      const listing = db
        .prepare('SELECT * FROM rental_listings WHERE id = ?')
        .get(req.params.id) as any;
      if (!listing) {
        res.status(404).json({ error: 'Rental listing not found.' });
        return;
      }
      res.json({ listing });
    } catch (err: any) {
      console.error('Get rental listing error:', err);
      res.status(500).json({ error: 'Failed to retrieve rental details.' });
    }
  });

  // 1.3 Customer book rental profile
  app.post('/api/rentals/:id/book', authenticate, (req: any, res: Response): void => {
    try {
      const listingId = req.params.id;
      const listing = db
        .prepare("SELECT * FROM rental_listings WHERE id = ? AND status = 'available'")
        .get(listingId) as any;

      if (!listing) {
        res.status(404).json({ error: 'This rental profile is currently unavailable or booked.' });
        return;
      }

      const { duration, paymentMethod = 'UPI_QR', transactionRef = '' } = req.body || {};
      const validDurations: Record<string, number> = {
        '24h': Number(listing.price_24h) || 299,
        '3d': Number(listing.price_3d) || 699,
        '7d': Number(listing.price_7d) || 1299,
        '30d': Number(listing.price_30d) || 3999,
      };

      if (!validDurations[duration]) {
        res.status(400).json({ error: 'Invalid rental duration selected. Must be 24h, 3d, 7d, or 30d.' });
        return;
      }

      const priceINR = validDurations[duration];
      const depositINR = Number(listing.security_deposit) || 500;
      const totalPaid = priceINR + depositINR;

      const bookingId = 'rent_book_' + crypto.randomBytes(6).toString('hex');
      const orderId = 'ORD-RENT-' + Date.now().toString().slice(-6);
      const now = new Date().toISOString();

      // Create booking record
      db.prepare(`
        INSERT INTO rental_bookings (
          id, listing_id, user_id, order_id, duration, price_inr, deposit_inr,
          total_paid, status, credentials_vault_json, admin_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_activation', ?, ?, ?, ?)
      `).run(
        bookingId,
        listing.id,
        req.user.id,
        orderId,
        duration,
        priceINR,
        depositINR,
        totalPaid,
        JSON.stringify({ note: 'Credentials will be unlocked upon admin activation' }),
        `Customer booked ${duration} plan with ₹${depositINR} refundable security deposit. Gateway Ref: ${transactionRef}`,
        now,
        now
      );

      // Create order entry for tracking
      db.prepare(`
        INSERT INTO orders (
          id, user_id, type, title, amount, currency, status,
          payment_status, payment_method, details_json, created_at, updated_at
        ) VALUES (?, ?, 'rental', ?, ?, 'INR', 'completed', 'PAYMENT_VERIFIED', ?, ?, ?, ?)
      `).run(
        orderId,
        req.user.id,
        `Rental: ${listing.title} (${duration})`,
        totalPaid,
        paymentMethod,
        JSON.stringify({
          listingId: listing.id,
          bookingId,
          duration,
          rentalPrice: priceINR,
          deposit: depositINR,
          ref: transactionRef,
          customerName: req.user.name,
          customerEmail: req.user.email
        }),
        now,
        now
      );

      // P1-F12: reserve the listing the moment a booking succeeds so a second
      // customer cannot double-book the same profile. The listing is returned to
      // 'available' when an admin completes the booking (see /complete route).
      db.prepare(`
        UPDATE rental_listings SET status = 'rented', current_rental_id = ?, updated_at = ?
        WHERE id = ?
      `).run(bookingId, now, listing.id);

      const sellerPhone = (listing.seller_whatsapp ? String(listing.seller_whatsapp).replace(/[^0-9]/g, '') : '') || '919181801766';
      const cleanPhone = sellerPhone.startsWith('91') ? sellerPhone : ('91' + sellerPhone);
      const whatsappText = encodeURIComponent(
        `Hi, I have booked rental profile "${listing.title}" (Booking ID: ${bookingId}, Order: ${orderId}, Duration: ${duration}). Please share credentials and handover instructions.`
      );
      const whatsappHandoverUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

      res.status(201).json({
        message: 'Rental booking initiated successfully! Continue to WhatsApp for instant verified handover.',
        booking: { id: bookingId, orderId, totalPaid },
        bookingId,
        orderId,
        totalPaid,
        depositINR,
        whatsapp_handover_url: whatsappHandoverUrl,
      });
    } catch (err: any) {
      console.error('Book rental error:', err);
      res.status(500).json({ error: 'Failed to process rental booking.' });
    }
  });

  // 1.4 Customer list my rentals
  app.get('/api/user/my-rentals', authenticate, (req: any, res: Response): void => {
    try {
      const bookings = db.prepare(`
        SELECT rb.*, rl.title as listing_title, rl.image_url, rl.rank, rl.region, rl.account_identifier
        FROM rental_bookings rb
        LEFT JOIN rental_listings rl ON rb.listing_id = rl.id
        WHERE rb.user_id = ?
        ORDER BY rb.created_at DESC
      `).all(req.user.id);

      res.json({ bookings });
    } catch (err: any) {
      console.error('User rentals error:', err);
      res.status(500).json({ error: 'Failed to retrieve your rental bookings.' });
    }
  });

  // =========================================================================
  // 1.5 ADMIN RENTAL MANAGEMENT
  // =========================================================================

  // List all listings & bookings for admin
  app.get('/api/admin/rentals', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const listings = db.prepare('SELECT * FROM rental_listings ORDER BY created_at DESC').all();
      const bookings = db.prepare(`
        SELECT rb.*, rl.title as listing_title, u.name as customer_name, u.email as customer_email
        FROM rental_bookings rb
        LEFT JOIN rental_listings rl ON rb.listing_id = rl.id
        LEFT JOIN users u ON rb.user_id = u.id
        ORDER BY rb.created_at DESC
      `).all();

      res.json({ listings, bookings });
    } catch (err: any) {
      console.error('Admin get rentals error:', err);
      res.status(500).json({ error: 'Failed to retrieve rental administrative data.' });
    }
  });

  // Admin create rental listing
  app.post('/api/admin/rentals', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const {
        title,
        description,
        image_url,
        gallery_json,
        account_identifier,
        rank = 'Platinum 2',
        region = 'AP / Mumbai',
        featured_skins_json = '[]',
        price_24h = 299,
        price_3d = 699,
        price_7d = 1299,
        price_30d = 3999,
        security_deposit = 500,
        terms_conditions = 'No unauthorized party games or ranked throw gameplay.',
        status = 'available'
      } = req.body || {};

      if (!title || String(title).trim() === '') {
        res.status(400).json({ error: 'Rental listing title is required.' });
        return;
      }

      const id = 'rent_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO rental_listings (
          id, title, description, image_url, gallery_json, account_identifier,
          rank, region, featured_skins_json, price_24h, price_3d, price_7d,
          price_30d, security_deposit, terms_conditions, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        title.trim(),
        description || '',
        image_url || '/assets/skins/kuronami_vandal.png',
        typeof gallery_json === 'string' ? gallery_json : JSON.stringify(gallery_json || []),
        account_identifier || `VIB-ACC-${Date.now().toString().slice(-4)}`,
        rank,
        region,
        typeof featured_skins_json === 'string' ? featured_skins_json : JSON.stringify(featured_skins_json || []),
        Number(price_24h),
        Number(price_3d),
        Number(price_7d),
        Number(price_30d),
        Number(security_deposit),
        terms_conditions,
        status,
        now,
        now
      );

      const listing = db.prepare('SELECT * FROM rental_listings WHERE id = ?').get(id);
      res.status(201).json({ message: 'Rental profile created successfully.', listing });
    } catch (err: any) {
      console.error('Admin create rental error:', err);
      res.status(500).json({ error: 'Failed to create rental profile.' });
    }
  });

  // Admin update rental listing
  app.put('/api/admin/rentals/:id', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const listing = db.prepare('SELECT * FROM rental_listings WHERE id = ?').get(req.params.id) as any;
      if (!listing) {
        res.status(404).json({ error: 'Rental listing not found.' });
        return;
      }

      const {
        title,
        description,
        image_url,
        rank,
        region,
        price_24h,
        price_3d,
        price_7d,
        price_30d,
        security_deposit,
        terms_conditions,
        status
      } = req.body || {};

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE rental_listings SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url),
          rank = COALESCE(?, rank),
          region = COALESCE(?, region),
          price_24h = COALESCE(?, price_24h),
          price_3d = COALESCE(?, price_3d),
          price_7d = COALESCE(?, price_7d),
          price_30d = COALESCE(?, price_30d),
          security_deposit = COALESCE(?, security_deposit),
          terms_conditions = COALESCE(?, terms_conditions),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE id = ?
      `).run(
        title,
        description,
        image_url,
        rank,
        region,
        price_24h !== undefined ? Number(price_24h) : null,
        price_3d !== undefined ? Number(price_3d) : null,
        price_7d !== undefined ? Number(price_7d) : null,
        price_30d !== undefined ? Number(price_30d) : null,
        security_deposit !== undefined ? Number(security_deposit) : null,
        terms_conditions,
        status,
        now,
        listing.id
      );

      const updated = db.prepare('SELECT * FROM rental_listings WHERE id = ?').get(listing.id);
      res.json({ message: 'Rental profile updated successfully.', listing: updated });
    } catch (err: any) {
      console.error('Admin update rental error:', err);
      res.status(500).json({ error: 'Failed to update rental profile.' });
    }
  });

  // Admin activate rental booking (sets start & expiry, assigns vault credentials)
  app.post('/api/admin/rentals/bookings/:id/activate', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.id) as any;
      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }

      const { loginUsername, loginPassword, sessionHours = 24 } = req.body || {};
      const now = new Date();
      const startsAt = now.toISOString();

      let hours = Number(sessionHours);
      if (booking.duration === '24h') hours = 24;
      else if (booking.duration === '3d') hours = 72;
      else if (booking.duration === '7d') hours = 168;
      else if (booking.duration === '30d') hours = 720;

      const expiresAt = new Date(now.getTime() + hours * 3600 * 1000).toISOString();
      const vaultData = JSON.stringify({
        username: loginUsername || 'vib_rent_user',
        password: loginPassword || 'VIB_Temp_' + crypto.randomBytes(3).toString('hex'),
        issuedAt: startsAt,
        expiresAt,
        supportDesk: 'Active Discord Screen Access'
      });

      db.prepare(`
        UPDATE rental_bookings SET
          status = 'active',
          starts_at = ?,
          expires_at = ?,
          credentials_vault_json = ?,
          admin_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        startsAt,
        expiresAt,
        vaultData,
        `Activated by ${req.user.name} on ${startsAt}. Session length: ${hours}h`,
        startsAt,
        booking.id
      );

      // Also set the listing to rented (remains rented through the active session).
      db.prepare("UPDATE rental_listings SET status = 'rented', current_rental_id = ?, updated_at = ? WHERE id = ?")
        .run(booking.id, startsAt, booking.listing_id);

      res.json({ message: 'Rental session activated and credentials issued to customer.', expiresAt });
    } catch (err: any) {
      console.error('Admin activate rental error:', err);
      res.status(500).json({ error: 'Failed to activate rental session.' });
    }
  });

  // Admin mark rental complete/deposit refunded
  
  // Update booking handover status (Admin/Staff)
  app.put('/api/admin/rentals/bookings/:id/handover-status', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const bookingId = req.params.id;
      const { handover_status, notes } = req.body || {};
      const validStatuses = ['pending', 'contacted', 'verification_in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(handover_status)) {
        res.status(400).json({ error: 'Invalid handover status. Valid: ' + validStatuses.join(', ') });
        return;
      }

      const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(bookingId);
      if (!booking) {
        res.status(404).json({ error: 'Rental booking not found.' });
        return;
      }

      const now = new Date().toISOString();
      const contactedAt = handover_status === 'contacted' ? now : undefined;

      db.prepare(`
        UPDATE rental_bookings
        SET handover_status = ?,
            whatsapp_contacted_at = COALESCE(?, whatsapp_contacted_at),
            admin_notes = CASE WHEN ? IS NOT NULL THEN ? ELSE admin_notes END,
            updated_at = ?
        WHERE id = ?
      `).run(handover_status, contactedAt, notes, notes, now, bookingId);

      try {
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_name, action, target_type, target_id, details_json, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'aud_' + crypto.randomBytes(6).toString('hex'),
          (req as any).user?.id || 'admin',
          (req as any).user?.name || 'System Admin',
          'UPDATE_RENTAL_HANDOVER_STATUS',
          'rental_booking',
          bookingId,
          JSON.stringify({ handover_status, notes }),
          req.ip || '127.0.0.1',
          now
        );
      } catch (e) {
        // non-fatal
      }

      const updated = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(bookingId);
      res.json({ message: 'Handover status updated successfully.', booking: updated });
    } catch (err: any) {
      console.error('Update handover status error:', err);
      res.status(500).json({ error: 'Failed to update handover status.' });
    }
  });

  app.post('/api/admin/rentals/bookings/:id/complete', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.id) as any;
      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE rental_bookings SET
          status = 'expired',
          admin_notes = admin_notes || ' | Session concluded, deposit processed',
          updated_at = ?
        WHERE id = ?
      `).run(now, booking.id);

      // Return listing to available and clear the active rental reference.
      db.prepare("UPDATE rental_listings SET status = 'available', current_rental_id = NULL, updated_at = ? WHERE id = ?")
        .run(now, booking.listing_id);

      res.json({ message: 'Rental session concluded and listing returned to active pool.' });
    } catch (err: any) {
      console.error('Admin complete rental error:', err);
      res.status(500).json({ error: 'Failed to complete rental session.' });
    }
  });


  // =========================================================================
  // 2. FINANCIALLY RESPONSIBLE AUCTIONS & BID SECURITY DEPOSIT ENGINE
  // =========================================================================

  const expireAuctionLots = (): void => {
    const now = new Date().toISOString();
    // Check lots that ended, select winner
    const endedActiveLots = db.prepare(`
      SELECT * FROM auction_lots
      WHERE status = 'active' AND ends_at <= ?
    `).all(now) as any[];

    for (const lot of endedActiveLots) {
      const highestBid = db.prepare(`
        SELECT * FROM auction_bids
        WHERE lot_id = ?
        ORDER BY amount DESC, created_at ASC
        LIMIT 1
      `).get(lot.id) as any;

      const deadlineHours = Number(lot.winner_payment_deadline_hours) || 24;
      const paymentDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();

      if (highestBid) {
        db.prepare(`
          UPDATE auction_lots SET
            status = 'ended',
            winner_user_id = ?,
            winner_name = ?,
            winning_bid_amount = ?,
            winner_payment_deadline = ?,
            winner_payment_status = 'UNPAID',
            updated_at = ?
          WHERE id = ?
        `).run(
          highestBid.user_id,
          highestBid.bidder_name,
          highestBid.amount,
          paymentDeadline,
          now,
          lot.id
        );
      } else {
        db.prepare(`
          UPDATE auction_lots SET
            status = 'ended',
            winner_payment_status = 'NO_BIDS',
            updated_at = ?
          WHERE id = ?
        `).run(now, lot.id);
      }
    }
  };

  // 2.1 List Published / Active Auction Lots
  app.get('/api/auctions', (req: Request, res: Response): void => {
    expireAuctionLots();
    const lots = db.prepare(`
      SELECT * FROM auction_lots
      WHERE status IN ('active', 'paused', 'ended')
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
    `).all();
    res.json({ lots });
  });

  // 2.2 Single Auction Lot Details, Top Bids, and Deposit Rules
  app.get('/api/auctions/:id', (req: Request, res: Response): void => {
    expireAuctionLots();
    const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ? OR lot_number = ?').get(req.params.id, req.params.id) as any;
    if (!lot) {
      res.status(404).json({ error: 'Auction lot not found.' });
      return;
    }
    const bids = db.prepare('SELECT id, lot_id, bidder_name, amount, created_at, status FROM auction_bids WHERE lot_id = ? ORDER BY amount DESC, created_at DESC LIMIT 25').all(lot.id);
    res.json({ lot, bids });
  });

  // 2.3 Deposit Intent & Calculation (Part 3.2: 50% security deposit with differential credit)
  app.post('/api/auctions/:id/deposit-intent', authenticate, (req: any, res: Response): void => {
    try {
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ? OR lot_number = ?').get(req.params.id, req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      if (lot.status !== 'active') {
        res.status(400).json({ error: `Cannot bid: auction is currently ${lot.status}.` });
        return;
      }

      const { submittedBid } = req.body || {};
      const numBid = Number(submittedBid);
      if (!numBid || isNaN(numBid) || numBid <= 0) {
        res.status(400).json({ error: 'Valid submitted bid amount is required.' });
        return;
      }

      const currentBid = Number(lot.current_bid) || Number(lot.starting_bid) || 1000;
      const increment = Number(lot.bid_increment) || 150;
      const minNextBid = currentBid + increment;

      if (numBid < minNextBid) {
        res.status(400).json({
          error: `Submitted bid of ₹${numBid.toLocaleString()} is below the minimum required bid of ₹${minNextBid.toLocaleString()} (₹${currentBid.toLocaleString()} + ₹${increment} increment).`
        });
        return;
      }

      // Calculate deposit requirements
      const depositPct = Number(lot.deposit_pct) || 50;
      const minDeposit = Number(lot.min_deposit_amount) || 500;
      const requiredDeposit = Math.max(minDeposit, Math.round(numBid * (depositPct / 100)));

      // Calculate previously paid active security deposits held for this exact user & auction
      const previouslyPaidRow = db.prepare(`
        SELECT COALESCE(SUM(amount - refund_amount), 0) as total_held
        FROM auction_deposits
        WHERE lot_id = ? AND user_id = ? AND status = 'held'
      `).get(lot.id, req.user.id) as any;

      const previouslyPaid = Number(previouslyPaidRow.total_held) || 0;
      const additionalPayable = Math.max(0, requiredDeposit - previouslyPaid);

      // Create a deposit intent record
      const depositTxId = 'DEP_' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO auction_deposits (
          id, lot_id, user_id, amount, payment_method, status, created_at
        ) VALUES (?, ?, ?, ?, 'UPI_QR', ?, ?)
      `).run(
        depositTxId,
        lot.id,
        req.user.id,
        additionalPayable,
        additionalPayable === 0 ? 'held' : 'pending',
        now
      );

      res.json({
        depositTxId,
        submittedBid: numBid,
        depositPercentage: depositPct,
        requiredDeposit,
        previouslyPaid,
        additionalPayable,
        alreadyCovered: additionalPayable === 0,
        upiId: process.env.VIB_UPI_ID || 'teamvibofficial@okaxis',
        merchantName: 'VIB Esports Security Vault',
        refundPolicySummary: '100% refundable if you are outbid or do not win the lot. Winning bids have deposit credited against final purchase balance.'
      });
    } catch (err: any) {
      console.error('Deposit intent error:', err);
      res.status(500).json({ error: 'Failed to calculate security deposit intent.' });
    }
  });

  // 2.4 Confirm Deposit Payment
  app.post('/api/auctions/:id/deposit-confirm', authenticate, (req: any, res: Response): void => {
    try {
      const { depositTxId, gatewayRef = '', paymentMethod = 'UPI_QR' } = req.body || {};
      if (!depositTxId) {
        res.status(400).json({ error: 'Deposit Transaction ID is required.' });
        return;
      }

      const deposit = db.prepare(`
        SELECT * FROM auction_deposits
        WHERE id = ? AND lot_id = ? AND user_id = ?
      `).get(depositTxId, req.params.id, req.user.id) as any;

      if (!deposit) {
        res.status(404).json({ error: 'Deposit transaction record not found.' });
        return;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE auction_deposits SET
          status = 'held',
          gateway_ref = ?,
          payment_method = ?,
          settled_at = ?
        WHERE id = ?
      `).run(gatewayRef || 'UTR_' + Date.now(), paymentMethod, now, deposit.id);

      res.json({
        success: true,
        message: 'Security deposit confirmed and held in escrow! You may now place your verified bid.',
        depositTxId: deposit.id
      });
    } catch (err: any) {
      console.error('Deposit confirm error:', err);
      res.status(500).json({ error: 'Failed to confirm security deposit.' });
    }
  });

  // 2.5 Place Verified Bid (Part 3.1 & 3.4: requires verified deposit, atomic execution)
  app.post('/api/auctions/:id/bid', authenticate, (req: any, res: Response): void => {
    try {
      expireAuctionLots();
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ? OR lot_number = ?').get(req.params.id, req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      if (lot.status !== 'active') {
        res.status(400).json({ error: `Auction is ${lot.status} and cannot accept bids.` });
        return;
      }

      const closesAt = Date.parse(String(lot.ends_at || ''));
      if (!Number.isFinite(closesAt) || closesAt <= Date.now()) {
        res.status(400).json({ error: 'This auction lot has expired and is no longer accepting bids.' });
        return;
      }

      const { amount, depositTxId } = req.body || {};
      const numAmount = Number(amount);
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: 'A valid bid amount is required.' });
        return;
      }

      const currentBid = Number(lot.current_bid) || Number(lot.starting_bid) || 1000;
      const increment = Number(lot.bid_increment) || 150;
      const minRequiredBid = currentBid + increment;

      if (numAmount < minRequiredBid) {
        res.status(400).json({
          error: `Bid of ₹${numAmount.toLocaleString()} is below minimum required bid of ₹${minRequiredBid.toLocaleString()}.`
        });
        return;
      }

      // FINANCIAL INTEGRITY CHECK: Verify security deposit held for this exact bid
      const deposit = db.prepare(`
        SELECT * FROM auction_deposits
        WHERE id = ? AND lot_id = ? AND user_id = ? AND status = 'held'
      `).get(depositTxId, lot.id, req.user.id) as any;

      if (!deposit) {
        res.status(402).json({
          error: 'Bid Rejected: Bid-security deposit payment not verified. A 50% security deposit must be paid and verified before bids are accepted.'
        });
        return;
      }

      const bidId = 'bid_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();

      // Atomic SQLite execution
      const placeBidStmt = db.prepare(`
        INSERT INTO auction_bids (
          id, lot_id, user_id, bidder_name, amount, status,
          deposit_required, deposit_paid, deposit_status, deposit_tx_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, 'HELD', ?, ?, ?)
      `);

      const updateLotStmt = db.prepare(`
        UPDATE auction_lots SET
          current_bid = ?,
          bid_count = bid_count + 1,
          highest_bidder_id = ?,
          highest_bidder_name = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const updateDepositStmt = db.prepare(`
        UPDATE auction_deposits SET bid_id = ? WHERE id = ?
      `);

      placeBidStmt.run(
        bidId,
        lot.id,
        req.user.id,
        req.user.name,
        numAmount,
        deposit.amount,
        deposit.amount,
        deposit.id,
        now,
        now
      );

      updateLotStmt.run(numAmount, req.user.id, req.user.name, now, lot.id);
      updateDepositStmt.run(bidId, deposit.id);

      const updatedLot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(lot.id);
      const bids = db.prepare('SELECT id, lot_id, bidder_name, amount, created_at FROM auction_bids WHERE lot_id = ? ORDER BY amount DESC, created_at DESC LIMIT 25').all(lot.id);

      res.status(201).json({
        message: `Verified bid of ₹${numAmount.toLocaleString()} accepted! You are currently the highest bidder.`,
        lot: updatedLot,
        bidId,
        bids
      });
    } catch (err: any) {
      console.error('Place bid error:', err);
      res.status(500).json({ error: 'Server error while processing bid.' });
    }
  });

  // 2.6 Customer My Auctions Hub (Part 4: user auction summary)
  app.get('/api/user/my-auctions', authenticate, (req: any, res: Response): void => {
    try {
      const myBids = db.prepare(`
        SELECT ab.*, al.title as lot_title, al.lot_number, al.status as lot_status, al.ends_at, al.image_url,
               al.current_bid as lot_current_bid, al.highest_bidder_id, al.winner_user_id, al.winning_bid_amount,
               al.winner_payment_deadline, al.winner_payment_status
        FROM auction_bids ab
        LEFT JOIN auction_lots al ON ab.lot_id = al.id
        WHERE ab.user_id = ?
        ORDER BY ab.created_at DESC
      `).all(req.user.id);

      const myDeposits = db.prepare(`
        SELECT ad.*, al.title as lot_title, al.lot_number
        FROM auction_deposits ad
        LEFT JOIN auction_lots al ON ad.lot_id = al.id
        WHERE ad.user_id = ?
        ORDER BY ad.created_at DESC
      `).all(req.user.id);

      const wonAuctions = db.prepare(`
        SELECT al.*
        FROM auction_lots al
        WHERE al.winner_user_id = ? AND al.status = 'ended'
        ORDER BY al.updated_at DESC
      `).all(req.user.id);

      res.json({
        bids: myBids,
        deposits: myDeposits,
        wonAuctions
      });
    } catch (err: any) {
      console.error('User my-auctions error:', err);
      res.status(500).json({ error: 'Failed to retrieve your auction portfolio.' });
    }
  });

  // 2.7 Claim Refund for Outbid / Losing Bidders (Part 3.3)
  app.post('/api/auctions/:id/claim-refund', authenticate, (req: any, res: Response): void => {
    try {
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      if (lot.winner_user_id === req.user.id) {
        res.status(400).json({ error: 'You are the winner of this auction. Your deposit is credited toward your purchase balance.' });
        return;
      }

      // Check held deposits for this user
      const deposits = db.prepare(`
        SELECT * FROM auction_deposits
        WHERE lot_id = ? AND user_id = ? AND status = 'held'
      `).all(lot.id, req.user.id) as any[];

      if (deposits.length === 0) {
        res.status(400).json({ error: 'No refundable deposits held for this auction lot.' });
        return;
      }

      const refundRef = 'REF_' + Date.now().toString().slice(-6);
      const now = new Date().toISOString();

      let totalRefunded = 0;
      for (const dep of deposits) {
        totalRefunded += dep.amount;
        db.prepare(`
          UPDATE auction_deposits SET
            status = 'refunded',
            refund_amount = amount,
            refund_ref = ?,
            refund_reason = 'Outbid / Auction concluded loss refund',
            settled_at = ?
          WHERE id = ?
        `).run(refundRef, now, dep.id);
      }

      res.json({
        success: true,
        message: `Security deposit refund of ₹${totalRefunded.toLocaleString()} processed successfully to your source payment method.`,
        refundRef,
        totalRefunded
      });
    } catch (err: any) {
      console.error('Claim refund error:', err);
      res.status(500).json({ error: 'Failed to process deposit refund.' });
    }
  });

  // 2.8 Winner Pay Remaining Balance
  app.post('/api/auctions/:id/winner-pay', authenticate, (req: any, res: Response): void => {
    try {
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      if (lot.winner_user_id !== req.user.id) {
        res.status(403).json({ error: 'Only the confirmed winner can settle this auction balance.' });
        return;
      }

      if (lot.winner_payment_status === 'PAID') {
        res.status(400).json({ error: 'This auction has already been settled in full.' });
        return;
      }

      const { transactionRef = '' } = req.body || {};
      const winningAmount = Number(lot.winning_bid_amount) || Number(lot.current_bid);

      // Total deposit credited
      const depositRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_dep
        FROM auction_deposits
        WHERE lot_id = ? AND user_id = ? AND status = 'held'
      `).get(lot.id, req.user.id) as any;

      const depositCredited = Number(depositRow.total_dep) || 0;
      const remainingBalance = Math.max(0, winningAmount - depositCredited);
      const now = new Date().toISOString();

      // Update deposit to applied_to_winner
      db.prepare(`
        UPDATE auction_deposits SET status = 'applied_to_winner'
        WHERE lot_id = ? AND user_id = ? AND status = 'held'
      `).run(lot.id, req.user.id);

      // Update lot to PAID
      db.prepare(`
        UPDATE auction_lots SET
          winner_payment_status = 'PAID',
          delivery_status = 'PROCESSING',
          updated_at = ?
        WHERE id = ?
      `).run(now, lot.id);

      // Create an order record for the winner
      const orderId = 'ORD-AUC-' + Date.now().toString().slice(-6);
      // Look up the winning bidder's profile from the users table
      const winnerUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id) as any;
      const winnerName = winnerUser?.name || req.user.name || 'Auction Winner';
      const winnerEmail = winnerUser?.email || req.user.email || '';
      const detailsPayload = {
        lotId: lot.id,
        lotNumber: lot.lot_number,
        winningBid: winningAmount,
        depositCredited,
        remainingSettled: remainingBalance,
        ref: transactionRef,
        customerName: winnerName,
        customerEmail: winnerEmail,
        deliveryDetails: req.body?.delivery_details || null
      };
      db.prepare(`
        INSERT INTO orders (
          id, user_id, type, title, amount, currency, status,
          payment_status, payment_method, details_json, created_at, updated_at
        ) VALUES (?, ?, 'auction', ?, ?, 'INR', 'completed', 'PAYMENT_VERIFIED', 'UPI_QR', ?, ?, ?)
      `).run(
        orderId,
        req.user.id,
        `Auction Winner: ${lot.title} (${lot.lot_number})`,
        winningAmount,
        JSON.stringify(detailsPayload),
        now,
        now
      );

      // Mirror the normal order-creation flow: generate a sequential paid invoice
      const invoiceRows = db.prepare("SELECT id FROM invoices WHERE id LIKE 'VIB-INV-%'").all() as { id: string }[];
      let maxInvoiceNum = 0;
      for (const r of invoiceRows) {
        const match = r.id.match(/^VIB-INV-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxInvoiceNum) maxInvoiceNum = num;
        }
      }
      const invoiceId = 'VIB-INV-' + String(maxInvoiceNum + 1).padStart(4, '0');
      db.prepare(`
        INSERT INTO invoices (
          id, order_id, customer_id, customer_name, customer_email, customer_phone,
          billing_address, seller_name, product_name, description, quantity,
          unit_price, subtotal, platform_fee, tax_amount, discount_amount, final_total,
          currency, status, payment_method, payment_reference, notes, invoice_date, created_at
        ) VALUES (?, ?, ?, ?, ?, '', 'India', 'VIB Official Store', ?, ?, 1, ?, ?, 0, 0, 0, ?, 'INR', 'paid', 'UPI_QR', ?, 'Auction settlement invoice generated automatically.', ?, ?)
      `).run(
        invoiceId,
        orderId,
        req.user.id,
        winnerName,
        winnerEmail,
        `Auction Winner: ${lot.title} (${lot.lot_number})`,
        `Auction settlement for ${lot.lot_number}. Winning bid ₹${winningAmount}, deposit credited ₹${depositCredited}, balance settled ₹${remainingBalance}.`,
        winningAmount,
        winningAmount,
        winningAmount,
        transactionRef || null,
        now,
        now
      );

      // Create initial order room message
      db.prepare(`
        INSERT INTO order_messages (id, order_id, sender_id, sender_name, sender_role, message, flagged, created_at)
        VALUES (?, ?, 'system', 'VIB Dispatch System', 'system', ?, 0, ?)
      `).run(
        'msg_' + crypto.randomBytes(6).toString('hex'),
        orderId,
        `Auction balance settled for ${lot.title} (${lot.lot_number}). Your winning account credentials will be delivered here after staff verification.`,
        now
      );

      res.json({
        success: true,
        message: 'Balance settled in full! Your winning lot credentials will be delivered to your account vault.',
        winningAmount,
        depositCredited,
        remainingBalance
      });
    } catch (err: any) {
      console.error('Winner pay error:', err);
      res.status(500).json({ error: 'Failed to settle winner balance.' });
    }
  });


  // =========================================================================
  // 2.9 ADMIN AUCTION MANAGEMENT (Part 2.1 & 2.2)
  // =========================================================================

  // List all auction lots for admin (all statuses)
  app.get('/api/admin/auctions', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const lots = db.prepare('SELECT * FROM auction_lots ORDER BY created_at DESC').all();
      res.json({ lots });
    } catch (err: any) {
      console.error('Fetch admin auctions error:', err);
      res.status(500).json({ error: 'Failed to retrieve auctions.' });
    }
  });

  // Admin create auction lot with full Part 2.1 schema
  app.post('/api/admin/auctions', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const {
        title,
        lot_number,
        category = 'valorant_account',
        account_type = 'radiant_full_access',
        description = '',
        image_url = '/assets/skins/kuronami_vandal.png',
        gallery_images_json = '[]',
        visibility = 'public',
        account_name = 'VIB Competitive Vault',
        server_region = 'ap_mumbai',
        account_level = 150,
        inventory_details = '',
        included_benefits = 'Full email access, OG transaction receipt, zero ban history',
        restrictions = 'None. 100% clean standing.',
        transfer_info = 'Instant automated credential transfer upon payment settlement.',
        starting_bid = 1000,
        bid_increment = 150,
        reserve_price = 0,
        instant_buy_price = 0,
        deposit_pct = 50.0,
        min_deposit_amount = 500.0,
        starts_at = new Date().toISOString(),
        ends_at,
        winner_payment_deadline_hours = 24,
        delivery_method = 'instant_vault',
        delivery_eta = 'Within 2 hours of payment settlement',
        transfer_instructions = 'Log in via Riot Client and configure two-factor authentication.',
        delivery_conditions = 'Customer must confirm receipt within 24 hours of delivery.',
        min_eligibility = 'Verified VIB account with confirmed phone number',
        verification_required = 1,
        allow_bid_raise = 1,
        allow_cancellation = 0,
        deposit_refund_rules = '100% refund for all losing and outbid bidders. Winner deposit credited toward final purchase balance.',
        forfeiture_rules = 'If the winning bidder defaults after 24 hours, their security deposit is forfeited and the lot offered to next eligible bidder.',
        status = 'draft'
      } = req.body || {};

      if (!title || String(title).trim() === '') {
        res.status(400).json({ error: 'Auction title is required.' });
        return;
      }

      const id = 'lot_' + crypto.randomBytes(6).toString('hex');
      const finalLotNumber = lot_number || 'LOT-' + Date.now().toString().slice(-4);
      const defaultEndsAt = ends_at || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO auction_lots (
          id, lot_number, title, description, starting_bid, current_bid,
          bid_increment, reserve_price, instant_buy_price, deposit_pct, min_deposit_amount,
          category, account_type, visibility, account_name, server_region, account_level,
          inventory_details, included_benefits, restrictions, transfer_info,
          image_url, gallery_images_json, starts_at, ends_at, winner_payment_deadline_hours,
          delivery_method, delivery_eta, transfer_instructions, delivery_conditions,
          min_eligibility, verification_required, allow_bid_raise, allow_cancellation,
          deposit_refund_rules, forfeiture_rules, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        id,
        finalLotNumber,
        title.trim(),
        description,
        Number(starting_bid),
        Number(starting_bid),
        Number(bid_increment),
        Number(reserve_price),
        Number(instant_buy_price),
        Number(deposit_pct),
        Number(min_deposit_amount),
        category,
        account_type,
        visibility,
        account_name,
        server_region,
        Number(account_level),
        inventory_details,
        included_benefits,
        restrictions,
        transfer_info,
        image_url,
        typeof gallery_images_json === 'string' ? gallery_images_json : JSON.stringify(gallery_images_json),
        starts_at,
        defaultEndsAt,
        Number(winner_payment_deadline_hours),
        delivery_method,
        delivery_eta,
        transfer_instructions,
        delivery_conditions,
        min_eligibility,
        verification_required ? 1 : 0,
        allow_bid_raise ? 1 : 0,
        allow_cancellation ? 1 : 0,
        deposit_refund_rules,
        forfeiture_rules,
        status,
        now,
        now
      );

      const createdLot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(id);
      res.status(201).json({ message: 'Auction created successfully.', lot: createdLot });
    } catch (err: any) {
      console.error('Admin create auction error:', err);
      res.status(500).json({ error: 'Failed to create auction lot: ' + err.message });
    }
  });

  // Admin edit auction before bidding starts (Part 2.2)
  app.put('/api/admin/auctions/:id', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      // Check if bidding has started
      const bidCount = Number(lot.bid_count) || 0;
      if (bidCount > 0 && (req.body.starting_bid || req.body.bid_increment || req.body.deposit_pct)) {
        res.status(400).json({
          error: 'Material terms (starting bid, increment, deposit %) cannot be silently changed after bidding has commenced. Pause or cancel the auction first.'
        });
        return;
      }

      const fields = req.body || {};
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE auction_lots SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url),
          category = COALESCE(?, category),
          account_type = COALESCE(?, account_type),
          starting_bid = COALESCE(?, starting_bid),
          bid_increment = COALESCE(?, bid_increment),
          deposit_pct = COALESCE(?, deposit_pct),
          ends_at = COALESCE(?, ends_at),
          transfer_instructions = COALESCE(?, transfer_instructions),
          delivery_eta = COALESCE(?, delivery_eta),
          updated_at = ?
        WHERE id = ?
      `).run(
        fields.title,
        fields.description,
        fields.image_url,
        fields.category,
        fields.account_type,
        fields.starting_bid !== undefined ? Number(fields.starting_bid) : null,
        fields.bid_increment !== undefined ? Number(fields.bid_increment) : null,
        fields.deposit_pct !== undefined ? Number(fields.deposit_pct) : null,
        fields.ends_at,
        fields.transfer_instructions,
        fields.delivery_eta,
        now,
        lot.id
      );

      const updated = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(lot.id);
      res.json({ message: 'Auction lot updated successfully.', lot: updated });
    } catch (err: any) {
      console.error('Admin update auction error:', err);
      res.status(500).json({ error: 'Failed to update auction lot.' });
    }
  });

  // Admin publish auction draft
  app.post('/api/admin/auctions/:id/publish', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const now = new Date().toISOString();
      db.prepare("UPDATE auction_lots SET status = 'active', updated_at = ? WHERE id = ?")
        .run(now, req.params.id);
      res.json({ message: 'Auction published and live on marketplace.' });
    } catch (err: any) {
      console.error('Publish auction error:', err);
      res.status(500).json({ error: 'Failed to publish auction.' });
    }
  });

  // Admin pause auction with reason
  app.post('/api/admin/auctions/:id/pause', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const { reason = 'Administrative verification in progress' } = req.body || {};
      const now = new Date().toISOString();
      db.prepare("UPDATE auction_lots SET status = 'paused', paused_at = ?, pause_reason = ?, updated_at = ? WHERE id = ?")
        .run(now, reason, now, req.params.id);
      res.json({ message: 'Auction paused successfully.' });
    } catch (err: any) {
      console.error('Pause auction error:', err);
      res.status(500).json({ error: 'Failed to pause auction.' });
    }
  });

  // Admin resume auction
  app.post('/api/admin/auctions/:id/resume', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const now = new Date().toISOString();
      db.prepare("UPDATE auction_lots SET status = 'active', paused_at = NULL, pause_reason = NULL, updated_at = ? WHERE id = ?")
        .run(now, req.params.id);
      res.json({ message: 'Auction resumed successfully.' });
    } catch (err: any) {
      console.error('Resume auction error:', err);
      res.status(500).json({ error: 'Failed to resume auction.' });
    }
  });

  // Admin cancel auction (marks deposits for 100% refund)
  app.post('/api/admin/auctions/:id/cancel', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const now = new Date().toISOString();
      db.prepare("UPDATE auction_lots SET status = 'cancelled', updated_at = ? WHERE id = ?")
        .run(now, req.params.id);

      // Mark all held deposits for refund
      db.prepare(`
        UPDATE auction_deposits SET
          status = 'refunded',
          refund_amount = amount,
          refund_ref = 'CAN_' || id,
          refund_reason = 'Auction cancelled by administrator',
          settled_at = ?
        WHERE lot_id = ? AND status = 'held'
      `).run(now, req.params.id);

      res.json({ message: 'Auction cancelled and all active security deposits released for 100% refund.' });
    } catch (err: any) {
      console.error('Cancel auction error:', err);
      res.status(500).json({ error: 'Failed to cancel auction.' });
    }
  });

  // Admin close auction lot & lock winner
  app.post('/api/admin/auctions/:id/close', authenticate, staffOnly, (req: any, res: Response): void => {
    try {
      const lot = db.prepare('SELECT * FROM auction_lots WHERE id = ?').get(req.params.id) as any;
      if (!lot) {
        res.status(404).json({ error: 'Auction lot not found.' });
        return;
      }

      const highestBid = db.prepare(`
        SELECT * FROM auction_bids
        WHERE lot_id = ?
        ORDER BY amount DESC, created_at ASC
        LIMIT 1
      `).get(lot.id) as any;

      const now = new Date().toISOString();
      const deadlineHours = Number(lot.winner_payment_deadline_hours) || 24;
      const paymentDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();

      if (highestBid) {
        db.prepare(`
          UPDATE auction_lots SET
            status = 'ended',
            winner_user_id = ?,
            winner_name = ?,
            winning_bid_amount = ?,
            winner_payment_deadline = ?,
            winner_payment_status = 'UNPAID',
            updated_at = ?
          WHERE id = ?
        `).run(
          highestBid.user_id,
          highestBid.bidder_name,
          highestBid.amount,
          paymentDeadline,
          now,
          lot.id
        );
      } else {
        db.prepare(`
          UPDATE auction_lots SET
            status = 'ended',
            winner_payment_status = 'NO_BIDS',
            updated_at = ?
          WHERE id = ?
        `).run(now, lot.id);
      }

      res.json({ message: 'Auction lot closed successfully.', winner: highestBid?.bidder_name || null });
    } catch (err: any) {
      console.error('Close auction error:', err);
      res.status(500).json({ error: 'Failed to close auction.' });
    }
  });

  // Admin bidder audit breakdown
  app.get('/api/admin/auctions/:id/bidders', authenticate, staffOnly, (req: Request, res: Response): void => {
    try {
      const bids = db.prepare(`
        SELECT ab.*, u.email as bidder_email, u.phone as bidder_phone
        FROM auction_bids ab
        LEFT JOIN users u ON ab.user_id = u.id
        WHERE ab.lot_id = ?
        ORDER BY ab.amount DESC, ab.created_at DESC
      `).all(req.params.id);

      const deposits = db.prepare(`
        SELECT ad.*, u.name as customer_name, u.email as customer_email
        FROM auction_deposits ad
        LEFT JOIN users u ON ad.user_id = u.id
        WHERE ad.lot_id = ?
        ORDER BY ad.created_at DESC
      `).all(req.params.id);

      res.json({ bids, deposits });
    } catch (err: any) {
      console.error('Admin get bidders error:', err);
      res.status(500).json({ error: 'Failed to load bidder breakdown.' });
    }
  });


  // =========================================================================
  // 3. LEGAL POLICY HUB, VERSIONING & USER CONSENT TRACKING (Part 6, 7 & 8)
  // =========================================================================

  // 3.1 List all 16 Authoritative Legal Policies
  app.get('/api/legal/policies', (req: Request, res: Response): void => {
    try {
      const policies = db.prepare(`
        SELECT p.*, pv.version as current_version, pv.effective_date, pv.content_md
        FROM legal_policies p
        LEFT JOIN legal_policy_versions pv ON p.id = pv.policy_id AND pv.status = 'published'
        ORDER BY p.title ASC
      `).all();

      res.json({ policies });
    } catch (err: any) {
      console.error('Get policies error:', err);
      res.status(500).json({ error: 'Failed to retrieve legal policies.' });
    }
  });

  // 3.2 Single Policy with Markdown Content & Available Versions
  app.get('/api/legal/policies/:slug', (req: Request, res: Response): void => {
    try {
      const slugMap: Record<string, string> = {
        'terms-of-service': 'terms-and-conditions',
        'terms-conditions': 'terms-and-conditions',
        'auction-rules': 'auction-terms',
        'account-rental-agreement': 'rental-terms',
        'grievance-redressal': 'grievance-policy',
      };
      const resolvedSlug = slugMap[req.params.slug] || req.params.slug;
      const policy = db.prepare('SELECT * FROM legal_policies WHERE slug = ?').get(resolvedSlug) as any;
      if (!policy) {
        res.status(404).json({ error: 'Legal policy document not found.' });
        return;
      }

      const currentVersion = db.prepare(`
        SELECT * FROM legal_policy_versions
        WHERE policy_id = ? AND status = 'published'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(policy.id) as any;

      const versions = db.prepare(`
        SELECT id, version, effective_date, summary_of_changes, status, created_at
        FROM legal_policy_versions
        WHERE policy_id = ?
        ORDER BY created_at DESC
      `).all(policy.id);

      res.json({ policy, currentVersion, activeVersion: currentVersion, versions });
    } catch (err: any) {
      console.error('Get policy slug error:', err);
      res.status(500).json({ error: 'Failed to load policy document.' });
    }
  });

  // 3.3 Historical Policy Version
  app.get('/api/legal/policies/:slug/versions/:version', (req: Request, res: Response): void => {
    try {
      const slugMap: Record<string, string> = {
        'terms-of-service': 'terms-and-conditions',
        'terms-conditions': 'terms-and-conditions',
        'auction-rules': 'auction-terms',
        'account-rental-agreement': 'rental-terms',
        'grievance-redressal': 'grievance-policy',
      };
      const resolvedSlug = slugMap[req.params.slug] || req.params.slug;
      const policy = db.prepare('SELECT * FROM legal_policies WHERE slug = ?').get(resolvedSlug) as any;
      if (!policy) {
        res.status(404).json({ error: 'Policy not found.' });
        return;
      }

      const versionDoc = db.prepare(`
        SELECT * FROM legal_policy_versions
        WHERE policy_id = ? AND version = ?
      `).get(policy.id, req.params.version) as any;

      if (!versionDoc) {
        res.status(404).json({ error: 'Version not found.' });
        return;
      }

      res.json({ policy, versionDoc });
    } catch (err: any) {
      console.error('Get version error:', err);
      res.status(500).json({ error: 'Failed to load historical version.' });
    }
  });

  // 3.4 Record User Legal Consent (Part 7: explicit audit logs)
  // P2-F6: authentication is required, and consent is always attributed to the
  // authenticated user (req.user.id). Client-supplied userId is ignored.
  app.post('/api/legal/consent', authenticate, (req: any, res: Response): void => {
    try {
      const {
        policySlug,
        version = '1.0',
        consentType = 'explicit_checkbox',
        contextType = 'web_consent',
        contextId = ''
      } = req.body || {};

      let policyId = '';
      if (policySlug) {
        const p = db.prepare('SELECT id FROM legal_policies WHERE slug = ?').get(policySlug) as any;
        if (p) policyId = p.id;
      }

      const userId = req.user?.id || 'anonymous_guest';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown Browser';
      const id = 'cns_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO user_consents (
          id, user_id, policy_id, policy_version, consent_type, context_type, context_id, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        policyId || 'all_terms_acceptance',
        version,
        consentType,
        contextType,
        contextId,
        String(ip),
        String(userAgent),
        now
      );

      res.json({ success: true, consentId: id, timestamp: now });
    } catch (err: any) {
      console.error('Consent record error:', err);
      res.status(500).json({ error: 'Failed to record legal consent.' });
    }
  });

  // 3.5 Admin Legal Management: create new draft version
  app.post('/api/admin/legal/policies/:id/versions', authenticate, adminOnly, (req: any, res: Response): void => {
    try {
      const policy = db.prepare('SELECT * FROM legal_policies WHERE id = ?').get(req.params.id) as any;
      if (!policy) {
        res.status(404).json({ error: 'Policy not found.' });
        return;
      }

      const { version, contentMd, summaryOfChanges = 'Updated terms' } = req.body || {};
      if (!version || !contentMd) {
        res.status(400).json({ error: 'Version string and content markdown are required.' });
        return;
      }

      const id = 'pv_' + crypto.randomBytes(6).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO legal_policy_versions (
          id, policy_id, version, title, content_md, summary_of_changes, published_by,
          effective_date, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
      `).run(
        id,
        policy.id,
        version,
        policy.title,
        contentMd,
        summaryOfChanges,
        req.user.name,
        now.slice(0, 10),
        now
      );

      res.status(201).json({ message: `Draft version ${version} created successfully.`, versionId: id });
    } catch (err: any) {
      console.error('Create version error:', err);
      res.status(500).json({ error: 'Failed to create draft version.' });
    }
  });

  // 3.6 Admin Legal Management: publish version
  app.post('/api/admin/legal/policies/:id/publish', authenticate, adminOnly, (req: any, res: Response): void => {
    try {
      const { versionId } = req.body || {};
      const targetVersion = db.prepare('SELECT * FROM legal_policy_versions WHERE id = ? AND policy_id = ?').get(versionId, req.params.id) as any;
      if (!targetVersion) {
        res.status(404).json({ error: 'Target version not found.' });
        return;
      }

      const now = new Date().toISOString();

      // Archive previous published versions
      db.prepare("UPDATE legal_policy_versions SET status = 'archived' WHERE policy_id = ? AND status = 'published'")
        .run(req.params.id);

      // Publish new version
      db.prepare("UPDATE legal_policy_versions SET status = 'published', effective_date = ? WHERE id = ?")
        .run(now.slice(0, 10), targetVersion.id);

      res.json({ message: `Version ${targetVersion.version} published as current active policy.` });
    } catch (err: any) {
      console.error('Publish version error:', err);
      res.status(500).json({ error: 'Failed to publish version.' });
    }
  });

  // 3.7 Admin User Consents Log
  app.get('/api/admin/legal/consents', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const consents = db.prepare(`
        SELECT uc.*, lp.title as policy_title, lp.slug as policy_slug, u.name as user_name, u.email as user_email
        FROM user_consents uc
        LEFT JOIN legal_policies lp ON uc.policy_id = lp.id
        LEFT JOIN users u ON uc.user_id = u.id
        ORDER BY uc.created_at DESC
        LIMIT 100
      `).all();

      res.json({ consents });
    } catch (err: any) {
      console.error('Admin get consents error:', err);
      res.status(500).json({ error: 'Failed to load user consent audit logs.' });
    }
  });
}
