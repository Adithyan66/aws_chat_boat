import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import Resource from '../models/Resource.js';

const execPromise = util.promisify(exec);

const generateEC2Terraform = (data) => {
    return `
provider "aws" {
  region = "${data.region}"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "app_server" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "${data.instanceType}"

  tags = {
    Name = "${data.instanceName || 'chatbot-ec2'}"
  }
}
`;
};


const generateS3Terraform = (data) => {
    return `
provider "aws" {
  region = "${data.region}"
}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "${data.bucketName}-${Math.floor(Math.random() * 10000)}"

  tags = {
    Environment = "Dev"
  }
}

resource "aws_s3_bucket_ownership_controls" "ownership" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.my_bucket.id

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}
`;
};

export const generateAndRunTerraform = async (intent, collectedData, sessionId) => {
    try {
        // 1. Create a temporary directory
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tf-bot-'));
        const tfFilePath = path.join(tempDir, 'main.tf');

        // 2. Generate Terraform Code
        let tfCode = '';
        let resourceType = '';
        let resourceName = '';

        if (intent === 'CREATE_EC2') {
            tfCode = generateEC2Terraform(collectedData);
            resourceType = 'EC2';
            resourceName = collectedData.instanceName || 'chatbot-ec2';
        } else if (intent === 'CREATE_S3') {
            tfCode = generateS3Terraform(collectedData);
            resourceType = 'S3';
            resourceName = collectedData.bucketName || 'chatbot-s3';
        } else {
            throw new Error(`Unsupported intent for terraform generation: ${intent}`);
        }

        // 3. Write file
        await fs.writeFile(tfFilePath, tfCode);

        // 4. Run Terraform Init
        let output = '=== Terraform Generation Task ===\\n';
        output += `Generated main.tf in temporary directory.\\n`;

        try {
            const { stdout: initOut, stderr: initErr } = await execPromise('terraform init', { cwd: tempDir });
            output += `\\n[terraform init]\\n${initOut}\\n`;
        } catch (initException) {
            output += `\\n[terraform init failed]\\n${initException.message}\\n`;
            // Mocking execution capability if terraform CLI is absent
            output += `\\n(Fallback: Simulating validation success since terraform CLI might not be installed yet)\\n`;
        }

        // 5. Run Terraform Validate
        let status = 'VALIDATED';
        try {
            const { stdout: valOut, stderr: valErr } = await execPromise('terraform validate', { cwd: tempDir });
            output += `\\n[terraform validate]\\n${valOut}\\n`;
        } catch (valException) {
            output += `\\n[terraform validate failed or skipped]\\n${valException.message}\\n`;
        }

        // 6. Run Terraform Plan (Preview changes)
        try {
            const { stdout: planOut } = await execPromise('terraform plan', { cwd: tempDir });
            output += `\n[terraform plan]\n${planOut}\n`;
        } catch (err) {
            output += `\n[terraform plan failed]\n${err.message}\n`;
        }

        status = 'FAILED';

        try {
            const { stdout: applyOut } = await execPromise(
                'terraform apply -auto-approve',
                { cwd: tempDir }
            );
            output += `\n[terraform apply]\n${applyOut}\n`;
            status = 'CREATED';
        } catch (err) {
            output += `\n[terraform apply failed]\n${err.message}\n`;
        }


        // 6. Save Resource to DB
        const savedResource = new Resource({
            sessionId,
            resourceType,
            name: resourceName,
            region: collectedData.region,
            details: collectedData,
            terraformCode: tfCode,
            status
        });
        await savedResource.save();

        output += `\\nResource successfully stored in Database with status: ${status}.`;

        return { output, tfCode, resource: savedResource };

    } catch (error) {
        console.error("Terraform Service Error:", error);
        return { output: `Error generating infrastructure: ${error.message}` };
    }
};
