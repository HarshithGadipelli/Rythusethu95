import mongoose from "mongoose";

const agentSchema=new mongoose.Schema({

 user:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 vehicle:String,
 active:Boolean,
  
 trustScore: {
   score: { type: Number, default: 100 },
   rating: { type: Number, default: 5.0 },
   totalRatings: { type: Number, default: 0 },
   totalDeliveries: { type: Number, default: 0 },
   onTimeDeliveries: { type: Number, default: 0 },
   issuesReported: { type: Number, default: 0 }
 }

});

export default mongoose.model("Agent",agentSchema);