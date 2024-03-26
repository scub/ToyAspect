#!/usr/bin/env node

import { Aspects, Annotations, IAspect, Tokenization, Stack, StackProps } from 'aws-cdk-lib';
import { AuroraMysqlEngineVersion, DatabaseCluster, DatabaseClusterEngine, ParameterGroup, CfnDBCluster, CfnDBClusterParameterGroup, CfnDBInstance } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { IConstruct, Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';


export class ToyAspect implements IAspect {
    public visit(node: IConstruct): void {
      
      // Verify DatabaseCluster settings
      if (node instanceof CfnDBCluster) {

        // Aurora-MySQL specific settings
        if (!node.engine
            || (!Tokenization.isResolvable(node.engine)
                && node.engine === 'aurora-mysql')) {

            /****
             * Validate the cluster parameter group settings have binlog_format and max_connections set
             **/
            if (!node.dbClusterParameterGroupName
              || (!Tokenization.isResolvable(node.dbClusterParameterGroupName)
                 && !node.dbClusterParameterGroupName.match(/^default\.aurora\-.*$/))) {

              Annotations.of(node).addInfo('Non-default ParameterGroup detected, it needs to be modified to set our desired binlog_format, and max_connections.')
              if (node.dbClusterParameterGroupName !== undefined) {
 

                // Traverse the construct tree starting from the root to first 
                // find the stack then the database cluster parameter group
                node.node.root.node.children.forEach((child) => {
                    if (child instanceof Stack) {
                      console.log("found stack to traverse")

                    // dbClusterParameterGroupName: '${Token[TOKEN.148]}'
                    }
                })
                console.log(`Are we a stack? ${node.node.root.node.children[0] instanceof Stack}`)

              } else {
                 Annotations.of(node).addError('Aspect unable to dereference the DatabaseCluster ParameterGroup.')
              }
           }
         }
      }

      if (node instanceof CfnDBInstance) {
        if (!node.dbParameterGroupName
          || (!Tokenization.isResolvable(node.dbParameterGroupName)
             && node.dbParameterGroupName === undefined)) {

          Annotations.of(node).addInfo('No DatabaseInstance ParameterGroup was present, a new one was created to enable server_audit_logging, and set server_audit_events.')
          node.addDependency(new CfnDBClusterParameterGroup(node, 'DBInstanceParameterGroup', {
            dbClusterParameterGroupName: `${node.logicalId}Instance`,
            description: 'Custom database cluster parameter group',
            family: 'aurora-mysql5.7',
            parameters: {
              'server_audit_logging': 'ON',
              'server_audit_events': 'QUERY_DDL'
            }
          }));
        }
      }
    }


    private findOtherResource(root: IConstruct): Stack | CfnDBClusterParameterGroup | undefined {
      // Traverse the construct tree starting from the root to first find the stack then the resource
      // This is a simplified example; actual implementation might involve more complex logic
      for (const child of root.node.children) {

        if (child instanceof Stack) {
          console.log("found stack to traverse")
          return child;
        }
  
        const found = this.findOtherResource(child);
        if (found) {
          return found;
        }
      }
  
      return undefined;
    }

}









const app = new cdk.App();

export class TestStack extends Stack {
  public db: DatabaseCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const vpc = new Vpc(this, 'AspectTestVPC');

    const clusterParameterGroup = new ParameterGroup(this, 'AspectTestParameterGroup', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      description: 'Custom database cluster parameter group',
    });

    const instanceParameterGroup = new ParameterGroup(this, 'ApsectTestInstanceParameterGroup', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      description: 'custom instance parameter group',
      parameters: {
        'server_audit_logging': 'ON' 
      }
    })

    this.db = new DatabaseCluster(this, 'AspectTestDB', {
        engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_2_12_0 }),
        writer: ClusterInstance.provisioned('Instance1', {
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
            parameterGroup: instanceParameterGroup,
        }),
        parameterGroup: clusterParameterGroup,
        vpc: vpc,
    }); 
  }
}

const stack = new TestStack(app, 'AspectTestStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});

Aspects.of(stack).add(new ToyAspect());

