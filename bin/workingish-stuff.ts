    //         if (!node.dbClusterParameterGroupName
    //           || (!Tokenization.isResolvable(node.dbClusterParameterGroupName)
    //              && !node.dbClusterParameterGroupName.match(/^default\.aurora\-.*$/))) {

    //           Annotations.of(node).addInfo('Non-default ParameterGroup detected, it was modified to set our desired binlog_format, and max_connections.')

    //           if (node.dbClusterParameterGroupName !== undefined) {
 
    //             // const anotherResource = this.findOtherResource(node.node.root)
    //             Annotations.of(node).addInfo('Non-default ParameterGroup detected, it needs to be modified to set our desired binlog_format, and max_connections.')

    //             // this.tryFindResource(node.node.root, 'AWS::RDS::DBParameterGroup')


    //             let paramGroupName = node.dbClusterParameterGroupName;
    //             console.log(`ParameterGroup name ${paramGroupName}`)
                
    //             let root: IConstruct = node.node.root;
    //             let stack: Stack = root.node.children[0] as Stack;
    //             console.log(`Stack name ${stack.node.id}`);

    //             let lookup = ParameterGroup.fromParameterGroupName(node.node.root.node.children[0], 'DBClusterParameterGroup', paramGroupName);
                
    //             node.node.root.node.children.forEach((child) => {
    //                 if (child instanceof Stack) {
    //                   console.log("Found parent stack to traverse")

    //                   child.node.children.forEach((resource) => {
    
    //                     if (resource.node.defaultChild !== undefined) {
    //                       console.log(`Found default child: ${resource.node.id} ${resource.node.path}: ${resource.node.defaultChild} ${resource.node.defaultChild instanceof CfnDBClusterParameterGroup}`);
    //                     } else {
    //                       console.log(`Found resource: ${resource.node.id} at ${resource.node.path}`);
    //                     }

    //                   });

    //                 // dbClusterParameterGroupName: '${Token[TOKEN.148]}'
    //                 // }
    //             });

    //             console.log(`Are we a stack? ${node.node.root.node.children[0] instanceof Stack}`)

    //           } else {
    //              Annotations.of(node).addError('Aspect unable to dereference the DatabaseCluster ParameterGroup.')
    //           }
    //           //  if (parameterGroupFamily !== undefined) {
    //           //    node.addDependency(new CfnDBClusterParameterGroup(node, 'DBClusterParameterGroup', {
    //           //      dbClusterParameterGroupName: `${node.logicalId}Cluster`,
    //           //      family: parameterGroupFamily,
    //           //      description: 'Custom database cluster parameter group',
    //           //      parameters: {
    //           //        'binlog_format': 'MIXED',
    //           //        'max_connections': '16000',
    //           //      }
    //           //    }));
    //           //  } else {
    //           //  }
    //        }
    //      }
    //   }

    //   if (node instanceof CfnDBInstance) {
    //     if (!node.dbParameterGroupName
    //       || (!Tokenization.isResolvable(node.dbParameterGroupName)
    //          && node.dbParameterGroupName === undefined)) {

    //       Annotations.of(node).addInfo('No DatabaseInstance ParameterGroup was present, a new one was created to enable server_audit_logging, and set server_audit_events.')
    //       node.addDependency(new CfnDBClusterParameterGroup(node, 'DBInstanceParameterGroup', {
    //         dbClusterParameterGroupName: `${node.logicalId}Instance`,
    //         description: 'Custom database cluster parameter group',
    //         family: 'aurora-mysql5.7',
    //         parameters: {
    //           'server_audit_logging': 'ON',
    //           'server_audit_events': 'QUERY_DDL'
    //         }
    //       }));
    //     }
    //   }

    //   if (node instanceof CfnDBClusterParameterGroup) {
    //     // Verify we're attaching to an aurora-mysql cluster
    //     if (!node.family
    //       || (!Tokenization.isResolvable(node.family)
    //           && node.family.match(/^aurora-mysql.*$/))) {
    //       Annotations.of(node).addInfo('Adding overrides to the parameter groups values for (max_connections, binlog_format, server_audit_logging, server_audit_events)');

    //       const parameterGroup = node as CfnDBClusterParameterGroup;
    //       parameterGroup.addOverride('Properties.Parameters.max_connections', '16000');
    //       parameterGroup.addOverride('Properties.Parameters.binlog_format', 'MIXED');           
    //       parameterGroup.addOverride('Properties.Parameters.server_audit_logging', 'ON');        
    //       parameterGroup.addOverride('Properties.Parameters.server_audit_events', 'QUERY_DDL');
    //     }
    //   }
    // }

    // private tryFindResource(root: IConstruct, cfnResourceType: string ): CfnResource | CfnDBClusterParameterGroup | undefined {

    //   root.node.children.forEach((child) => {
    //     if (child instanceof Stack) {
    //       console.log("Found parent stack to traverse")

    //       child.node.children.forEach((resource) => {

    //         if (resource.node.defaultChild !== undefined) {
    //           console.log(`[${(resource.node.defaultChild as CfnResource).cfnResourceType}](${resource.node.id}) ${resource.node.path}`);

    //           if ((resource.node.defaultChild as CfnResource).cfnResourceType === cfnResourceType) {
    //             let thing: CfnResource = resource.node.defaultChild as CfnResource; 
    //             console.log(`bingo? ${resource.node.defaultChild instanceof CfnDBClusterParameterGroup}`);
    //           }
    //         } else {
    //           console.log(`Unable to translate to CfnResource: ${resource.node.id} at ${resource.node.path} `)
    //         }

    //       });

    //     // dbClusterParameterGroupName: '${Token[TOKEN.148]}'
    //     }
    //   });

    //   return undefined;
    // }