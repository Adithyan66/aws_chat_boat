import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    resourceType: { type: String, enum: ['EC2', 'S3'], required: true },
    name: { type: String }, 
    region: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    terraformCode: { type: String },
    status: { type: String, enum: ['VALIDATED', 'PLANNED', 'FAILED', 'APPLIED', 'CREATED'], default: 'VALIDATED' }
}, { timestamps: true });

export default mongoose.model('Resource', resourceSchema);
