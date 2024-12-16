const mongoose = require("mongoose");

const statsSchema = new mongoose.Schema({
  totalUsers: {
    type: Number,
    default: 0,
    required: true,
  },
  totalRevenue: {
    type: Number,
    default: 0,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  }
});

// Ensure only one stats document exists
statsSchema.statics.getStats = async function() {
  const stats = await this.findOne();
  if (stats) {
    return stats;
  }
  // Create initial stats if none exist
  return await this.create({
    totalUsers: 0,
    totalRevenue: 0
  });
};

const Stats = mongoose.model("Stats", statsSchema);
module.exports = Stats; 