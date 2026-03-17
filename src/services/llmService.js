import OpenAI from 'openai';
import dotenv from 'dotenv';
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
3. LIST_RESOURCES: The user wants to view their existing resources.
4. UNSUPPORTED: The user wants to do something AWS-related but not EC2/S3 (e.g., SQS, RDS).
5. NONE: Conversational chatter not directly related to the above.

Current State Context:
You will be provided with the current known 'intent' and 'collectedData'. Your job is to update 'collectedData' based on the user's latest message.

Response Format (JSON exactly like this):
{
  "intent": "CREATE_EC2" | "CREATE_S3" | "LIST_RESOURCES" | "UNSUPPORTED" | "NONE",
  "collectedData": {
    "region": "us-east-1", 
    "instanceType": "t2.micro",
    "instanceName": "my-server",
    "bucketName": "my-logs-bucket"
  },
  "isComplete": boolean, // true ONLY IF the intent is CREATE_EC2/CREATE_S3 and ALL required entities are present. For LIST, UNSUPPORTED, NONE, this is true.
  "replyMessage": "String" // What to say back to the user. If isComplete is false, ask for the missing required entities naturally. If UNSUPPORTED, mention what you support. If LIST_RESOURCES, just say "Fetching your resources...". If isComplete is true for CREATE, say "I have all the details. Generating Terraform code..."
}

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
