# Development Plan (5 Hours)

## Hour 1: Planning & Setup
- [x] Read requirements and structure `ANALYSIS.md`, `DB_DESIGN.md`, `PLAN.md`, `RESEARCH_NOTES.md`.
- [ ] Initialize Node.js + Express backend setup.
- [ ] Install dependencies (`express`, `mongoose`, `dotenv`, `openai`, `cors`).
- [ ] Set up basic Express server and MongoDB Atlas connection.

## Hour 2: Core Chatbot Logic & LLM Integration
- [ ] Implement `POST /api/chat` route.
- [ ] Prompt Engineering: Create a strong system prompt using OpenAI API that forces JSON outputs for Intent Classification and Entity Extraction.
- [ ] Build the conversation state machine (identify intent -> check missing vars -> prompt user or finalize).

## Hour 3: Conversation Flow Implementation
- [ ] Handle specific flows for `CREATE_EC2` and `CREATE_S3`.
- [ ] Implement `UNSUPPORTED_ACTION` logic.
- [ ] Test the text chat flow to ensure it asks for missing region/instance types correctly without running Terraform yet.

## Hour 4: Terraform Engine Integration
- [ ] Write a utility to generate Terraform code templates dynamically based on the fully collected state.
- [ ] Implement Node.js `child_process` logic to write `.tf` file to a temporary directory.
- [ ] Execute `terraform init` -> `terraform validate` logic securely.
- [ ] Capture the standard output/error and format it into a user-friendly chatbot response.

## Hour 5: Resource Querying, Refinement & Finalizing
- [ ] Implement natural language resource queries (`LIST_RESOURCES` intent -> fetch from MongoDB `resources` coll).
- [ ] Format the MongoDB query results back into a readable conversational message via LLM.
- [ ] Code clean-up, structure improvement, and comprehensive testing of edge cases.
- [ ] Ensure README.md provides clear setup instructions.
