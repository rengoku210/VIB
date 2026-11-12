import { Request, Response, Express } from 'express';
import crypto from 'node:crypto';
import { saveUploadedAsset, type DbClient } from './db.js';
import {
  sendAdminAdOrderNotification,
  sendCustomerAdPaymentApproved,
  sendCustomerAdPaymentRejected,
  sendAdminAdDetailsSubmitted
} from './email.js';

function safeJsonParse<T>(raw: any, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw || '') as T;
  } catch {
    return fallback;
  }
}

function formatPlanRow(r: any) {
  return {
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
    benefits: safeJsonParse<string[]>(r.benefits_json, []),
    custom_faq: safeJsonParse<Array<{ question: string; answer: string }>>(r.custom_faq_json, []),
    conditions: safeJsonParse<string[]>(r.conditions_json, []),
    ai_draft: r.ai_draft_json ? safeJsonParse<any>(r.ai_draft_json, null) : null,
  };
}

async function saveBase64Image(dataUri: string, prefix: string): Promise<string> {
  if (!dataUri || !dataUri.startsWith('data:image/')) {
    return dataUri;
  }
  const match = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) return dataUri;
  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  return await saveUploadedAsset(filename, '', buffer);
}

export function registerAdvertisementRoutes(
  app: Express,
  db: DbClient,
  authenticate: any,
  adminOnly: any
) {
  // Public: Get all active advertisement plans
  app.get('/api/advertisement/plans', async (req: Request, res: Response): Promise<void> => {
    try {
      const rows = await db.prepare(`
        SELECT * FROM advertisement_plans
        WHERE is_active = 1
        ORDER BY display_order ASC, price ASC
      `).all();

      const plans = rows.map(formatPlanRow);

      res.json({ success: true, plans });
    } catch (err: any) {
      console.error('[Ad Plans Fetch Error]:', err);
      res.status(500).json({ error: 'Failed to retrieve advertisement plans.' });
    }
  });

  // Public: Get single advertisement plan by ID (for dedicated product details page)
  app.get('/api/advertisement/plans/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const r = await db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(id) as any;
      if (!r) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const plan = formatPlanRow(r);

      res.json({ success: true, plan });
    } catch (err: any) {
      console.error('[Ad Plan Fetch Error]:', err);
      res.status(500).json({ error: 'Failed to retrieve advertisement plan.' });
    }
  });

  // Admin: Get all advertisement plans (including inactive)
  app.get('/api/admin/advertisement/plans', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const rows = await db.prepare(`
        SELECT * FROM advertisement_plans
        ORDER BY display_order ASC, price ASC
      `).all();

      const plans = rows.map(formatPlanRow);

      res.json({ success: true, plans });
    } catch (err: any) {
      console.error('[Admin Ad Plans Error]:', err);
      res.status(500).json({ error: 'Failed to fetch admin advertisement plans.' });
    }
  });

  // Admin: Create new advertisement plan
  app.post('/api/admin/advertisement/plans', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
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

      await db.prepare(`
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
  app.put('/api/admin/advertisement/plans/:id', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
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
        reach_estimate,
        placement_tag,
      } = req.body || {};

      const existing = await db.prepare('SELECT id FROM advertisement_plans WHERE id = ?').get(id);
      if (!existing) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const now = new Date().toISOString();

      await db.prepare(`
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
            reach_estimate = COALESCE(?, reach_estimate),
            placement_tag = COALESCE(?, placement_tag),
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
        reach_estimate ?? null,
        placement_tag ?? null,
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
  app.delete('/api/admin/advertisement/plans/:id', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const orderCount = ((await db.prepare('SELECT COUNT(*) as count FROM advertisement_orders WHERE plan_id = ?').get(id)) as any)?.count || 0;

      if (orderCount > 0) {
        // Historical purchases exist: deactivate to preserve order history integrity
        await db.prepare('UPDATE advertisement_plans SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
        res.json({ success: true, message: 'Plan has associated historical orders; deactivated to preserve order history.' });
      } else {
        await db.prepare('DELETE FROM advertisement_plans WHERE id = ?').run(id);
        res.json({ success: true, message: 'Advertisement plan deleted.' });
      }
    } catch (err: any) {
      console.error('[Delete Ad Plan Error]:', err);
      res.status(500).json({ error: 'Failed to delete advertisement plan.' });
    }
  });

  // Public/Authenticated: Create Draft Advertisement Order (when clicking Buy Now / checkout start)
  app.post('/api/advertisement/orders/create-draft', async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        planId,
        firstName,
        lastName,
        customerName,
        customerEmail,
        customerPhone,
        customerAccountNumber,
        customerCity,
        customerState,
        customerPincode,
        userId,
      } = req.body || {};

      if (!planId) {
        res.status(400).json({ error: 'Package ID is required.' });
        return;
      }

      // Fetch authentic plan directly from database — NEVER trust price from client!
      const plan = await db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(planId) as any;
      if (!plan) {
        res.status(404).json({ error: 'Selected advertisement package not found.' });
        return;
      }

      let resolvedFirstName = firstName?.trim() || null;
      let resolvedLastName = lastName?.trim() || null;
      let resolvedEmail = customerEmail?.trim().toLowerCase() || '';
      let resolvedPhone = customerPhone?.trim() || '';
      let resolvedAccountNumber = customerAccountNumber?.trim() || null;
      let resolvedCity = customerCity?.trim() || null;
      let resolvedState = customerState?.trim() || null;
      let resolvedPincode = customerPincode?.trim() || null;
      let resolvedUserId = userId || null;

      // Hydrate from users database record if available
      const dbUser = resolvedUserId
        ? (await db.prepare('SELECT * FROM users WHERE id = ?').get(resolvedUserId) as any)
        : resolvedEmail
        ? (await db.prepare('SELECT * FROM users WHERE email = ?').get(resolvedEmail) as any)
        : null;

      if (dbUser) {
        resolvedUserId = dbUser.id;
        resolvedFirstName = resolvedFirstName || dbUser.first_name || null;
        resolvedLastName = resolvedLastName || dbUser.last_name || null;
        resolvedEmail = resolvedEmail || dbUser.email || '';
        resolvedPhone = resolvedPhone || dbUser.phone || dbUser.account_number || '';
        resolvedAccountNumber = resolvedAccountNumber || dbUser.account_number || dbUser.phone || null;
        resolvedCity = resolvedCity || dbUser.city || null;
        resolvedState = resolvedState || dbUser.state || null;
        resolvedPincode = resolvedPincode || dbUser.pincode || null;
      }

      const fullName = (customerName || `${resolvedFirstName || ''} ${resolvedLastName || ''}`).trim() || dbUser?.name || 'VIB Customer';
      const orderId = `AD-VIB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const submissionToken = `tok_${crypto.randomBytes(16).toString('hex')}`;
      const now = new Date().toISOString();

      await db.prepare(`
        INSERT INTO advertisement_orders (
          id, plan_id, plan_name, plan_price, customer_name, customer_first_name, customer_last_name,
          customer_email, customer_phone, customer_account_number, customer_city, customer_state, customer_pincode, user_id,
          status, payment_method, submission_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'upi', ?, ?, ?)
      `).run(
        orderId,
        plan.id,
        plan.name,
        Number(plan.price),
        fullName,
        resolvedFirstName,
        resolvedLastName,
        resolvedEmail,
        resolvedPhone || resolvedAccountNumber || '',
        resolvedAccountNumber,
        resolvedCity,
        resolvedState,
        resolvedPincode,
        resolvedUserId,
        submissionToken,
        now,
        now
      );

      const createdOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(orderId);
      res.json({
        success: true,
        orderId,
        order: createdOrder,
        plan: formatPlanRow(plan),
      });
    } catch (err: any) {
      console.error('[Create Draft Ad Order Error]:', err);
      res.status(500).json({ error: 'Failed to create draft order.' });
    }
  });

  // Public: Verify Order Submission Token (Defined before /:id wildcard)
  app.get('/api/advertisement/orders/verify', async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId, token } = req.query;

      if (!orderId || !token) {
        res.status(400).json({ eligible: false, message: 'Order ID and security token are required.' });
        return;
      }

      const order = await db.prepare(`
        SELECT id, plan_id, plan_name, plan_price, customer_name, customer_email, customer_phone,
               status, submission_token, rejection_reason, instagram_username, selling_price,
               current_rank, premium_skins, other_valuable_items, inventory_screenshot,
               whatsapp_contact_enabled, inventory_screenshots_json
        FROM advertisement_orders
        WHERE id = ? AND submission_token = ?
      `).get(orderId, token);

      if (!order) {
        res.status(404).json({ eligible: false, message: 'Invalid or expired advertisement order link.' });
        return;
      }

      if (order.status === 'pending_payment' || order.status === 'submitted_for_verification') {
        res.json({
          eligible: false,
          status: order.status,
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

  // Public: Get Advertisement Order Details (for Checkout & Payment page)
  app.get('/api/advertisement/orders/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      // Fetch active payment settings from database
      const settings = await db.prepare('SELECT * FROM payment_settings WHERE id = ?').get('default') as any;

      // Fetch plan specs
      const plan = await db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(order.plan_id) as any;

      const canExposeSubmissionToken = ['approved', 'details_submitted', 'live', 'completed'].includes(
        String(order.status || '').toLowerCase()
      );
      const safeOrder = {
        ...order,
        submission_token: canExposeSubmissionToken ? order.submission_token : undefined,
      };

      res.json({
        success: true,
        order: safeOrder,
        plan: plan ? formatPlanRow(plan) : null,
        paymentConfigured: Boolean(settings?.upi_id),
        paymentSettings: settings ? {
          upi_id: settings.upi_id || '',
          payee_name: settings.payee_name || settings.account_name || '',
          qr_image_url: settings.qr_image_url || '',
          instructions: settings.instructions || '',
          support_whatsapp: settings.support_whatsapp || '',
        } : null,
      });
    } catch (err: any) {
      console.error('[Get Ad Order Error]:', err);
      res.status(500).json({ error: 'Failed to retrieve order details.' });
    }
  });

  // Public: Submit Payment Proof for Advertisement Order
  app.post('/api/advertisement/orders/:id/submit-payment', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { paymentReference, paymentScreenshot } = req.body || {};

      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const isFree = order.plan_price === 0;
      if (!isFree) {
        if (!paymentReference?.trim()) {
          res.status(400).json({ error: 'Transaction ID / UTR reference number is required.' });
          return;
        }
        if (!paymentScreenshot) {
          res.status(400).json({ error: 'Payment screenshot proof is required.' });
          return;
        }
      }

      const now = new Date().toISOString();
      const newStatus = isFree ? 'approved' : 'submitted_for_verification';
      const storedScreenshot = paymentScreenshot
        ? await saveBase64Image(paymentScreenshot, `ad_${id}_pay`)
        : null;

      await db.prepare(`
        UPDATE advertisement_orders
        SET status = ?,
            payment_reference = ?,
            payment_screenshot = ?,
            approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
            updated_at = ?
        WHERE id = ?
      `).run(
        newStatus,
        paymentReference?.trim() || null,
        storedScreenshot,
        newStatus,
        now,
        now,
        id
      );

      const updatedOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      // Notify admin team via email
      const origin = req.headers.origin || (req.headers.host ? `${req.protocol}://${req.headers.host}` : undefined);
      sendAdminAdOrderNotification(updatedOrder, origin).catch((e) =>
        console.warn('[Ad Order Notification Email Error]:', e.message)
      );

      res.json({
        success: true,
        orderId: id,
        status: newStatus,
        submissionToken: isFree ? order.submission_token : undefined,
        updatedAt: now,
        message: isFree
          ? 'Free listing order confirmed! You can now submit your account details.'
          : 'Payment submitted for verification. We will verify and notify you shortly.',
      });
    } catch (err: any) {
      console.error('[Submit Payment Error]:', err);
      res.status(500).json({ error: 'Failed to submit payment evidence.' });
    }
  });

  // Public: Create Advertisement Order (Legacy / Direct modal support)
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

      const plan = await db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(planId) as any;
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
      const storedLegacyScreenshot = paymentScreenshot
        ? await saveBase64Image(paymentScreenshot, `ad_${orderId}_pay`)
        : null;

      await db.prepare(`
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
        storedLegacyScreenshot,
        submissionToken,
        now,
        now,
        isFreeBonus ? now : null
      );

      const createdOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(orderId);

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

  // Public: Submit Advertisement Details (Form submission)
  app.post('/api/advertisement/orders/:id/submit-details', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        token,
        customerName,
        customerEmail,
        customerPhone,
        whatsappContactEnabled,
        instagramUsername,
        sellingPrice,
        currentRank,
        premiumSkins,
        otherValuableItems,
        inventoryScreenshot,
        inventoryScreenshots,
      } = req.body || {};

      if (!token) {
        res.status(401).json({ error: 'Security token is required.' });
        return;
      }

      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      if (order.submission_token !== token) {
        res.status(403).json({ error: 'Invalid security token for this order.' });
        return;
      }

      if (order.status !== 'approved' && order.status !== 'details_submitted' && order.status !== 'live') {
        res.status(400).json({ error: `Cannot submit details for order in '${order.status}' status.` });
        return;
      }

      // Instagram username is optional after moving away from Instagram promotions
      const cleanInstagram = (instagramUsername || '').trim().replace(/^@/, '');
      const cleanPrice = (sellingPrice || '').toString().trim();
      const cleanRank = (currentRank || '').trim();
      const cleanSkins = (premiumSkins || '').trim();

      // Normalize screenshots: accept array or single screenshot, capped at 3
      let rawScreenshots: string[] = [];
      if (Array.isArray(inventoryScreenshots) && inventoryScreenshots.length > 0) {
        rawScreenshots = inventoryScreenshots.filter(Boolean).slice(0, 3);
      } else if (inventoryScreenshot) {
        rawScreenshots = [inventoryScreenshot];
      }

      if (!cleanPrice) {
        res.status(400).json({ error: 'Selling price is mandatory.' });
        return;
      }
      if (!cleanRank) {
        res.status(400).json({ error: 'Current rank is mandatory.' });
        return;
      }
      if (!cleanSkins) {
        res.status(400).json({ error: 'Please list your premium skins and collections.' });
        return;
      }
      if (rawScreenshots.length === 0) {
        res.status(400).json({ error: 'Please upload at least 1 inventory screenshot (max 3 allowed).' });
        return;
      }

      // Persist screenshots to uploaded_assets and uploads directory and get static URLs
      const savedScreenshotUrls: string[] = await Promise.all(
        rawScreenshots.map((shot, idx) => saveBase64Image(shot, `ad_${id}_inv_${idx + 1}`))
      );
      const primaryScreenshot = savedScreenshotUrls[0];
      const screenshotsJson = JSON.stringify(savedScreenshotUrls);
      const isWhatsappEnabled = whatsappContactEnabled === false ? 0 : 1;
      const now = new Date().toISOString();

      await db.prepare(`
        UPDATE advertisement_orders
        SET status = 'details_submitted',
            customer_name = COALESCE(?, customer_name),
            customer_email = COALESCE(?, customer_email),
            customer_phone = COALESCE(?, customer_phone),
            whatsapp_contact_enabled = ?,
            instagram_username = ?,
            selling_price = ?,
            current_rank = ?,
            premium_skins = ?,
            other_valuable_items = ?,
            inventory_screenshot = ?,
            inventory_screenshots_json = ?,
            submitted_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        customerName?.trim() || null,
        customerEmail?.trim() || null,
        customerPhone?.trim() || null,
        isWhatsappEnabled,
        cleanInstagram,
        cleanPrice,
        cleanRank,
        cleanSkins,
        otherValuableItems?.trim() || '',
        primaryScreenshot,
        screenshotsJson,
        now,
        now,
        id
      );

      const updatedOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;

      // Trigger automatic email to teamvibofficial@gmail.com with customer-submitted details
      const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : undefined);
      sendAdminAdDetailsSubmitted(
        updatedOrder,
        {
          customer_name: updatedOrder.customer_name,
          customer_email: updatedOrder.customer_email,
          customer_phone: updatedOrder.customer_phone,
          whatsapp_contact_enabled: isWhatsappEnabled,
          instagram_username: cleanInstagram,
          selling_price: cleanPrice,
          current_rank: cleanRank,
          premium_skins: cleanSkins,
          other_valuable_items: otherValuableItems?.trim() || '',
          inventory_screenshots: savedScreenshotUrls,
          inventory_screenshot: primaryScreenshot,
        },
        origin
      ).catch((e) => console.warn('[Ad Details Admin Email Error]:', e.message));

      res.json({
        success: true,
        orderId: id,
        message: 'Advertisement details successfully submitted! Our team is preparing your campaign.',
      });
    } catch (err: any) {
      console.error('[Submit Ad Details Error]:', err);
      res.status(500).json({ error: 'Failed to submit advertisement details.' });
    }
  });

  // Authenticated Customer: Get own advertisement orders
  app.get('/api/user/advertisement-orders', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = (req as any).user;
      const rows = await db.prepare(`
        SELECT * FROM advertisement_orders
        WHERE user_id = ? OR LOWER(customer_email) = LOWER(?)
        ORDER BY created_at DESC
      `).all(authUser.id, authUser.email || '');
      res.json({ success: true, orders: rows });
    } catch (err: any) {
      console.error('[User Ad Orders Error]:', err);
      res.status(500).json({ error: 'Failed to load your advertisement orders.' });
    }
  });

  // Admin: Get all advertisement orders
  app.get('/api/admin/advertisement/orders', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
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

      const orders = await db.prepare(sql).all(...params);
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
      const { notes } = req.body || {};
      const adminUser = (req as any).user;
      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;

      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const now = new Date().toISOString();
      const reviewerId = adminUser?.id || null;
      const reviewerName = adminUser?.name || adminUser?.email || 'Admin';
      const trimmedNotes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;

      await db.prepare(`
        UPDATE advertisement_orders
        SET status = 'approved',
            approved_at = ?,
            reviewed_by = ?,
            reviewed_by_name = ?,
            reviewed_at = ?,
            admin_notes = COALESCE(?, admin_notes),
            updated_at = ?
        WHERE id = ?
      `).run(now, reviewerId, reviewerName, now, trimmedNotes, now, id);

      const updated = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      // Dispatch email to customer without failing approval if transport errors out
      const origin = req.headers.origin || (req.headers.host ? `${req.protocol}://${req.headers.host}` : undefined);
      let emailStatus: 'sent' | 'failed' = 'failed';
      let emailError: string | null = null;
      try {
        const result = await sendCustomerAdPaymentApproved(updated, origin, reviewerName);
        emailStatus = result.status;
        emailError = result.error || null;
      } catch (mailErr: any) {
        emailStatus = 'failed';
        emailError = mailErr?.message || 'Approval email failed to send.';
      }

      const emailTime = new Date().toISOString();
      await db.prepare(`
        UPDATE advertisement_orders
        SET approval_email_status = ?,
            approval_email_error = ?,
            last_email_at = ?
        WHERE id = ?
      `).run(emailStatus, emailError, emailTime, id);

      const finalOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);

      res.json({
        success: true,
        order: finalOrder,
        emailStatus,
        emailError,
        message: emailStatus === 'sent'
          ? `Payment approved! Confirmation email with Continue link sent to ${order.customer_email}.`
          : `Payment approved, but approval email could not be sent (${emailError || 'mail transport not configured'}). You can retry sending it anytime.`,
      });
    } catch (err: any) {
      console.error('[Approve Ad Payment Error]:', err);
      res.status(500).json({ error: 'Failed to approve advertisement payment.' });
    }
  });

  // Admin: Resend customer approval / Continue email safely
  app.post('/api/admin/advertisement/orders/:id/resend-approval-email', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;
      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;

      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      if (!['approved', 'details_submitted', 'live', 'completed'].includes(order.status)) {
        res.status(409).json({ error: 'Approval email can only be sent after payment is approved.' });
        return;
      }

      const origin = req.headers.origin || (req.headers.host ? `${req.protocol}://${req.headers.host}` : undefined);
      const reviewerName = order.reviewed_by_name || adminUser?.name || adminUser?.email || 'Admin';
      const result = await sendCustomerAdPaymentApproved(order, origin, reviewerName);
      const emailTime = new Date().toISOString();

      await db.prepare(`
        UPDATE advertisement_orders
        SET approval_email_status = ?,
            approval_email_error = ?,
            last_email_at = ?
        WHERE id = ?
      `).run(result.status, result.error || null, emailTime, id);

      const updatedOrder = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);
      res.json({
        success: result.success,
        order: updatedOrder,
        emailStatus: result.status,
        emailError: result.error || null,
        message: result.success
          ? `Approval email resent to ${order.customer_email}.`
          : `Resend failed: ${result.error || 'Email service unavailable.'}`,
      });
    } catch (err: any) {
      console.error('[Resend Ad Approval Email Error]:', err);
      res.status(500).json({ error: 'Failed to resend approval email.' });
    }
  });

  // Admin: Reject advertisement payment
  app.post('/api/admin/advertisement/orders/:id/reject', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body || {};
      const adminUser = (req as any).user;

      const order = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id) as any;
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const now = new Date().toISOString();
      const reviewerId = adminUser?.id || null;
      const reviewerName = adminUser?.name || adminUser?.email || 'Admin';
      const trimmedNotes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;

      await db.prepare(`
        UPDATE advertisement_orders
        SET status = 'rejected',
            rejection_reason = ?,
            reviewed_by = ?,
            reviewed_by_name = ?,
            reviewed_at = ?,
            admin_notes = COALESCE(?, admin_notes),
            updated_at = ?
        WHERE id = ?
      `).run(reason || 'Unable to verify payment evidence.', reviewerId, reviewerName, now, trimmedNotes, now, id);

      const updated = await db.prepare('SELECT * FROM advertisement_orders WHERE id = ?').get(id);
      let emailStatus: 'sent' | 'failed' = 'failed';
      try {
        const result = await sendCustomerAdPaymentRejected(updated, reason);
        emailStatus = result.status;
      } catch (mailErr: any) {
        console.warn('[Reject Ad Email Warning]:', mailErr?.message);
      }

      res.json({
        success: true,
        order: updated,
        emailStatus,
        message: emailStatus === 'sent'
          ? `Payment marked rejected. Notice emailed to ${order.customer_email}.`
          : `Payment marked rejected by ${reviewerName}. Email delivery failed (${order.customer_email}).`,
      });
    } catch (err: any) {
      console.error('[Reject Ad Payment Error]:', err);
      res.status(500).json({ error: 'Failed to reject advertisement payment.' });
    }
  });

  // Admin: Mark submitted advertisement campaign as Live
  app.post('/api/admin/advertisement/orders/:id/mark-live', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = await db.prepare('SELECT id, status, user_id, plan_name FROM advertisement_orders WHERE id = ?').get(id) as any;
      if (!order) {
        res.status(404).json({ error: 'Advertisement order not found.' });
        return;
      }

      const now = new Date().toISOString();
      await db.prepare(`
        UPDATE advertisement_orders
        SET status = 'live',
            updated_at = ?
        WHERE id = ?
      `).run(now, id);

      if (order.user_id) {
        await db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
          VALUES (?, ?, ?, ?, 'ad', 0, ?)
        `).run(
          'notif_' + crypto.randomBytes(6).toString('hex'),
          order.user_id,
          'Advertisement Campaign Is Live!',
          `Your ${order.plan_name || 'advertisement'} order (${id}) is now LIVE on VIB official channels.`,
          now,
        );
      }

      res.json({
        success: true,
        message: `Campaign ${id} marked LIVE.`,
      });
    } catch (err: any) {
      console.error('[Mark Ad Live Error]:', err);
      res.status(500).json({ error: 'Failed to mark advertisement campaign live.' });
    }
  });

  // Admin: Upload package documentation (PDF/DOCX/TXT content)
  app.post('/api/admin/advertisement/plans/:id/upload-doc', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { textContent, filename } = req.body || {};

      if (!textContent || !String(textContent).trim()) {
        res.status(400).json({ error: 'Document text content is required.' });
        return;
      }

      const plan = await db.prepare('SELECT id, name FROM advertisement_plans WHERE id = ?').get(id) as any;
      if (!plan) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const now = new Date().toISOString();
      await db.prepare(`
        UPDATE advertisement_plans
        SET documentation_text = ?,
            updated_at = ?
        WHERE id = ?
      `).run(textContent.trim(), now, id);

      res.json({
        success: true,
        message: `Documentation "${filename || 'document'}" saved for ${plan.name}.`,
      });
    } catch (err: any) {
      console.error('[Upload Doc Error]:', err);
      res.status(500).json({ error: 'Failed to save documentation.' });
    }
  });

  // Admin: Generate AI draft from package configuration and uploaded documentation
  app.post('/api/admin/advertisement/plans/:id/generate-ai-draft', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({
          success: false,
          error: 'AI draft generation requires GEMINI_API_KEY configuration on the server. Edit draft fields manually instead.',
        });
        return;
      }

      const { id } = req.params;
      const plan = await db.prepare('SELECT * FROM advertisement_plans WHERE id = ?').get(id) as any;
      if (!plan) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const benefits = typeof plan.benefits_json === 'string' ? JSON.parse(plan.benefits_json || '[]') : [];
      const docContext = plan.documentation_text || '';
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = [
        'Return strict JSON with keys: description (string), highlights (string[]), instructions (string[]), reach (string), placement (string), faq (array of {question, answer}).',
        'Do not invent audience counts or unverified delivery times.',
        `Plan Name: ${plan.name}`,
        `Category: ${plan.category}`,
        `Price INR: ${plan.price}`,
        `Existing Description: ${plan.description || ''}`,
        `Benefits: ${benefits.join('; ')}`,
        docContext ? `Documentation: ${docContext}` : '',
      ].filter(Boolean).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      const aiDraft = {
        title: plan.name,
        price: plan.price,
        description: parsed.description || plan.description || '',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : benefits,
        instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
        reach: parsed.reach || '',
        placement: parsed.placement || '',
        faq: Array.isArray(parsed.faq) ? parsed.faq : [],
        generated_at: new Date().toISOString(),
      };

      const now = new Date().toISOString();
      await db.prepare(`
        UPDATE advertisement_plans
        SET ai_draft_json = ?,
            updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(aiDraft), now, id);

      res.json({
        success: true,
        aiDraft,
        message: 'AI draft generated successfully. Review and approve before publishing.',
      });
    } catch (err: any) {
      console.error('[Generate AI Draft Error]:', err);
      res.status(500).json({ error: 'Failed to generate AI draft.' });
    }
  });

  // Admin: Publish approved draft to live product page
  app.post('/api/admin/advertisement/plans/:id/publish-draft', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { description, highlights, instructions, faq, reach, placement } = req.body || {};

      const plan = await db.prepare('SELECT id, name FROM advertisement_plans WHERE id = ?').get(id) as any;
      if (!plan) {
        res.status(404).json({ error: 'Advertisement plan not found.' });
        return;
      }

      const now = new Date().toISOString();
      await db.prepare(`
        UPDATE advertisement_plans
        SET description = COALESCE(?, description),
            benefits_json = CASE WHEN ? IS NOT NULL THEN ? ELSE benefits_json END,
            conditions_json = CASE WHEN ? IS NOT NULL THEN ? ELSE conditions_json END,
            custom_faq_json = CASE WHEN ? IS NOT NULL THEN ? ELSE custom_faq_json END,
            reach_estimate = COALESCE(?, reach_estimate),
            placement_tag = COALESCE(?, placement_tag),
            updated_at = ?
        WHERE id = ?
      `).run(
        description || null,
        highlights ? 1 : null,
        highlights ? JSON.stringify(highlights) : null,
        instructions ? 1 : null,
        instructions ? JSON.stringify(instructions) : null,
        faq ? 1 : null,
        faq ? JSON.stringify(faq) : null,
        reach || null,
        placement || null,
        now,
        id
      );

      res.json({
        success: true,
        message: `Package "${plan.name}" published successfully! Live product page is updated.`,
      });
    } catch (err: any) {
      console.error('[Publish Draft Error]:', err);
      res.status(500).json({ error: 'Failed to publish draft.' });
    }
  });
}
