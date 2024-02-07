#!/usr/bin/env node

import { Annotations, Aspects, IAspect, Stack, StackProps, Tokenization } from 'aws-cdk-lib';
import { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { AuroraPostgresEngineVersion, CfnDBCluster, ClusterInstance, DatabaseCluster, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ToyAspect } from '../lib/toy_aspect';

const app = new cdk.App();

export class TestStack extends Stack {
  public db: DatabaseCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
        
    const bucket = new Bucket(this, 'AspectTestBucket', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,  
    });
    
    const vpc = new Vpc(this, 'AspectTestVPC');
    this.db = new DatabaseCluster(this, 'AspectTestDB', {
        engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_2 }),
        writer: ClusterInstance.provisioned('Instance1', {
            instanceType: InstanceType.of(InstanceClass.R5, InstanceSize.MEDIUM)            
        }),
        vpc: vpc,
    }); 
  }
}


const stack = new TestStack(app, 'AspectTestStack');

Aspects.of(stack).add(new ToyAspect());