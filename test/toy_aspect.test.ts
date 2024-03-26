import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CloudAspect } from '../lib/toy_aspect';
import { AuroraMysqlEngineVersion, AuroraPostgresEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine, ParameterGroup } from 'aws-cdk-lib/aws-rds';
import { Aspects, Duration } from 'aws-cdk-lib';

let stack: cdk.Stack;
let vpc: Vpc;
let db: DatabaseCluster;
let params: ParameterGroup;

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
    Aspects.of(stack).add(new CloudAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true
    });
  });

  test('RDS cluster backup retention period is set to 7 days when aspect is applied', () => {
    Aspects.of(stack).add(new CloudAspect());

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
    Aspects.of(stack).add(new CloudAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true
    });
  });

  test('RDS cluster backup retention period is set to recommended practice when aspect is applied', () => {
    Aspects.of(stack).add(new CloudAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 7
    });
  });
});

describe('Aspect testing for RDS compliance settings', () => {
  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new Vpc(stack, 'TestVpc');
    params = new ParameterGroup(stack, 'TestParameterGroup', { engine: DatabaseClusterEngine.AURORA_MYSQL });
    db = new DatabaseCluster(stack, 'TestDb', {
      vpc: vpc,
      engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_2_12_0 }),
      writer: ClusterInstance.provisioned('Instance1', {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM)
      }),
      storageEncrypted: false,
      parameterGroup: params,
    });

    // Aspects.of(stack).add(new CloudAspect());
  });

  // test('RDS cluster storage encryption is enabled when aspect is applied', () => {
  //   Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
  //     StorageEncrypted: false
  //   });

  //   Aspects.of(stack).add(new CloudAspect());

  //   Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBCluster', {
  //     StorageEncrypted: true
  //   });
  // });

  test('DBClusterParameterGroup has max_connections and binlog_format set', () => {
    Aspects.of(stack).add(new CloudAspect());

    Template.fromStack(stack).resourceCountIs('AWS::RDS::DBClusterParameterGroup', 2);

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      "Family": "aurora-mysql5.7",
      "Parameters": {
        "binlog_format": "MIXED",
        "max_connections": "16000",
        "server_audit_logging": "ON",
        "server_audit_events": "CONNECT,QUERY_DDL"
      }
    });

    Template.fromStack(stack).hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      "Family": "aurora-mysql5.7",
      "Parameters": {
        "binlog_format": "MIXED",
        "max_connections": "16000"
      }
    });
  });
});