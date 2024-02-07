import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ToyAspect } from '../lib/toy_aspect';
import { AuroraPostgresEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';
import { Aspects, Duration } from 'aws-cdk-lib';

let stack: cdk.Stack;
let vpc: Vpc;
let bucket: Bucket;
let db: DatabaseCluster;

describe('Aspect testing for defaults', () => {
  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new Vpc(stack, 'VPC');
    bucket = new Bucket(stack, 'TestBucket');
  });

  test('S3 bucket defaults have versioning disabled', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: Match.absent()
    });
  });

  test('S3 bucket versioning is enabled when the aspect is applied to the default configuration', () => {
    Aspects.of(stack).add(new ToyAspect());
    
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    });
  });
});

describe('Aspect testing to revert explicit configuration', () => {
  beforeEach(() => {
    stack = new cdk.Stack();
    bucket = new Bucket(stack, 'TestBucket', {
      versioned: false
    });
  });

  test('S3 bucket has explicitly disabled versioning', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: Match.absent()
    });
  });

  test('S3 bucket versioning is enabled when the aspect is applied despite the explicit configuration', () => {
    Aspects.of(stack).add(new ToyAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    });
  });
});


describe('Aspect testing for RDS defaults', () => {
  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new Vpc(stack, 'TestVpc');
    db = new DatabaseCluster(stack, 'TestDb', {
      vpc: vpc,
      engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_2 }),
      writer: ClusterInstance.provisioned('Instance1', {
        instanceType: InstanceType.of(InstanceClass.R5, InstanceSize.MEDIUM)
      }),
    })
  });

  test('RDS cluster storage encryption is not enabled by default', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: Match.absent()
    });
  });

  test('RDS Cluster backup retention period is not set by default', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: Match.absent()
    });
  });

  test('RDS cluster storage encryption is enabled when aspect is applied', () => {
    Aspects.of(stack).add(new ToyAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true
    });
  });

  test('RDS cluster backup retention period is set to 7 days when aspect is applied', () => {
    Aspects.of(stack).add(new ToyAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 7
    });
  });

});

describe('Aspect testing for reverting specific RDS config', () => {
  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new Vpc(stack, 'TestVpc');
    db = new DatabaseCluster(stack, 'TestDb', {
      vpc: vpc,
      engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_2 }),
      writer: ClusterInstance.provisioned('Instance1', {
        instanceType: InstanceType.of(InstanceClass.R5, InstanceSize.MEDIUM)
      }),
      storageEncrypted: false,
      backup: {
        retention: Duration.days(3)
      }
    })
  });

  test('RDS cluster storage encryption is explicitly disabled', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: false
    });
  });

  test('RDS Cluster backup retention period is explicitly below recommendations', () => {
    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 3
    });
  });

  test('RDS cluster storage encryption is enabled when aspect is applied', () => {
    Aspects.of(stack).add(new ToyAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true
    });
  });

  test('RDS cluster backup retention period is set to recommended practice when aspect is applied', () => {
    Aspects.of(stack).add(new ToyAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 7
    });
  });
});