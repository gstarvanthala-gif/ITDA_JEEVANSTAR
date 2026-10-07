import mongoose from 'mongoose';

import MarketData from '../models/MarketData.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toDecimal128 = (amount) => mongoose.Types.Decimal128.fromString(String(amount));

const seedMarketData = async () => {
  const seedItems = [
    { symbol: 'DEMO-EQ', name: 'MicroGrow Equity', assetType: 'equity', price: 142.75, changePercent: 1.82 },
    { symbol: 'DEMO-GOLD', name: 'MicroGrow Gold', assetType: 'gold', price: 86.2, changePercent: 0.94 },
    { symbol: 'DEMO-DEBT', name: 'MicroGrow Debt', assetType: 'debt', price: 21.8, changePercent: 0.26 },
  ];

  for (const item of seedItems) {
    await MarketData.updateOne(
      { symbol: item.symbol },
      {
        $setOnInsert: {
          ...item,
          price: toDecimal128(item.price),
          changePercent: toDecimal128(item.changePercent),
          source: 'simulation',
        },
      },
      { upsert: true }
    );
  }
};

export const ensureMarketSeeded = async () => {
  await seedMarketData();
};

export const listMarketData = async () => {
  await ensureMarketSeeded();
  const items = await MarketData.find({}).sort({ symbol: 1 });
  return items.map((item) => ({
    _id: item._id,
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    price: item.price.toString(),
    changePercent: item.changePercent.toString(),
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

export const getMarketItem = async (symbol) => {
  await ensureMarketSeeded();
  const item = await MarketData.findOne({ symbol: String(symbol).trim().toUpperCase() });
  if (!item) throw createHttpError('Market item not found', 404);
  return {
    _id: item._id,
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    price: item.price.toString(),
    changePercent: item.changePercent.toString(),
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const createMarketItem = async (payload) => {
  const { symbol, name, assetType, price, changePercent } = payload || {};

  if (typeof symbol !== 'string' || !symbol.trim()) {
    throw createHttpError('symbol is required', 400);
  }
  if (typeof name !== 'string' || !name.trim()) {
    throw createHttpError('name is required', 400);
  }
  if (!['equity', 'gold', 'debt'].includes(assetType)) {
    throw createHttpError('assetType must be equity, gold, or debt', 400);
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw createHttpError('price must be a positive number', 400);
  }
  if (typeof changePercent !== 'number' || !Number.isFinite(changePercent)) {
    throw createHttpError('changePercent must be a finite number', 400);
  }

  const item = await MarketData.create({
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    assetType,
    price: toDecimal128(price),
    changePercent: toDecimal128(changePercent),
    source: 'simulation',
  });

  return {
    _id: item._id,
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    price: item.price.toString(),
    changePercent: item.changePercent.toString(),
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const updateMarketItem = async (marketId, payload) => {
  const item = await MarketData.findById(marketId);
  if (!item) throw createHttpError('Market item not found', 404);

  if (payload.symbol) item.symbol = payload.symbol.trim().toUpperCase();
  if (payload.name) item.name = payload.name.trim();
  if (payload.assetType) item.assetType = payload.assetType;
  if (typeof payload.price === 'number') item.price = toDecimal128(payload.price);
  if (typeof payload.changePercent === 'number') item.changePercent = toDecimal128(payload.changePercent);

  if (item.symbol.length === 0 || item.name.length === 0) {
    throw createHttpError('symbol and name are required', 400);
  }
  if (!['equity', 'gold', 'debt'].includes(item.assetType)) {
    throw createHttpError('assetType must be equity, gold, or debt', 400);
  }
  if (Number(item.price) <= 0) {
    throw createHttpError('price must be a positive number', 400);
  }

  await item.save();

  return {
    _id: item._id,
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    price: item.price.toString(),
    changePercent: item.changePercent.toString(),
    source: item.source,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const deleteMarketItem = async (marketId) => {
  const item = await MarketData.findByIdAndDelete(marketId);
  if (!item) throw createHttpError('Market item not found', 404);
  return { id: item._id, message: 'Market data deleted' };
};
