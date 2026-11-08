/**
 * Auctions regression spec (API-level, uses Playwright `request` fixture).
 *
 * Full lifecycle against a freshly created admin lot:
 *   create+publish -> list -> deposit intent/confirm (A) -> below-min bid reject
 *   -> valid bid A -> B deposit+bid -> A raise -> bid history -> admin close
 *   -> winner fields -> winner-pay (regression: previously 500) -> user orders
 *   -> losing bidder claim-refund (regression).
 */
import { test, expect } from '@playwright/test';
import { api, login, QA } from '../helpers/api';

test.describe('Auctions (API)', () => {
  test('deposit, bidding, close, winner-pay and refund lifecycle', async ({ request }) => {
    const adminToken = await login(request, QA.admin.email, QA.admin.password);
    const aToken = await login(request, QA.customer.email, QA.customer.password);
    const bToken = await login(request, QA.customer2.email, QA.customer2.password);

    // 0. Admin creates + publishes a lot.
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const created = await api(request, 'POST', '/api/admin/auctions', {
      title: `QA Auction ${Date.now()}`,
      starting_bid: 2000,
      bid_increment: 150,
      ends_at: endsAt,
      image_url: '/assets/skins/kuronami_vandal.png',
      deposit_pct: 50,
      min_deposit_amount: 500,
      status: 'draft',
    }, adminToken);
    expect(created.status).toBe(201);
    const lotId: string = created.data.lot.id;

    const published = await api(request, 'POST', `/api/admin/auctions/${lotId}/publish`, {}, adminToken);
    expect(published.status).toBe(200);

    // 1. Public list includes the lot.
    const list = await api(request, 'GET', '/api/auctions');
    expect(list.status).toBe(200);
    expect((list.data.lots as any[]).some((l) => l.id === lotId)).toBe(true);

    // 2. Deposit intent + confirm for A (50% of submitted bid).
    const intentA = await api(request, 'POST', `/api/auctions/${lotId}/deposit-intent`, { submittedBid: 2300 }, aToken);
    expect(intentA.status).toBe(200);
    expect(Number(intentA.data.depositPercentage)).toBe(50);
    expect(Number(intentA.data.additionalPayable)).toBeGreaterThan(0);
    const depositA: string = intentA.data.depositTxId;

    const confirmA = await api(request, 'POST', `/api/auctions/${lotId}/deposit-confirm`, {
      depositTxId: depositA,
      gatewayRef: 'UTR_TEST123',
    }, aToken);
    expect(confirmA.status).toBe(200);

    // 3. Bid below minimum is rejected (400/409).
    const lowBid = await api(request, 'POST', `/api/auctions/${lotId}/bid`, {
      amount: 2000,
      depositTxId: depositA,
    }, aToken);
    expect([400, 409]).toContain(lowBid.status);

    // 4. Valid bid A (starting 2000 + increment 150).
    const bidA1 = await api(request, 'POST', `/api/auctions/${lotId}/bid`, {
      amount: 2150,
      depositTxId: depositA,
    }, aToken);
    expect(bidA1.status).toBe(201);

    // 5. B deposits and bids higher (2300) -> becomes losing bidder after A raises.
    const intentB = await api(request, 'POST', `/api/auctions/${lotId}/deposit-intent`, { submittedBid: 2300 }, bToken);
    expect(intentB.status).toBe(200);
    const depositB: string = intentB.data.depositTxId;
    const confirmB = await api(request, 'POST', `/api/auctions/${lotId}/deposit-confirm`, {
      depositTxId: depositB,
      gatewayRef: 'UTR_B',
    }, bToken);
    expect(confirmB.status).toBe(200);

    const bidB = await api(request, 'POST', `/api/auctions/${lotId}/bid`, {
      amount: 2300,
      depositTxId: depositB,
    }, bToken);
    expect(bidB.status).toBe(201);

    // 6. A raises to 2450 (final winner).
    const bidA2 = await api(request, 'POST', `/api/auctions/${lotId}/bid`, {
      amount: 2450,
      depositTxId: depositA,
    }, aToken);
    expect(bidA2.status).toBe(201);

    // 7. Bid history contains both bids.
    const detail = await api(request, 'GET', `/api/auctions/${lotId}`);
    expect(detail.status).toBe(200);
    const amounts = (detail.data.bids as any[]).map((b) => Number(b.amount));
    expect(amounts).toContain(2450);
    expect(amounts).toContain(2300);

    // 8. Admin close -> winner locked.
    const close = await api(request, 'POST', `/api/admin/auctions/${lotId}/close`, {}, adminToken);
    expect(close.status).toBe(200);

    const afterClose = await api(request, 'GET', `/api/auctions/${lotId}`);
    const lot = afterClose.data.lot;
    expect(lot.status).toBe('ended');
    expect(lot.winner_user_id).toBeTruthy();
    expect(lot.winner_name).toBeTruthy();
    expect(Number(lot.winning_bid_amount)).toBe(2450);

    // 9. Winner pay regression (was a 500 bug; must be 200).
    const winPay = await api(request, 'POST', `/api/auctions/${lotId}/winner-pay`, {
      transactionRef: 'UTR_WIN123',
    }, aToken);
    if (winPay.status !== 200) {
      test.info().annotations.push({
        type: 'bug',
        description:
          `Auction winner-pay returned ${winPay.status} (expected 200) for lot ${lotId}. ` +
          `This endpoint previously had a 500 bug. Response: ${JSON.stringify(winPay.data)}`,
      });
    }
    expect(winPay.status).toBe(200);

    // 10. Winner's order list includes the auction order.
    const ordersRes = await api(request, 'GET', '/api/user/orders', undefined, aToken);
    expect(ordersRes.status).toBe(200);
    const auctionOrder = (ordersRes.data.orders as any[]).find(
      (o) => o.type === 'auction' && JSON.stringify(o.details_json ?? '').includes(lotId),
    );
    expect(auctionOrder).toBeTruthy();
    expect(Number(auctionOrder.amount)).toBe(2450);

    // 11. Losing bidder refund claim (expected 200; 500/404 recorded as bug).
    const refund = await api(request, 'POST', `/api/auctions/${lotId}/claim-refund`, {}, bToken);
    if (refund.status !== 200) {
      test.info().annotations.push({
        type: 'bug',
        description:
          `Losing bidder claim-refund returned ${refund.status} (expected 200) for lot ${lotId}. ` +
          `Response: ${JSON.stringify(refund.data)}`,
      });
    }
    expect(refund.status).toBe(200);
    expect(Number(refund.data.totalRefunded)).toBeGreaterThan(0);
  });
});
