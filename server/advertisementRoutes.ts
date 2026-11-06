import { Request, Response, Express } from 'express';
import crypto from 'node:crypto';
import {
  sendAdminAdOrderNotification,
  sendCustomerAdPaymentApproved,
  sendCustomerAdPaymentRejected,
  sendAdminAdDetailsSubmitted
} from './email.js';

export function registerAdvertisementRoutes(
  app: Express,
  db: any,
  authenticate: any,
  adminOnly: any
) {
  // Public: Get all active advertisement plans
  app.get('/api/advertisement/plans', (req: Request, res: Response): void => {
    try {
      const rows = db.prepare(`
        SELECT * FROM advertisement_plans
        WHERE is_active = 1
        ORDER BY display_order ASC, price ASC
      `).all();

      const plans = rows.map((r: any) => ({
        ...r,
        is_active: Boolean(r.is_active),
        instagram_story: Boolean(r.instagram_story),
        instagram_post: Boolean(r.instagram_post),
        highlight_placement: Boolean(r.highlight_placement),
        website_listing: Boolean(r.website_listing),
        inventory_editing: Boolean(r.inventory_editing),
        buyer_assistance: Boolean(r.buyer_assistance),
        priority_placement: Boolean(r.priority_placement),
        dedicated_agent: Boolean(r.dedicated_agent),
        lifetime_guaranteed: Boolean(r.lifetime_guaranteed),
        benefits: typeof r.benefits_json === 'string' ? JSON.parse(r.benefits_json || '[]') : [],
      }));

      res.json({ success: true, plans });
    } catch (err: any) {
      console.error('[Ad Plans Fetch Error]:', err);
      res.status(500).json({ error: 'Failed to retrieve advertisement plans.' });
    }
  });

  // Admin: Get all advertisement plans (including inactive)
  app.get('/api/admin/advertisement/plans', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const rows = db.prepare(`
        SELECT * FROM advertisement_plans
        ORDER BY display_order ASC, price ASC
      `).all();

      const plans = rows.map((r: any) => ({
        ...r,
        is_active: Boolean(r.is_active),
        instagram_story: Boolean(r.instagram_story),
        instagram_post: Boolean(r.instagram_post),
        highlight_placement: Boolean(r.highlight_placement),
        website_listing: Boolean(r.website_listing),
        inventory_editing: Boolean(r.inventory_editing),
        buyer_assistance: Boolean(r.buyer_assistance),
        priority_placement: Boolean(r.priority_placement),
        dedicated_agent: Boolean(r.dedicated_agent),
        lifetime_guaranteed: Boolean(r.lifetime_guaranteed),
        benefits: typeof r.benefits_json === 'string' ? JSON.parse(r.benefits_json || '[]') : [],
      }));

      res.json({ success: true, plans });
    } catch (err: any) {
      console.error('[Admin Ad Plans Error]:', err);
      res.status(500).json({ error: 'Failed to fetch admin advertisement plans.' });
    }
  });

  // Admin: Create new advertisement plan
  app.post('/api/admin/advertisement/plans', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const {
        name,
        price,
        category = 'standard',
        description = '',
        badge = '',
        display_order = 99,
        is_active = 1,
        instagram_story = 0,
        instagram_post = 0,
        highlight_placement = 0,
        story_count = 'None',
        website_listing = 0,
        inventory_editing = 0,
        promotion_duration = 'Standard',
        buyer_assistance = 0,
        priority_placement = 0,
        dedicated_agent = 0,
        lifetime_guaranteed = 0,
        benefits = [],
      } = req.body || {};

      if (!name || price === undefined || price === null) {
        res.status(400).json({ error: 'Package name and price are required.' });
        return;
      }

      const id = 'ad-plan-' + crypto.randomBytes(4).toString('hex');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO advertisement_plans (
          id, category, name, price, description, badge, display_order, is_active,
          instagram_story, instagram_post, highlight_placement, story_count, website_listing,
          inventory_editing, promotion_duration, buyer_assistance, priority_placement,
          dedicated_agent, lifetime_guaranteed, benefits_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        category,
        name,
        Number(price),
        description,
        badge,
        Number(display_order),
        is_active ? 1 : 0,
        instagram_story ? 1 : 0,
        instagram_post ? 1 : 0,
        highlight_placement ? 1 : 0,
        story_count,
        website_listing ? 1 : 0,
        inventory_editing ? 1 : 0,
        promotion_duration,
        buyer_assistance ? 1 : 0,
        priority_placement ? 1 : 0,
        dedicated_agent ? 1 : 0,
        lifetime_guaranteed ? 1 : 0,
        JSON.stringify(Array.isArray(benefits) ? benefits : []),
        now,
        now
      );

      res.json({ success: true, id, message: 'Advertisement plan created successfully.' });
    } catch (err: any) {
      console.error('[Create Ad Plan Error]:', err);
      res.status(500).json({ error: 'Failed to create advertisement plan.' });
    }
  });

  // Admin: Update advertisement plan
  app.put('/api/admin/advertisement/plans/:id', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const {
        name,
        price,
        category,
        description,
        badge,
        display_order,
        is_active,
        instagram_story,
        instagram_post,
        highlight_placement,
        story_count,
        website_listing,
        inventory_editing,
        promotion_duration,
        buyer_assistance,
        priority_placement,
        dedicated_agent,
        lifetime_guaranteed,
        benefits,
      } = req.body || {};

      const existing = db.prepare('SELECT id FROM advertisement_plans WHERE id = ?').get(id);
      if (!existing) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const now = new Date().toISOString();

      db.prepare(`
        UPDATE advertisement_plans
        SET name = COALESCE(?, name),
            price = COALESCE(?, price),
            category = COALESCE(?, category),
            description = COALESCE(?, description),
            badge = COALESCE(?, badge),
            display_order = COALESCE(?, display_order),
            is_active = COALESCE(?, is_active),
            instagram_story = COALESCE(?, instagram_story),
            instagram_post = COALESCE(?, instagram_post),
            highlight_placement = COALESCE(?, highlight_placement),
            story_count = COALESCE(?, story_count),
            website_listing = COALESCE(?, website_listing),
            inventory_editing = COALESCE(?, inventory_editing),
            promotion_duration = COALESCE(?, promotion_duration),
            buyer_assistance = COALESCE(?, buyer_assistance),
            priority_placement = COALESCE(?, priority_placement),
            dedicated_agent = COALESCE(?, dedicated_agent),
            lifetime_guaranteed = COALESCE(?, lifetime_guaranteed),
            benefits_json = CASE WHEN ? IS NOT NULL THEN ? ELSE benefits_json END,
            updated_at = ?
        WHERE id = ?
      `).run(
        name,
        price !== undefined ? Number(price) : null,
        category,
        description,
        badge,
        display_order !== undefined ? Number(display_order) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        instagram_story !== undefined ? (instagram_story ? 1 : 0) : null,
        instagram_post !== undefined ? (instagram_post ? 1 : 0) : null,
        highlight_placement !== undefined ? (highlight_placement ? 1 : 0) : null,
        story_count,
        website_listing !== undefined ? (website_listing ? 1 : 0) : null,
        inventory_editing !== undefined ? (inventory_editing ? 1 : 0) : null,
        promotion_duration,
        buyer_assistance !== undefined ? (buyer_assistance ? 1 : 0) : null,
        priority_placement !== undefined ? (priority_placement ? 1 : 0) : null,
        dedicated_agent !== undefined ? (dedicated_agent ? 1 : 0) : null,
        lifetime_guaranteed !== undefined ? (lifetime_guaranteed ? 1 : 0) : null,
        benefits ? 1 : null,
        benefits ? JSON.stringify(benefits) : null,
        now,
        id
      );

      res.json({ success: true, message: 'Advertisement plan updated successfully.' });
    } catch (err: any) {
      console.error('[Update Ad Plan Error]:', err);
      res.status(500).json({ error: 'Failed to update advertisement plan.' });
    }
  });

  // Admin: Delete / Deactivate advertisement plan
  app.delete('/api/admin/advertisement/plans/:id', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const orderCount = (db.prepare('SELECT COUNT(*) as count FROM advertisement_orders WHERE plan_id = ?').get(id) as any)?.count || 0;

      if (orderCount > 0) {
        // Historical purchases exist: deactivate to preserve order history integrity
        db.prepare('UPDATE advertisement_plans SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
        res.json({ success: true, message: 'Plan has associated historical orders; deactivated to preserve order history.' });
      } else {
        db.prepare('DELETE FROM advertisement_plans WHERE id = ?').run(id);
        res.json({ success: true, message: 'Advertisement plan deleted.' });
      }
    } catch (err: any) {
      console.error('[Delete Ad Plan Error]:', err);
      res.status(500).json({ error: 'Failed to delete advertisement plan.' });
    }
  });

  // Public: Create Advertisement Order (Checkout Step 4)
  app.post('/api/advertisement/orders', async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        planId,
        customerName,
        customerEmail,
        customerPhone,
        paymentReference,
        paymentScreenshot,
      } = req.body || {};

      if (!planId || !customerName || !customerEmail || !customerPhone) {
        res.status(400).json({ error: 'Missing required customer or package details.' });
        return;
      }

      const plan = db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(planId);
      if (!plan) {
        res.status(404).json({ error: 'Selected advertisement package not found.' });
        return;
      }

      const isFreeBonus = plan.price === 0;

      if (!isFreeBonus && !paymentReference && !paymentScreenshot) {
        res.status(400).json({ error: 'Payment transaction reference or screenshot is required for paid packages.' });
        return;
      }

      const orderId = `AD-VIB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const submissionToken = `tok_${crypto.randomBytes(16).toString('hex')}`;
      const now = new Date().toISOString();

      // Free bonus plan gets approved immediately for details submission
      const initialStatus = isFreeBonus ? 'approved' : 'pending_payment';

      db.prepare(`
        INSERT INTO advertisement_orders (
          id, plan_id, plan_name, plan_price, customer_name, customer_email, customer_phone,
          status, payment_method, payment_reference, payment_screenshot, submission_token,
          created_at, updated_at, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upi', ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        plan.id,
        plan.name,
        plan.price,
        customerName.trim(),
        customerEmail.trim().toLowerCase(),
        customerPhone.trim(),
        initialStatus,
        paymentReference?.trim() || null,
        paymentScreenshot || null,
        submissionToken,
        now,
        now,
        isFreeBonus ? now : null
      );

      const createdOrder = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(orderId);

      // Dispatch admin notification email to teamvibofficial@gmail.com
      const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : undefined);
      sendAdminAdOrderNotification(createdOrder, origin).catch((e) =>
        console.warn('[Ad Order Email Error]:', e.message)
      );

      res.json({
        success: true,
        orderId,
        status: initialStatus,
        planName: plan.name,
        planPrice: plan.price,
        submissionToken,
        message: isFreeBonus
          ? 'Free listing order registered! You can now submit your account details.'
          : 'Payment submitted for verification. We will verify and email you shortly.',
      });
    } catch (err: any) {
      console.error('[Create Ad Order Error]:', err);
      res.status(500).json({ error: 'Failed to process advertisement order.' });
    }
  });

  // Public: Verify Order Submission Token
  app.get('/api/advertisement/orders/verify', (req: Request, res: Response): void => {
    try {
      const { orderId, token } = req.query;

      if (!orderId || !token) {
        res.status(400).json({ eligible: false, message: 'Order ID and security token are required.' });
        return;
      }

      const order = db.prepare(`
        SELECT id, plan_id, plan_name, plan_price, customer_name, customer_email, customer_phone,
               status, submission_token, rejection_reason, instagram_username, selling_price,
               current_rank, premium_skins, other_valuable_items, inventory_screenshot
        FROM advertisement_orders
        WHERE id = ? AND submission_token = ?
      `).get(orderId, token);

      if (!order) {
        res.status(404).json({ eligible: false, message: 'Invalid or expired advertisement order link.' });
        return;
      }

      if (order.status === 'pending_payment') {
        res.json({
          eligible: false,
          status: 'pending_payment',
          message: 'Payment verification is still pending review by the VIB team. You will receive an email once approved.',
          order,
        });
        return;
      }

      if (order.status === 'rejected') {
        res.json({
          eligible: false,
          status: 'rejected',
          message: 'Payment verification was rejected.',
          rejectionReason: order.rejection_reason,
          order,
        });
        return;
      }

      res.json({
        eligible: true,
        status: order.status,
        order,
      });
    } catch (err: any) {
      console.error('[Verify Ad Token Error]:', err);
      res.status(500).json({ eligible: false, error: 'Failed to verify advertisement order token.' });
    }
  });

  // Public: Submit Advertisement Details (Form submission)
  app.post('/api/advertisement/orders/:id/submit-details', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        token,
        instagramUsername,
        sellingPrice,
        currentRank,
        premiumSkins,
        otherValuableItems,
        inventoryScreenshot,
      } = req.body || {};

      if (!token) {
        res.status(401).json({ error: 'Security token is required.' });
        return;
      }

      const order = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      if (order.submission_token !== token) {
        res.status(403).json({ error: 'Invalid security token for this order.' });
        return;
      }

      if (order.status !== 'approved' && order.status !== 'details_submitted') {
        res.status(400).json({ error: `Cannot submit details for order in '${order.status}' status.` });
        return;
      }

      if (!instagramUsername || !sellingPrice || !currentRank || !premiumSkins || !inventoryScreenshot) {
        res.status(400).json({
          error: 'Please complete all required fields: Instagram handle, selling price, rank, premium skins, and inventory screenshot.'
        });
        return;
      }

      const now = new Date().toISOString();

      db.prepare(`
        UPDATE advertisement_orders
        SET status = 'details_submitted',
            instagram_username = ?,
            selling_price = ?,
            current_rank = ?,
            premium_skins = ?,
            other_valuable_items = ?,
            inventory_screenshot = ?,
            submitted_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        instagramUsername.trim().replace(/^@/, ''),
        sellingPrice.toString().trim(),
        currentRank.trim(),
        premiumSkins.trim(),
        otherValuableItems?.trim() || '',
        inventoryScreenshot,
        now,
        now,
        id
      );

      const updatedOrder = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      // Trigger automatic email to teamvibofficial@gmail.com with all required fields
      const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : undefined);
      sendAdminAdDetailsSubmitted(
        updatedOrder,
        {
          customer_name: updatedOrder.customer_name,
          customer_email: updatedOrder.customer_email,
          customer_phone: updatedOrder.customer_phone,
          instagram_username: instagramUsername.trim().replace(/^@/, ''),
          selling_price: sellingPrice,
          current_rank: currentRank,
          premium_skins: premiumSkins,
          other_valuable_items: otherValuableItems || '',
          inventory_screenshot: inventoryScreenshot,
        },
        origin
      ).catch((e) => console.warn('[Ad Details Admin Email Error]:', e.message));

      res.json({
        success: true,
        message: 'Advertisement details successfully submitted! Our team is preparing your campaign.',
      });
    } catch (err: any) {
      console.error('[Submit Ad Details Error]:', err);
      res.status(500).json({ error: 'Failed to submit advertisement details.' });
    }
  });

  // Admin: Get all advertisement orders
  app.get('/api/admin/advertisement/orders', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const { status, search } = req.query;
      let sql = 'SELECT * FROM advertisement_orders WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = `%${search.trim()}%`;
        sql += ' AND (id LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ? OR instagram_username LIKE ?)';
        params.push(q, q, q, q, q);
      }

      sql += ' ORDER BY created_at DESC';

      const orders = db.prepare(sql).all(...params);
      res.json({ success: true, orders });
    } catch (err: any) {
      console.error('[Admin Ad Orders Error]:', err);
      res.status(500).json({ error: 'Failed to fetch advertisement orders.' });
    }
  });

  // Admin: Approve advertisement payment
  app.post('/api/admin/advertisement/orders/:id/approve', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE advertisement_orders
        SET status = 'approved',
            approved_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, now, id);

      const updated = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      // Send email to customer with "Continue to Submit Advertisement Details" secure link
      const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : undefined);
      await sendCustomerAdPaymentApproved(updated, origin);

      res.json({
        success: true,
        message: `Payment approved! Confirmation email with submission link sent to ${order.customer_email}.`,
      });
    } catch (err: any) {
      console.error('[Approve Ad Payment Error]:', err);
      res.status(500).json({ error: 'Failed to approve advertisement payment.' });
    }
  });

  // Admin: Reject advertisement payment
  app.post('/api/admin/advertisement/orders/:id/reject', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      const order = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE advertisement_orders
        SET status = 'rejected',
            rejection_reason = ?,
            updated_at = ?
        WHERE id = ?
      `).run(reason || 'Unable to verify payment evidence.', now, id);

      const updated = db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);
      await sendCustomerAdPaymentRejected(updated, reason);

      res.json({
        success: true,
        message: `Payment marked rejected. Notice emailed to ${order.customer_email}.`,
      });
    } catch (err: any) {
      console.error('[Reject Ad Payment Error]:', err);
      res.status(500).json({ error: 'Failed to reject advertisement payment.' });
    }
  });

  // Admin: Mark advertisement as live
  app.post('/api/admin/advertisement/orders/:id/mark-live', authenticate, adminOnly, (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE advertisement_orders
        SET status = 'live',
            updated_at = ?
        WHERE id = ?
      `).run(now, id);

      res.json({ success: true, message: 'Advertisement campaign marked as LIVE.' });
    } catch (err: any) {
      console.error('[Mark Ad Live Error]:', err);
      res.status(500).json({ error: 'Failed to mark advertisement as live.' });
    }
  });
}
