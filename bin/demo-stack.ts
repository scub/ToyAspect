#!/usr/bin/env node

import { Aspects, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { AuroraMysqlEngineVersion, CaCertificate, CfnDBInstance, CfnOptionGroup, ClusterInstance, DatabaseCluster, DatabaseClusterEngine, DatabaseInstance, DatabaseInstanceEngine, OptionGroup, ParameterGroup, ProvisionedClusterInstanceProps, ServerlessV2ClusterInstanceProps } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
// import { ToyAspect } from '../lib/toy_aspect';
import { CloudAspect } from '../lib/toy_aspect';

const app = new cdk.App();

export class TestStack extends Stack {
  public db: DatabaseCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const vpc = new Vpc(this, 'AspectTestVPC');
    // const vpc = Vpc.fromLookup(this, 'AspectTestVPC', {
    //   vpcId: 'vpc-08e224cd5b21f43ba'
    // });

    // const engine = DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_2_12_0 })

    // const clusterParameterGroup = new ParameterGroup(this, 'AspectTestParameterGroup', {
    //   engine: DatabaseClusterEngine.AURORA_MYSQL,
    //   description: 'Custom database cluster parameter group',
    // });

    const instanceProps: ProvisionedClusterInstanceProps|ServerlessV2ClusterInstanceProps = {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
      // caCertificate: CaCertificate.RDS_CA_RDS4096_G1,
    } 

    this.db = new DatabaseCluster(this, 'AspectTestDB', {
        engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_2_12_0 }),
        writer: ClusterInstance.provisioned('Instance1', {
          ...instanceProps,
        }),
        readers: [
          ClusterInstance.provisioned('Instance2', {
            ...instanceProps,
          })
        ],
        // parameterGroup: clusterParameterGroup,
        vpc: vpc,
    });

    // /** An option group is required to enable DDL logging **/
    // const optionGroup = new CfnOptionGroup(this, 'DBInstanceOptionGroup', {
    //   optionGroupName: `AspectOptionGroup`,
    //   engineName: 'aurora-mysql',
    //   majorEngineVersion: '5.7',  
    //   optionGroupDescription: 'Custom database instance option group',
    //   optionConfigurations: []
    // });

    // // Unlike IDatabaseInstance, the IClusterInstance interface does not currently support providing an option group natively.
    // // We use an escape hatch below to associate the option group with the instances in the cluster.
    // for (let i = 1; i <= this.db.instanceIdentifiers.length; i++) {
    //   const instance = this.db.node.findChild(`Instance${i}`).node.defaultChild as CfnDBInstance;
    //   instance.optionGroupName = optionGroup.optionGroupName;
    // }
    // /** End adding option group **/
  }
}

const stack = new TestStack(app, 'AspectTestStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

Aspects.of(stack).add(new CloudAspect());