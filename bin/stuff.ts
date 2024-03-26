import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';

class BucketPropertiesAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    // Check if the node is an S3 Bucket
    if (node instanceof s3.CfnBucket) {
      console.log(`Bucket Name: ${node.bucketName}`);
      console.log(`Properties: ${JSON.stringify(node, null, 2)}`);
    }
  }
}

class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Example bucket
    new s3.Bucket(this, 'MyBucket', {
      versioned: true,
    });

    // Apply the aspect to the stack
    cdk.Aspects.of(this).add(new BucketPropertiesAspect());
  }
}

const app = new cdk.App();
new MyStack(app, 'MyStack');
