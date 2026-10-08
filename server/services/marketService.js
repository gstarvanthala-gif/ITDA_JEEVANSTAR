import mongoose from 'mongoose';

import MarketData from '../models/MarketData.js';

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toDecimal128 = (amount) => mongoose.Types.Decimal128.fromString(String(amount));
const normalizeSymbol = (symbol) => {
  if (typeof symbol !== 'string') throw createHttpError('symbol must be a string', 400);
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(normalized)) {
    throw createHttpError('symbol must be 1-20 letters, numbers, dots, underscores, or hyphens', 400);
  }
  return normalized;
};

const validateName = (name) => {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    throw createHttpError('name must be a non-empty string of at most 80 characters', 400);
  }
  return name.trim();
};

const validatePrice = (price) => {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw createHttpError('price must be a positive number', 400);
  }
  return toDecimal128(price);
};

const validateChangePercent = (changePercent) => {
  if (typeof changePercent !== 'number' || !Number.isFinite(changePercent)) {
    throw createHttpError('changePercent must be a finite number', 400);
  }
  return toDecimal128(changePercent);
};

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
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedName = validateName(name);
  if (!['equity', 'gold', 'debt'].includes(assetType)) {
    throw createHttpError('assetType must be equity, gold, or debt', 400);
  }
  const normalizedPrice = validatePrice(price);
  const normalizedChangePercent = validateChangePercent(changePercent);

  let item;
  try {
    item = await MarketData.create({
      symbol: normalizedSymbol,
      name: normalizedName,
      assetType,
      price: normalizedPrice,
      changePercent: normalizedChangePercent,
      source: 'simulation',
    });
  } catch (error) {
    if (error.code === 11000) throw createHttpError('A market asset with this symbol already exists', 409);
    throw error;
  }

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
  if (!mongoose.isValidObjectId(marketId)) throw createHttpError('Valid market asset ID is required', 400);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError('A market asset update is required', 400);
  }

  const item = await MarketData.findById(marketId);
  if (!item) throw createHttpError('Market item not found', 404);

  if (Object.hasOwn(payload, 'symbol')) item.symbol = normalizeSymbol(payload.symbol);
  if (Object.hasOwn(payload, 'name')) item.name = validateName(payload.name);
  if (Object.hasOwn(payload, 'assetType')) {
    if (!['equity', 'gold', 'debt'].includes(payload.assetType)) {
      throw createHttpError('assetType must be equity, gold, or debt', 400);
    }
    item.assetType = payload.assetType;
  }
  if (Object.hasOwn(payload, 'price')) item.price = validatePrice(payload.price);
  if (Object.hasOwn(payload, 'changePercent')) item.changePercent = validateChangePercent(payload.changePercent);

  try {
    await item.save();
  } catch (error) {
    if (error.code === 11000) throw createHttpError('A market asset with this symbol already exists', 409);
    throw error;
  }

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
  if (!mongoose.isValidObjectId(marketId)) throw createHttpError('Valid market asset ID is required', 400);
  const item = await MarketData.findByIdAndDelete(marketId);
  if (!item) throw createHttpError('Market item not found', 404);
  return { id: item._id, message: 'Market data deleted' };
};
