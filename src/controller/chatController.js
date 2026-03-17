import { processChatMessage, generateListResourcesMessage, generateTerraformLogMessage, generateMongooseQuery, generateQueryAnswer } from '../services/llmService.js';
import Chat from '../models/Chat.js';
import Resource from '../models/Resource.js';
import { generateAndRunTerraform } from '../services/terraformService.js';

export const handleChat = async (req, res) => {
    const { sessionId, message } = req.body;
    console.log(process.env.AWS_ACCESS_KEY_ID);

    if (!sessionId || !message) {
        return res.status(400).json({ error: 'sessionId and message are required' });
    }

    try {
        // 1. Fetch or create chat session
        let chat = await Chat.findOne({ sessionId });
        if (!chat) {
            chat = new Chat({ sessionId, history: [], currentState: { intent: 'NONE', collectedData: {}, status: 'IDLE' } });
        }

        // Add user message to history
        chat.history.push({ role: 'user', content: message });

        // 2. Process with LLM
        const currentState = chat.currentState;
        const llmResponse = await processChatMessage(message, currentState);


        // Update state
        chat.currentState.intent = llmResponse.intent;
        chat.currentState.collectedData = { ...chat.currentState.collectedData, ...llmResponse.collectedData };

        let finalReply = llmResponse.replyMessage;

        // 3. Handle Special Actions Based on Intent and Completeness
        if (llmResponse.intent === 'LIST_RESOURCES') {

            const result = await generateMongooseQuery(message);
            console.log(result);

            const resolved = resolveDateTokens(result);

            let resources;

            if (resolved.method === 'find') {
                resources = await Resource.find(resolved.filter);
            } else if (resolved.method === 'findOne') {
                resources = await Resource.findOne(resolved.filter);
            } else if (resolved.method === 'countDocuments') {
                resources = await Resource.countDocuments(resolved.filter);
            } else if (resolved.method === 'aggregate') {
                resources = await Resource.aggregate(resolved.pipeline);
            }

    
                finalReply = await generateQueryAnswer(message, resources, result.explanation);
                console.log(finalReply);
                
            
            chat.currentState = { intent: 'NONE', collectedData: {}, status: 'IDLE' };
        }
        else if ((llmResponse.intent === 'CREATE_EC2' || llmResponse.intent === 'CREATE_S3') && llmResponse.isComplete) {
            chat.currentState.status = 'READY_FOR_TERRAFORM';

            // Call Terraform Service here
            const tfResult = await generateAndRunTerraform(llmResponse.intent, chat.currentState.collectedData, sessionId);
            const humanReadableLog = await generateTerraformLogMessage(tfResult.output);
            finalReply += `\n\n${humanReadableLog}`;

            chat.currentState = { intent: 'NONE', collectedData: {}, status: 'IDLE' };
        }
        else if (llmResponse.intent === 'UNSUPPORTED' || llmResponse.intent === 'NONE') {
            // Reset state if unsupported/none to prevent getting stuck
            chat.currentState = { intent: 'NONE', collectedData: {}, status: 'IDLE' };
        } else {
            chat.currentState.status = 'PENDING_VARIABLES';
        }

        // Add assistant reply to history
        chat.history.push({ role: 'assistant', content: finalReply });

        await chat.save();

        res.json({ reply: finalReply, state: chat.currentState });

    } catch (error) {
        console.error("Chat Controller Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const resolveDateTokens = (obj) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const yesterdayEnd = new Date(todayStart); // yesterday ends where today starts

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(todayStart);
    monthStart.setDate(1);

    const str = JSON.stringify(obj)
        .replace(/"\$\$TODAY_START\$\$"/g,     `"${todayStart.toISOString()}"`)
        .replace(/"\$\$TODAY_END\$\$"/g,       `"${todayEnd.toISOString()}"`)
        .replace(/"\$\$YESTERDAY_START\$\$"/g, `"${yesterdayStart.toISOString()}"`)
        .replace(/"\$\$YESTERDAY_END\$\$"/g,   `"${yesterdayEnd.toISOString()}"`)
        .replace(/"\$\$WEEK_START\$\$"/g,      `"${weekStart.toISOString()}"`)
        .replace(/"\$\$MONTH_START\$\$"/g,     `"${monthStart.toISOString()}"`);

    return JSON.parse(str);
};