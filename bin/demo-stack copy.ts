#!/usr/bin/env node

import { Annotations, Aspects, IAspect, Stack, StackProps, Tokenization } from 'aws-cdk-lib';
import { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { AuroraMysqlEngineVersion, AuroraPostgresEngineVersion, CfnDBCluster, ClusterInstance, DatabaseCluster, DatabaseClusterEngine, DatabaseInstanceEngine, EngineVersion, MysqlEngineVersion, ParameterGroup } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ToyAspect } from '../lib/toy_aspect';

const app = new cdk.App();

export class TestStack extends Stack {
  public db: DatabaseCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
        
    // const bucket = new Bucket(this, 'AspectTestBucket', {
    //     removalPolicy: cdk.RemovalPolicy.DESTROY,  
    // });
    
    // const vpc = new Vpc(this, 'AspectTestVPC');
    const vpc = Vpc.fromLookup(this, 'AspectTestVPC', {
      vpcId: 'vpc-08e224cd5b21f43ba'
    });

    const clusterParameterGroup = new ParameterGroup(this, 'AspectTestParameterGroup', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      description: 'Custom database cluster parameter group',
    });

    // const instanceParameterGroup = new ParameterGroup(this, 'ApsectTestInstanceParameterGroup', {
    //   engine: DatabaseClusterEngine.AURORA_MYSQL,
    //   description: 'custom instance param group',
    //   parameters: {
    //     'server_audit_logging': 'ON' 
    //   }
    // })

    this.db = new DatabaseCluster(this, 'AspectTestDB', {
        engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_2_12_0 }),
        writer: ClusterInstance.provisioned('Instance1', {
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
            // parameterGroup: clusterParameterGroup,
        }),
        parameterGroup: clusterParameterGroup,
        vpc: vpc,
    }); 
  }
}

const stack = new TestStack(app, 'AspectTestStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

Aspects.of(app).add(new ToyAspect());