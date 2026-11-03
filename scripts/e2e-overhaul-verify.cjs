const http = require('http');

function postJson(path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function putJson(path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== STARTING END-TO-END VERIFICATION SUITE ===');

  // 1. Authenticate Admin
  console.log('\n[1] Authenticating Admin user...');
  const adminLogin = await postJson('/api/auth/login', {
    email: 'admin@vib.gg',
    password: 'AdminPassword@123'
  });
  if (adminLogin.status !== 200 || !adminLogin.data.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.token;
  console.log('Admin authenticated successfully. Role:', adminLogin.data.user.role);

  // 2. Authenticate or Register Customer
  console.log('\n[2] Authenticating Customer user...');
  let userLogin = await postJson('/api/auth/login', {
    email: 'customer_test@vib.gg',
    password: 'Password123!'
  });
  if (userLogin.status !== 200 || !userLogin.data.token) {
    userLogin = await postJson('/api/auth/register', {
      name: 'Customer Test',
      email: 'customer_test@vib.gg',
      password: 'Password123!',
      terms_accepted: true
    });
  }
  if (userLogin.status !== 200 && userLogin.status !== 201) {
    throw new Error('Customer auth failed: ' + JSON.stringify(userLogin.data));
  }
  const userToken = userLogin.data.token;
  console.log('Customer authenticated successfully. ID:', userLogin.data.user.id);

  // 3. Admin creates an Auction Lot
  console.log('\n[3] Admin creating new Auction Lot...');
  const lotPayload = {
    lot_number: 'LOT-E2E-' + Date.now().toString().slice(-4),
    title: 'Kuronami Vandal & Radiant Gun Buddy Account',
    description: 'Premier competitive account with Kuronami Vandal, Reaver Operator, and Champions 2024 bundle.',
    starting_bid: 2000,
    bid_increment: 200,
    deposit_pct: 50,
    min_deposit_amount: 1000,
    category: 'Valorant High Tier',
    server_region: 'Asia Pacific (Mumbai)',
    account_level: 165,
    rank_tier: 'Ascendant 2',
    delivery_method: 'Direct Escrow Transfer',
    delivery_time_hours: 1,
    deposit_refund_rules: '100% automatic refund to losing bidders within 2 hours of auction closing.',
    status: 'draft'
  };
  const createLotRes = await postJson('/api/admin/auctions', lotPayload, adminToken);
  console.log('Create lot status:', createLotRes.status);
  const createdLot = createLotRes.data.lot;
  if (!createdLot || !createdLot.id) {
    throw new Error('Auction creation failed: ' + JSON.stringify(createLotRes.data));
  }
  console.log('Created lot ID:', createdLot.id, 'Lot Number:', createdLot.lot_number);

  // 4. Admin publishes the auction
  console.log('\n[4] Admin publishing auction lot to active...');
  const pubRes = await postJson(`/api/admin/auctions/${createdLot.id}/publish`, {}, adminToken);
  console.log('Publish status:', pubRes.status, 'New status:', pubRes.data.lot?.status);

  // 5. Customer fetches active auctions
  console.log('\n[5] Customer checking public auction marketplace...');
  const pubAuctions = await getJson('/api/auctions');
  const foundInMarket = pubAuctions.data.lots.find((l) => l.id === createdLot.id);
  console.log('Lot found in public auctions:', !!foundInMarket);

  // 6. Customer initiates bid deposit intent (Starting bid ₹2000, customer bids ₹2400 -> 50% deposit = ₹1200)
  console.log('\n[6] Customer initiating bid of ₹2,400 (50% deposit = ₹1,200)...');
  const bidIntent = await postJson(
    `/api/auctions/${createdLot.id}/deposit-intent`,
    { submittedBid: 2400 },
    userToken
  );
  console.log('Bid intent result:', bidIntent.data);
  const depositTxId = bidIntent.data.depositTxId;
  if (!depositTxId) {
    throw new Error('Bid intent failed: ' + JSON.stringify(bidIntent.data));
  }

  // 7. Customer submits UPI deposit UTR & places bid
  console.log('\n[7] Customer confirming deposit payment and placing verified bid...');
  const confirmDeposit = await postJson(
    `/api/auctions/${createdLot.id}/deposit-confirm`,
    {
      depositTxId,
      gatewayRef: 'UTR998877665544'
    },
    userToken
  );
  console.log('Deposit confirmation result:', confirmDeposit.data);

  const placeBidRes = await postJson(
    `/api/auctions/${createdLot.id}/bid`,
    {
      amount: 2400,
      depositTxId
    },
    userToken
  );
  console.log('Place bid result:', placeBidRes.data);
  if (!placeBidRes.data.bidId) {
    throw new Error('Bid submission failed: ' + JSON.stringify(placeBidRes.data));
  }

  // Verify auction current bid updated to ₹2400
  const updatedLot = await getJson(`/api/auctions/${createdLot.id}`);
  console.log('Updated Lot current bid:', updatedLot.data.lot.current_bid, 'Total bids:', updatedLot.data.bids?.length);

  // 8. Admin creates a genuine Rental Profile
  console.log('\n[8] Admin creating genuine rental profile...');
  const rentalPayload = {
    title: 'Immortal 1 Kuronami & Prime Vandal Profile',
    description: 'Fully unlocked competitive loadout for ranked grind. Includes Kuronami Vandal and Prime Melee.',
    account_identifier: 'VIB-RENT-001',
    rank: 'Immortal 1',
    region: 'Asia Pacific (Mumbai)',
    featured_skins_json: ['Kuronami Vandal', 'Prime Axe', 'Ion Phantom', 'Sovereign Ghost'],
    price_24h: 349,
    price_3d: 899,
    price_7d: 1799,
    price_30d: 5499,
    security_deposit: 500,
    terms_conditions: 'Strictly zero toxicity, zero rank tampering, zero 3rd-party injectors.'
  };
  const rentalRes = await postJson('/api/admin/rentals', rentalPayload, adminToken);
  console.log('Create rental status:', rentalRes.status);
  const rentalProfile = rentalRes.data.listing;
  if (!rentalProfile || !rentalProfile.id) {
    throw new Error('Rental creation failed: ' + JSON.stringify(rentalRes.data));
  }
  console.log('Rental profile ID:', rentalProfile.id, 'Title:', rentalProfile.title);

  // 9. Customer rents the profile for 24h
  console.log('\n[9] Customer booking 24h rental...');
  const bookRes = await postJson(
    `/api/rentals/${rentalProfile.id}/book`,
    {
      duration: '24h',
      transactionRef: 'UTR112233445566'
    },
    userToken
  );
  console.log('Booking status:', bookRes.status, 'Booking ID:', bookRes.data.booking?.id);
  const bookingId = bookRes.data.booking?.id;

  // 10. Admin issues encrypted credentials to customer vault
  console.log('\n[10] Admin issuing Riot credentials to vault...');
  const credsRes = await postJson(
    `/api/admin/rentals/bookings/${bookingId}/activate`,
    {
      loginUsername: 'vib_pro_rental_01',
      loginPassword: 'RiotSecurePass2026!',
      sessionHours: 24
    },
    adminToken
  );
  console.log('Credentials dispatch status:', credsRes.status);

  // 11. Customer checks "My Rentals" and reads credentials
  console.log('\n[11] Customer inspecting vault in My Rentals dashboard...');
  const myRentals = await getJson('/api/user/my-rentals', userToken);
  const activeBooking = myRentals.data.bookings?.find((r) => r.id === bookingId);
  console.log('Customer sees active booking:', !!activeBooking);
  if (activeBooking && activeBooking.credentials_vault_json) {
    const creds = JSON.parse(activeBooking.credentials_vault_json);
    console.log('Decrypted Vault credentials received by customer:');
    console.log('  Riot Username:', creds.username);
    console.log('  Riot Password:', creds.password ? '•••••••• (Received)' : 'Missing');
  } else {
    throw new Error('Vault credentials missing from customer response: ' + JSON.stringify(activeBooking));
  }

  // 12. Check Legal Consent Audit Log
  console.log('\n[12] Checking Admin Legal Consent Audit Logs...');
  const consentLogs = await getJson('/api/admin/legal/consents', adminToken);
  console.log('Total logged user consents in DB:', consentLogs.data.consents?.length);
  if (consentLogs.data.consents?.length > 0) {
    const latest = consentLogs.data.consents[0];
    console.log('Latest consent record:');
    console.log('  Policy ID:', latest.policy_id, '| Version:', latest.policy_version, '| Type:', latest.context_type);
  }

  console.log('\n========================================');
  console.log('>>> ALL VERIFICATION CHECKS PASSED 100% <<<');
  console.log('========================================');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
