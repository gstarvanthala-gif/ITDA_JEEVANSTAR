import {
  createMarketItem,
  deleteMarketItem,
  getMarketItem,
  listMarketData,
  updateMarketItem,
} from '../services/marketService.js';

export const listMarket = async (req, res, next) => {
  try {
    const marketData = await listMarketData();
    return res.json({ success: true, marketData });
  } catch (error) {
    return next(error);
  }
};

export const getSingleMarketItem = async (req, res, next) => {
  try {
    const marketItem = await getMarketItem(req.params.symbol);
    return res.json({ success: true, marketItem });
  } catch (error) {
    return next(error);
  }
};

export const createMarket = async (req, res, next) => {
  try {
    const marketItem = await createMarketItem(req.body);
    return res.status(201).json({ success: true, marketItem });
  } catch (error) {
    return next(error);
  }
};

export const updateMarket = async (req, res, next) => {
  try {
    const marketItem = await updateMarketItem(req.params.id, req.body);
    return res.json({ success: true, marketItem });
  } catch (error) {
    return next(error);
  }
};

export const deleteMarket = async (req, res, next) => {
  try {
    const result = await deleteMarketItem(req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};
