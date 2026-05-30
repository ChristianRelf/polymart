/**
 * PolyEngine · OrderMatcher
 *
 * Checks all pending limit/stop orders against current simulated prices
 * and fills any that have reached their trigger. Called at the end of each
 * tick cycle, after DB writes have drained.
 *
 * Fill conditions:
 *   limit buy  → currentPrice <= trigger_price
 *   limit sell → currentPrice >= trigger_price
 *   stop  buy  → currentPrice >= trigger_price  (breakout long)
 *   stop  sell → currentPrice <= trigger_price  (stop-loss)
 */

import { resolvePrices } from './AssetResolver.js';

/**
 * Match and fill pending orders.
 *
 * @param {import('mysql2/promise').Pool} dbUser    polymart_user pool
 * @param {import('mysql2/promise').Pool} dbMarket  polymart_market pool
 */
export async function matchPendingOrders(dbUser, dbMarket) {
  // 1. Fetch all pending orders
  const [pending] = await dbUser.query(
    `SELECT o.id, o.portfolio_id, o.asset_type, o.symbol, o.side, o.quantity,
            o.order_type, o.trigger_price, p.cash_balance, p.clerk_id
     FROM orders o
     JOIN portfolios p ON p.id = o.portfolio_id
     WHERE o.status = 'pending'`
  );
  if (pending.length === 0) return;

  // 2. Batch-resolve current prices for all unique assets in the pending list
  const uniqueAssets = [...new Map(
    pending.map(o => [`${o.asset_type}:${o.symbol}`, { asset_type: o.asset_type, symbol: o.symbol }])
  ).values()];
  const prices = await resolvePrices(uniqueAssets, dbMarket);

  // 3. Evaluate each pending order
  for (const order of pending) {
    const key = `${order.asset_type}:${order.symbol.toUpperCase()}`;
    const currentPrice = prices.get(key);
    if (currentPrice == null) continue;

    const trigger = Number(order.trigger_price);
    const triggered =
      (order.order_type === 'limit' && order.side === 'buy'  && currentPrice <= trigger) ||
      (order.order_type === 'limit' && order.side === 'sell' && currentPrice >= trigger) ||
      (order.order_type === 'stop'  && order.side === 'buy'  && currentPrice >= trigger) ||
      (order.order_type === 'stop'  && order.side === 'sell' && currentPrice <= trigger);

    if (!triggered) continue;

    // 4. Execute the order in a transaction
    const conn = await dbUser.getConnection();
    try {
      await conn.beginTransaction();

      const quantity = Number(order.quantity);
      const total    = parseFloat((currentPrice * quantity).toFixed(4));
      const portfolioId = order.portfolio_id;

      if (order.side === 'buy') {
        // Re-check cash balance at fill time
        const [[portfolio]] = await conn.query('SELECT cash_balance FROM portfolios WHERE id = ? FOR UPDATE', [portfolioId]);
        if (!portfolio || Number(portfolio.cash_balance) < total) {
          // Insufficient funds at fill time - cancel the order
          await conn.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', order.id]);
          await conn.commit();
          continue;
        }

        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, order.asset_type, order.symbol.toUpperCase()]
        );
        if (!existing) {
          await conn.query(
            'INSERT INTO positions (portfolio_id, asset_type, symbol, quantity, avg_cost) VALUES (?,?,?,?,?)',
            [portfolioId, order.asset_type, order.symbol.toUpperCase(), quantity, currentPrice]
          );
        } else {
          const newQty = Number(existing.quantity) + quantity;
          const newAvg = (Number(existing.avg_cost) * Number(existing.quantity) + currentPrice * quantity) / newQty;
          await conn.query(
            'UPDATE positions SET quantity = ?, avg_cost = ? WHERE id = ?',
            [newQty, parseFloat(newAvg.toFixed(4)), existing.id]
          );
        }
        await conn.query('UPDATE portfolios SET cash_balance = cash_balance - ? WHERE id = ?', [total, portfolioId]);

      } else {
        // sell
        const [[existing]] = await conn.query(
          'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
          [portfolioId, order.asset_type, order.symbol.toUpperCase()]
        );
        if (!existing || Number(existing.quantity) < quantity) {
          await conn.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', order.id]);
          await conn.commit();
          continue;
        }

        const realizedPnl = parseFloat(((currentPrice - Number(existing.avg_cost)) * quantity).toFixed(4));
        const newQty = parseFloat((Number(existing.quantity) - quantity).toFixed(4));
        if (newQty === 0) {
          await conn.query('DELETE FROM positions WHERE id = ?', [existing.id]);
        } else {
          await conn.query('UPDATE positions SET quantity = ? WHERE id = ?', [newQty, existing.id]);
        }
        await conn.query('UPDATE portfolios SET cash_balance = cash_balance + ? WHERE id = ?', [total, portfolioId]);
        await conn.query('UPDATE orders SET realized_pnl = ? WHERE id = ?', [realizedPnl, order.id]);
      }

      // Mark order as filled
      await conn.query(
        'UPDATE orders SET status = ?, price = ?, total = ?, executed_at = NOW() WHERE id = ?',
        ['filled', currentPrice, total, order.id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error(`[OrderMatcher] Error filling order #${order.id}:`, err.message);
    } finally {
      conn.release();
    }
  }
}
