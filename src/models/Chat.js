import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    history: [messageSchema],
    currentState: {
        intent: { type: String, enum: ['CREATE_EC2', 'CREATE_S3', 'LIST_RESOURCES', 'UNSUPPORTED', 'NONE'], default: 'NONE' },
        collectedData: { type: mongoose.Schema.Types.Mixed, default: {} },
        status: { type: String, enum: ['PENDING_VARIABLES', 'READY_FOR_TERRAFORM', 'COMPLETED', 'IDLE'], default: 'IDLE' }
    }
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
