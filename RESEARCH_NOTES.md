# Research & Learning Notes

## Integrating LLM for Intent & Extraction
To ensure the LLM reliably returns the intent and the extracted keys, I'll leverage **OpenAI's JSON mode** (or tool calling/functions). 
Providing a strict JSON schema in the prompt instructs the model to return specifically:
```json
{
  "intent": "CREATE_EC2",
  "entities": {
    "region": "us-east-1",
    "instanceType": "t2.micro"
  },
  "isComplete": false,
  "missingEntities": ["name"],
  "replyMessage": "What should I name your new EC2 instance?"
}
```
This massively simplifies the backend processing because we can directly parse the JSON response and persist the `entities` to our MongoDB state, and return the `replyMessage` directly to the user.

## Running Terraform from Node.js
Using `child_process.exec` is necessary to invoke the `terraform` CLI from the Node application.
1. The backend application needs to create a unique directory (or unique file scope) per request avoiding race conditions if two users chat concurrently. `fs.mkdtemp` or `path.join('/tmp', uuid)` is perfect for this.
2. Inside that temporary directory, write the `main.tf` file.
3. Call `terraform init` to download the AWS provider (this might be slow initially, maybe caching the `.terraform` folder per service is a bonus).
4. Call `terraform validate` to ensure syntax is correct. `terraform plan` is riskier without real AWS credentials, but validate checks the configuration semantics perfectly for an MVP.

## AWS Terraform Basics
- **EC2**: Requires `ami` (can hardcode an Amazon Linux 2 AMI for simplification) and `instance_type`.
- **S3**: Requires `bucket` name.

Example EC2 Terraform block:
```hcl
provider "aws" {
  region = var.region
}
resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0" # example generic ubuntu/amazon-linux ami
  instance_type = var.instance_type
  tags = {
    Name = var.instance_name
  }
}
```
