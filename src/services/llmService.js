import OpenAI from 'openai';
import dotenv from 'dotenv';
// import { queryPrompt } from '../utils/queryPrompt';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `You are an AWS Resource Creation Chatbot Assistant.
Your goal is to help users manage and create AWS resources (EC2 and S3) via Terraform.
You will extract the user's intent and any relevant entities from their messages.

Supported Intents:
1. CREATE_EC2: The user wants to create an EC2 instance.
   - Required entities: region, instanceType, instanceName.
2. CREATE_S3: The user wants to create an S3 bucket.
   - Required entities: region, bucketName.
3. LIST_RESOURCES: The user wants to query, search, look up, filter, or get any information 
   about their existing AWS resources. This includes:
   - Listing all resources or filtered by type ("show all EC2 instances")
   - Looking up a specific resource by name ("find the bucket named aadhioo")
   - Asking about a specific field ("what is the region of bucket aadhioo?")
   - Asking counts or stats ("how many EC2 instances failed today?")
   - Filtering by status, region, date, or any other field
   - ANY question about existing resources in the database
   Include an optional resourceTypeFilter if they specifically mention EC2 or S3. Otherwise "ALL".
4. UNSUPPORTED: The user wants to do something AWS-related but not EC2/S3 (e.g., SQS, RDS).
5. NONE: Conversational chatter not directly related to AWS resources.

Current State Context:
You will be provided with the current known 'intent' and 'collectedData'. Your job is to update 'collectedData' based on the user's latest message.

Response Format (JSON exactly like this):
{
  "intent": "CREATE_EC2" | "CREATE_S3" | "LIST_RESOURCES" | "UNSUPPORTED" | "NONE",
  "collectedData": {
    "region": "us-east-1", 
    "instanceType": "t2.micro",
    "instanceName": "my-server",
    "bucketName": "my-logs-bucket",
    "resourceTypeFilter": "EC2" // or "S3" or "ALL" for LIST_RESOURCES
  },
  "isComplete": boolean,
  "replyMessage": "String"
}

Examples of LIST_RESOURCES messages:
- "show all my resources"
- "list EC2 instances"
- "how many servers failed today?"
- "give the region of the bucket named aadhioo"
- "what is the status of my server called web-prod?"
- "show resources created this week"
- "find the bucket named my-logs"

Always return valid JSON adhering to this structure. Do not include markdown blocks.`;
export const processChatMessage = async (userMessage, currentState) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'system', content: `Current State Context: ${JSON.stringify(currentState)}` },
                { role: 'user', content: userMessage }
            ],
            response_format: { type: 'json_object' }
        });


        const rawResponse = response.choices[0].message.content;
        return JSON.parse(rawResponse);
    } catch (error) {
        console.error("Error calling OpenAI API:", error.message);
        throw error;
    }
};

export const generateListResourcesMessage = async (resources) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an AWS bot. Summarize the following list of resources in a natural, friendly way.' },
                { role: 'user', content: JSON.stringify(resources) }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error generating list response:", error.message);
        return "Here are your resources.";
    }
};

export const generateTerraformLogMessage = async (logs) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an AWS Resource Creation Chatbot Assistant. Summarize the following Terraform logs into a clear, concise, and human-readable notification for the user. Clearly mention if the process succeeded or failed, and outline the key details without overwhelming technical jargon.' },
                { role: 'user', content: logs }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error generating terraform log message:", error.message);
        return "Your infrastructure request has been processed, but I could not generate a summary of the logs. Please check the backend console for more details.";
    }
};



// const queryPrompt = `You are a MongoDB query generation assistant for an AWS Resource Management application.

// // Resource Collection (mongoose model: 'Resource')
// {
//   sessionId: String,
//   resourceType: String,    // enum: 'EC2', 'S3'
//   name: String,
//   region: String,
//   details: {
//     // EC2 resources store these fields inside details:
//     instanceType: String,  // e.g. 't2.micro', 't3.micro', 't3.large', 'c5.xlarge' etc.
//     instanceName: String,  // any user-defined name

//     // S3 resources store these fields inside details:
//     bucketName: String     // any user-defined bucket name
    
//     // details is flexible — values are user-defined strings, not enums.
//     // Always use dot notation: details.instanceType, details.instanceName, details.bucketName
//   },
//   terraformCode: String,
//   status: String,          // enum: 'VALIDATED', 'PLANNED', 'FAILED', 'APPLIED', 'CREATED'
//   createdAt: Date,
//   updatedAt: Date
// }

// Field Access Rules:
// - ALWAYS use dot notation for details fields: "details.instanceType", "details.instanceName", "details.bucketName"
// - details values are user-defined — use EXACTLY the value the user provides, do not normalize or guess.
// - If user says "t3micro" use "t3micro", if user says "t3.micro" use "t3.micro" — copy as-is.

// Enum Rules:
// - resourceType: 'EC2' (servers/instances) | 'S3' (buckets/storage) — always uppercase.
// - status: 'VALIDATED' | 'PLANNED' | 'FAILED' | 'APPLIED' | 'CREATED' — always uppercase.

// Date Tokens (DO NOT use JavaScript date functions — use ONLY these tokens):
// - "$$TODAY_START$$"     → start of today (00:00:00)
// - "$$TODAY_END$$"       → start of tomorrow (00:00:00)
// - "$$YESTERDAY_START$$" → start of yesterday (00:00:00)
// - "$$YESTERDAY_END$$"   → start of today (00:00:00)
// - "$$WEEK_START$$"      → start of this Monday
// - "$$MONTH_START$$"     → first day of this month

// STRICT RESPONSE RULES:
// - NEVER return a "query" string field.
// - NEVER write JavaScript code like new Date() or Resource.countDocuments(...).
// - ALWAYS return a "filter" object for find/findOne/countDocuments.
// - ALWAYS return a "pipeline" array for aggregate.

// Response Format for find / findOne / countDocuments:
// {
//   "method": "find" | "findOne" | "countDocuments",
//   "filter": { <plain JSON filter object, no JS code> },
//   "explanation": "<one concise sentence>"
// }

// Response Format for aggregate:
// {
//   "method": "aggregate",
//   "pipeline": [ <plain JSON pipeline array, no JS code> ],
//   "explanation": "<one concise sentence>"
// }

// EXAMPLES:

// User: "How many EC2 servers failed today?"
// {
//   "method": "countDocuments",
//   "filter": { "resourceType": "EC2", "status": "FAILED", "createdAt": { "$gte": "$$TODAY_START$$", "$lt": "$$TODAY_END$$" } },
//   "explanation": "Counts EC2 instances with status FAILED created today."
// }

// User: "List all S3 buckets"
// {
//   "method": "find",
//   "filter": { "resourceType": "S3" },
//   "explanation": "Fetches all S3 bucket resources."
// }

// User: "Count resources grouped by status"
// {
//   "method": "aggregate",
//   "pipeline": [{ "$group": { "_id": "$status", "count": { "$sum": 1 } } }, { "$sort": { "count": -1 } }],
//   "explanation": "Groups all resources by status and returns count for each."
// }

// Always return valid JSON. No markdown. No backticks. No JavaScript expressions.`;


const queryPrompt = `You are a MongoDB query generation assistant for an AWS Resource Management application.

// Resource Collection (mongoose model: 'Resource')
{
  sessionId: String,
  resourceType: String,    // enum: 'EC2', 'S3'
  name: String,
  region: String,
  details: {
    instanceType: String,
    instanceName: String,
    bucketName: String
  },
  terraformCode: String,
  status: String,          // enum: 'VALIDATED', 'PLANNED', 'FAILED', 'APPLIED', 'CREATED'
  createdAt: Date,
  updatedAt: Date
}

Field Access Rules:
- ALWAYS use dot notation for details fields: "details.instanceType", "details.instanceName", "details.bucketName"
- details values are user-defined — use EXACTLY the value the user provides, do not normalize or guess.
- If user says "t3micro" use "t3micro", if user says "t3.micro" use "t3.micro" — copy as-is.

Enum Rules:
- resourceType: 'EC2' (servers/instances) | 'S3' (buckets/storage) — always uppercase.
- status: 'VALIDATED' | 'PLANNED' | 'FAILED' | 'APPLIED' | 'CREATED' — always uppercase.

Date Tokens (DO NOT use JavaScript date functions — use ONLY these tokens):
- "$$TODAY_START$$"     → start of today (00:00:00)
- "$$TODAY_END$$"       → start of tomorrow (00:00:00)
- "$$YESTERDAY_START$$" → start of yesterday (00:00:00)
- "$$YESTERDAY_END$$"   → start of today (00:00:00)
- "$$WEEK_START$$"      → start of this Monday
- "$$MONTH_START$$"     → first day of this month

STRICT RESPONSE RULES:
- NEVER return a "query" string field.
- NEVER write JavaScript code like new Date() or Resource.countDocuments(...).
- ALWAYS return a "filter" object for find/findOne/countDocuments.
- ALWAYS return a "pipeline" array for aggregate.
- For "last created", "most recent", "latest" → use "sort": { "createdAt": -1 }
- For "first created", "oldest", "earliest"  → use "sort": { "createdAt": 1 }
- For "last updated", "recently updated"     → use "sort": { "updatedAt": -1 }
- When user implies a single record (e.g. "the last", "the first", "the latest one") → use "limit": 1
- When user implies N records (e.g. "last 5", "first 3") → use "limit": <N>
- When no count is implied for first/last queries → default to "limit": 1

Response Format for find / findOne / countDocuments:
{
  "method": "find" | "findOne" | "countDocuments",
  "filter": { <plain JSON filter object, no JS code> },
  "sort": { <plain JSON sort object, optional> },
  "limit": <number, optional>,
  "explanation": "<one concise sentence>"
}

Response Format for aggregate:
{
  "method": "aggregate",
  "pipeline": [ <plain JSON pipeline array, no JS code> ],
  "explanation": "<one concise sentence>"
}

EXAMPLES:

User: "Show me the last created resource"
{
  "method": "find",
  "filter": {},
  "sort": { "createdAt": -1 },
  "limit": 1,
  "explanation": "Fetches the most recently created resource."
}

User: "Show me the first created EC2 instance"
{
  "method": "find",
  "filter": { "resourceType": "EC2" },
  "sort": { "createdAt": 1 },
  "limit": 1,
  "explanation": "Fetches the oldest EC2 instance by creation date."
}

User: "Show last 5 created S3 buckets"
{
  "method": "find",
  "filter": { "resourceType": "S3" },
  "sort": { "createdAt": -1 },
  "limit": 5,
  "explanation": "Fetches the 5 most recently created S3 buckets."
}

User: "Which resource was created first this month?"
{
  "method": "find",
  "filter": { "createdAt": { "$gte": "$$MONTH_START$$" } },
  "sort": { "createdAt": 1 },
  "limit": 1,
  "explanation": "Fetches the earliest created resource since the start of this month."
}

User: "How many EC2 servers failed today?"
{
  "method": "countDocuments",
  "filter": { "resourceType": "EC2", "status": "FAILED", "createdAt": { "$gte": "$$TODAY_START$$", "$lt": "$$TODAY_END$$" } },
  "explanation": "Counts EC2 instances with status FAILED created today."
}

User: "List all S3 buckets"
{
  "method": "find",
  "filter": { "resourceType": "S3" },
  "explanation": "Fetches all S3 bucket resources."
}

User: "Count resources grouped by status"
{
  "method": "aggregate",
  "pipeline": [{ "$group": { "_id": "$status", "count": { "$sum": 1 } } }, { "$sort": { "count": -1 } }],
  "explanation": "Groups all resources by status and returns count for each."
}

Always return valid JSON. No markdown. No backticks. No JavaScript expressions.`;

export const generateMongooseQuery = async (message) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: queryPrompt },
                { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' }  
        });
        return JSON.parse(response.choices[0].message.content);  
    } catch (error) {
        console.error("Error generating mongoose query:", error.message);
        throw error;
    }
};




export const generateQueryAnswer = async (userMessage, data, explanation) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { 
                    role: 'system', 
                    content: `You are a friendly AWS Resource Management assistant. 
The user asked a question about their AWS resources. 
You are given the raw data fetched from the database and the query explanation.
Convert the data into a clear, concise, human-friendly answer.
- If data is a number (count), say it naturally. e.g. "You have 5 EC2 instances that failed today."
- If data is an array, summarize it. Mention key fields like name, region, status, resourceType.
- If data is empty or zero, say so clearly. e.g. "No EC2 instances were created today."
- Keep it short and conversational. No technical jargon. No JSON. No bullet points unless listing multiple items.`
                },
                { 
                    role: 'user', 
                    content: `User question: "${userMessage}"
Query explanation: "${explanation}"
Data from database: ${JSON.stringify(data)}` 
                }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error generating answer:", error.message);
        return "I fetched your data but couldn't generate a summary. Please try again.";
    }
};