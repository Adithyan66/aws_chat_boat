# Problem Analysis
## Overview
The goal is to build a chatbot-based backend that accepts natural language queries from users to provision and query AWS resources (specifically EC2 and S3), utilizing Terraform as the Infrastructure as Code (IaC) engine. The chatbot must act intelligently by identifying missing required inputs and prompting the user for them, avoiding premature execution of incomplete configurations.

## Core Workflows
1. **Intent Recognition**: Determine if the user wants to `CREATE_EC2`, `CREATE_S3`, `LIST_RESOURCES`, or performing an `UNSUPPORTED_ACTION`.
2. **Entity Extraction**: 
   - For EC2: `instance_name`, `region`, `instance_type`.
   - For S3: `bucket_name`, `region`.
3. **Conversation State Management**: 
   - Store session history.
   - Maintain a state for incomplete requests (e.g., if intent is `CREATE_EC2` but `region` is missing, the state remains `PENDING_VARIABLES`).
4. **Terraform Generation & Validation**:
   - Translate the collected variables into a `.tf` file dynamically.
   - Run `terraform init` and `terraform validate` (or `plan`) using Node's `child_process`.
5. **Database Interaction**:
   - Store generated resources and their statuses.
   - Fetch and summarize resources upon natural language queries.

