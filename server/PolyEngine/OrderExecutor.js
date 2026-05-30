/**
 * PolyEngine · OrderExecutor
 *
 * Shared market-order execution logic used by AccountsAPI and DiscordBotAPI.
 * Both call this inside their own transaction-wrapped connection.
 *
 * executeMarketOrder(conn, opts) → { total, realizedPnl, newCashBalance }
 *
 * Throws:
 *   { type: 'INSUFFICIENT_BALANCE' }      - buy: not enough cash
 *   { type: 'QUOTA_EXCEEDED' }            - buy: position limit reached
 *   { type: 'INSUFFICIENT_POSITION', held } - sell: not enough units
 */

export async function executeMarketOrder(conn, {
  portfolioId,
  cashBalance,       // current cash_balance as a number (for in-memory result)
  assetType,
  symbol,            // already toUpperCase()
  side,
  quantity,
  currentPrice,
  notes = null,
  maxPositions = null,   // null = no limit enforced
}) {
  const total = parseFloat((currentPrice * quantity).toFixed(4));
  let realizedPnl = null;

  if (side === 'buy') {
    if (cashBalance < total) {
      throw { type: 'INSUFFICIENT_BALANCE' };
    }

    const [[existing]] = await conn.query(
      'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
      [portfolioId, assetType, symbol]
    );

    if (!existing) {
      if (maxPositions !== null) {
        const [[{ cnt }]] = await conn.query(
          'SELECT COUNT(*) AS cnt FROM positions WHERE portfolio_id = ?',
          [portfolioId]
        );
        if (cnt >= maxPositions) throw { type: 'QUOTA_EXCEEDED' };
      }
      await conn.query(
        'INSERT INTO positions (portfolio_id, asset_type, symbol, quantity, avg_cost) VALUES (?,?,?,?,?)',
        [portfolioId, assetType, symbol, quantity, currentPrice]
      );
    } else {
      const newQty = Number(existing.quantity) + quantity;
      const newAvg = (Number(existing.avg_cost) * Number(existing.quantity) + currentPrice * quantity) / newQty;
      await conn.query(
        'UPDATE positions SET quantity = ?, avg_cost = ? WHERE id = ?',
        [newQty, parseFloat(newAvg.toFixed(4)), existing.id]
      );
    }

    await conn.query(
      'UPDATE portfolios SET cash_balance = cash_balance - ? WHERE id = ?',
      [total, portfolioId]
    );

  } else {
    const [[existing]] = await conn.query(
      'SELECT * FROM positions WHERE portfolio_id = ? AND asset_type = ? AND symbol = ?',
      [portfolioId, assetType, symbol]
    );

    if (!existing || Number(existing.quantity) < quantity) {
      throw { type: 'INSUFFICIENT_POSITION', held: existing ? Number(existing.quantity) : 0 };
    }

    realizedPnl = parseFloat(((currentPrice - Number(existing.avg_cost)) * quantity).toFixed(4));

    const newQty = parseFloat((Number(existing.quantity) - quantity).toFixed(4));
    if (newQty === 0) {
      await conn.query('DELETE FROM positions WHERE id = ?', [existing.id]);
    } else {
      await conn.query('UPDATE positions SET quantity = ? WHERE id = ?', [newQty, existing.id]);
    }

    await conn.query(
      'UPDATE portfolios SET cash_balance = cash_balance + ? WHERE id = ?',
      [total, portfolioId]
    );
  }

  await conn.query(
    `INSERT INTO orders (portfolio_id, asset_type, symbol, side, quantity, price, total, notes,
                         order_type, status, realized_pnl, executed_at)
     VALUES (?,?,?,?,?,?,?,?,'market','filled',?,NOW())`,
    [portfolioId, assetType, symbol, side, quantity, currentPrice, total, notes, realizedPnl]
  );

  const newCashBalance = parseFloat(
    (cashBalance + (side === 'sell' ? total : -total)).toFixed(4)
  );

  return { total, realizedPnl, newCashBalance };
}
