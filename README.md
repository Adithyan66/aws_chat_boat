# AWS Resource Creation Chatbot (Backend)

This is a Node.js/Express backend that powers a chatbot capable of creating AWS EC2 and S3 resources via natural language, using OpenAI for intent recognition and Terraform for infrastructure provisioning.

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas cluster (or local MongoDB)
- Terraform CLI installed securely on the host machine.
- OpenAI API Key

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory (where `package.json` is located) with the following values:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatDB
   OPENAI_API_KEY=sk-...
   ```

3. **Start the Server:**
   ```bash
   npm start
   # or for development:
   # npm run dev
   ```

## Usage (API)

The backend exposes a main endpoint for chatbot interactions. The client should generate a unique UUID for `sessionId` and send it with every message to maintain context.

### `POST /api/chat`
**Request Body:**
```json
{
  "sessionId": "user-session-1234",
  "message": "I want to create an EC2 instance in us-east-1"
}
```

**Response Format:**
```json
{
  "reply": "What should I name your new EC2 instance and what instance type do you need?",
  "state": {
    "intent": "CREATE_EC2",
    "status": "PENDING_VARIABLES",
    "collectedData": { "region": "us-east-1" }
  }
}
```

## How It Works

1. **Intent & Entity Extraction**: Uses OpenAI (`gpt-4o-mini`) configured with a strict JSON schema prompt to determine if the user wants to `CREATE_EC2`, `CREATE_S3`, `LIST_RESOURCES`, or something `UNSUPPORTED`.
2. **Missing Variables**: If entities (like region or instance type) are missing for the chosen resource, the LLM will generate a conversational reply asking for them, and the state stays `PENDING_VARIABLES`.
3. **Terraform Generation**: Once all variables are collected, the backend writes a dynamic `main.tf` file to a temporary system folder.
4. **Child Process Execution**: It securely executes `terraform init` and `terraform validate` in that temporary folder.
5. **Database Storage**: Successful (or validated) configurations are saved to MongoDB in the `resources` collection.
6. **Querying**: Natural language queries like "Show my resources" trigger the `LIST_RESOURCES` intent, which reads from MongoDB and uses OpenAI to summarize the existing infrastructure.

