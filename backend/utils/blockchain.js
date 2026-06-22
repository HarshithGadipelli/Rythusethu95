import Block from "../models/Block.js";

export const addBlockToChain = async (orderId, cropId, action, details, actor, location) => {
  try {
    // Find the latest block for this order to get previousHash
    const latestBlock = await Block.findOne({ orderId }).sort({ timestamp: -1 });
    const previousHash = latestBlock ? latestBlock.hash : "0"; // "0" for genesis block

    const newBlock = new Block({
      orderId,
      cropId,
      action,
      details,
      actor,
      location,
      previousHash
    });

    await newBlock.save();
    return newBlock;
  } catch (error) {
    console.error("Blockchain error:", error);
  }
};
