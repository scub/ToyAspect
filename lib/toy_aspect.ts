#!/usr/bin/env node

import { Annotations, CfnResource, IAspect, Stack, Tokenization } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { CfnDBCluster, CfnDBClusterParameterGroup, CfnDBInstance, CfnOptionGroup, ParameterGroup } from 'aws-cdk-lib/aws-rds';

export class CloudAspect implements IAspect {
    private readonly annotate: boolean;

    constructor(annotate?: boolean) {
        this.annotate = annotate || false;
    }

    public visit(node: IConstruct): void {
        // Verify any DatabaseCluster settings
        if (node instanceof CfnDBCluster) {
            // All storage is encrypted
            if (
                !node.storageEncrypted ||
                (!Tokenization.isResolvable(node.storageEncrypted) && node.storageEncrypted !== true)
            ) {
                this.annotate && Annotations.of(node).addWarning('Storage encryption was not enabled');
                node.storageEncrypted = true;
            }

            // Verify backup retention period
            if (
                !node.backupRetentionPeriod ||
                (!Tokenization.isResolvable(node.backupRetentionPeriod) && node.backupRetentionPeriod < 7)
            ) {
                this.annotate && Annotations.of(node).addWarning('Backup retention period was less than 7 days');
                node.backupRetentionPeriod = 7;
            }

            // Aurora-MySQL specific settings
            if (!node.engine || (!Tokenization.isResolvable(node.engine) && node.engine === 'aurora-mysql')) {
                /****
                 * When clusters have the default cluster parameter group settings
                 **/
                if (
                    !node.dbClusterParameterGroupName ||
                    (!Tokenization.isResolvable(node.dbClusterParameterGroupName) &&
                        node.dbClusterParameterGroupName.match(/^default\.aurora-.*$/))
                ) {
                    const parameterGroupFamily: string | undefined = node.dbClusterParameterGroupName
                        ?.split('default.')
                        .join('');

                    this.annotate &&
                        Annotations.of(node).addInfo(
                            'Default ParameterGroup detected, a new DatabaseCluster ParameterGroup was created to set our desired binlog_format, and max_connections.',
                        );
                    if (parameterGroupFamily !== undefined) {
                        /* Common parameter group settings shared across engine families */
                        const clusterParamProps: { [key: string]: string } = {
                            max_connections: '16000',
                            server_audit_logging: 'ON',
                            server_audit_events: 'CONNECT,QUERY_DDL',
                        };

                        /* Engine family specific parameters */
                        if (parameterGroupFamily === 'aurora-mysql5.7') {
                            clusterParamProps.binlog_format = 'MIXED';
                        } else if (parameterGroupFamily === 'aurora-mysql8.0') {
                            clusterParamProps.gtid_mode = 'ON_PERMISSIVE';
                            clusterParamProps.enforce_gtid_consistency = 'WARN';
                        }

                        const dbClusterParamGroup = new CfnDBClusterParameterGroup(node, 'DBClusterParameterGroup', {
                            dbClusterParameterGroupName: `${node.logicalId}Cluster`,
                            family: parameterGroupFamily,
                            description: 'Custom database cluster parameter group',
                            parameters: {
                                ...clusterParamProps,
                            },
                        });

                        node.dbClusterParameterGroupName = dbClusterParamGroup.dbClusterParameterGroupName;
                        node.addDependency(dbClusterParamGroup);
                    } else {
                        Annotations.of(node).addError(
                            'Aspect unable to determine the family of the DBClusterParameterGroup based on its clusterParameterGroupName.',
                        );
                    }
                }

                /****
                 * When clusters have custom parameter group settings
                 **/
                if (
                    !node.dbClusterParameterGroupName ||
                    (!Tokenization.isResolvable(node.dbClusterParameterGroupName) &&
                        !node.dbClusterParameterGroupName.match(/^default\.aurora-.*$/))
                ) {
                    if (node.dbClusterParameterGroupName !== undefined) {

                        console.log(JSON.stringify(node.node.root))

                        const dbClusterParamGroup = ParameterGroup.fromParameterGroupName(
                            node.node.root.node.children[0], `${node.logicalId}PGI`, node.dbClusterParameterGroupName)
                        
                        // const dbClusterParamGroup = this.tryFindResource(
                        //     node.node.root,
                        //     'AWS::RDS::DBClusterParameterGroup',
                        // ) as CfnDBClusterParameterGroup;
                        if (dbClusterParamGroup !== undefined) {
                            let clusterEngine: string = (dbClusterParamGroup.node.defaultChild as CfnDBClusterParameterGroup).family;
                            
                            /* Common parameter group settings shared across engine families */
                            dbClusterParamGroup.addParameter('server_audit_logging', 'ON');
                            dbClusterParamGroup.addParameter('server_audit_events', 'CONNECT,QUERY_DDL');
                            dbClusterParamGroup.addParameter('max_connections', '16000');
    
                             
                            /* Engine family specific parameters */
                            if (clusterEngine === 'aurora-mysql5.7') {
                                dbClusterParamGroup.addParameter('binlog_format', 'MIXED');
                            } else if (clusterEngine === 'aurora-mysql8.0') {
                                dbClusterParamGroup.addParameter('gtid_mode', 'ON_PERMISSIVE');
                                dbClusterParamGroup.addParameter('enforce_gtid_consistency', 'WARN');
                            }

                            this.annotate &&
                                Annotations.of(node).addInfo(
                                    'Non-default ParameterGroup detected, it was modified to set our desired binlog_format, and max_connections.',
                                );
                        } else {
                            this.annotate &&
                                Annotations.of(node).addError(
                                    'Aspect was unable to find the custom parameter group used by this database cluster.',
                                );
                        }
                    } else {
                        Annotations.of(node).addError(
                            'Aspect was unable to find the reference to the custom parameter group used by this database cluster.',
                        );
                    }
                }
            } // end of CfnDBCluster node.engine === 'aurora-mysql' settings
        }

        // Verify any DatabaseInstance settings
        if (node instanceof CfnDBInstance) {
            if (
                !node.caCertificateIdentifier ||
                (!Tokenization.isResolvable(node.caCertificateIdentifier) &&
                    node.caCertificateIdentifier !== 'rds-ca-rsa4096-g1')
            ) {
                this.annotate &&
                    Annotations.of(node).addWarning('Instance CaCertificate was not set to RDS_CA_RDS4096_G1');
                node.caCertificateIdentifier = 'rds-ca-rsa4096-g1';
            }
        } // end of CfnDBInstance settings
    }

    /**
     * Return the requested object if it can be found otherwise return undefined
     *
     * @param root: IConstruct - The root construct to traverse
     * @param cfnResourceType: string - The cloudformation represenation of the object to find
     *
     * @returns CfnResource|CfnDBClusterParameterGroup|CfnOptionGroup|undefined
     */
    private tryFindResource(
        root: IConstruct,
        cfnResourceType: string,
    ): CfnResource | CfnDBClusterParameterGroup | CfnOptionGroup | undefined {
        let result: CfnResource | CfnOptionGroup | CfnDBClusterParameterGroup | undefined;

        for (const child of root.node.children) {
            if (child instanceof Stack) {
                for (const resource of child.node.children) {
                    if (resource.node.defaultChild !== undefined) {
                        if ((resource.node.defaultChild as CfnResource).cfnResourceType === cfnResourceType) {
                            switch (cfnResourceType) {
                                case 'AWS::RDS::OptionGroup': {
                                    result = resource.node.defaultChild as CfnOptionGroup;
                                    break;
                                }
                                case 'AWS::RDS::DBClusterParameterGroup': {
                                    result = resource.node.defaultChild as CfnDBClusterParameterGroup;
                                    break;
                                }
                                default: {
                                    result = resource.node.defaultChild as CfnResource;
                                    break;
                                }
                            }
                        }
                    } else {
                        // If a resource was created as an CfnResource, it has no defaultChild
                        if (resource instanceof CfnOptionGroup && cfnResourceType === 'AWS::RDS::OptionGroup') {
                            return resource;
                        }
                    }
                }
            }
            if (result) break;
        }

        return result;
    }
}


// import { Annotations, CfnResource, IAspect, Stack, Tokenization } from 'aws-cdk-lib';
// import { IConstruct } from 'constructs';
// import { CfnDBCluster, CfnDBClusterParameterGroup, CfnDBInstance, CfnOptionGroup } from 'aws-cdk-lib/aws-rds';

// export class ToyAspect implements IAspect {

//     public visit(node: IConstruct): void {
      
//       // Verify any DatabaseCluster settings
//       if (node instanceof CfnDBCluster) {

//         // All storage is encrypted
//         if (!node.storageEncrypted
//             || (!Tokenization.isResolvable(node.storageEncrypted)
//                 && node.storageEncrypted !== true)) {
//             Annotations.of(node).addWarning('Storage encryption was not enabled');
//             node.storageEncrypted = true;
//         }

//         // Verify backup retention period
//         if (!node.backupRetentionPeriod
//             || (!Tokenization.isResolvable(node.backupRetentionPeriod)
//                 && node.backupRetentionPeriod < 7)) {
//             Annotations.of(node).addWarning('Backup retention period was less than 7 days');
//             node.backupRetentionPeriod = 7;
//         }

//         // Aurora-MySQL specific settings
//         if (!node.engine
//             || (!Tokenization.isResolvable(node.engine)
//                 && node.engine === 'aurora-mysql')) {

//             /****
//              * When clusters have the default cluster parameter group settings 
//              **/
//             if (!node.dbClusterParameterGroupName
//                || (!Tokenization.isResolvable(node.dbClusterParameterGroupName)
//                   && node.dbClusterParameterGroupName.match(/^default\.aurora\-.*$/))) {
                    
//                 const parameterGroupFamily: string | undefined = node.dbClusterParameterGroupName?.split('default.').join('')

//                 Annotations.of(node).addInfo('Default ParameterGroup detected, a new DatabaseCluster ParameterGroup was created to set our desired binlog_format, and max_connections.')
//                 if (parameterGroupFamily !== undefined) {
//                   node.addDependency(new CfnDBClusterParameterGroup(node, 'DBClusterParameterGroup', {
//                     dbClusterParameterGroupName: `${node.logicalId}Cluster`,
//                     family: parameterGroupFamily,
//                     description: 'Custom database cluster parameter group',
//                     parameters: {
//                       'binlog_format': 'MIXED',
//                       'max_connections': '16000',
//                       'server_audit_logging': 'ON',
//                       'server_audit_events': 'CONNECT,QUERY_DDL',
//                     }
//                   }));
//                 } else {
//                   Annotations.of(node).addError('Aspect unable to determine the family of the DBClusterParameterGroup based on its clusterParameterGroupName.')
//                 }
//             }

//             /****
//              * When clusters have custom parameter group settings 
//              **/
//             if (!node.dbClusterParameterGroupName
//               || (!Tokenization.isResolvable(node.dbClusterParameterGroupName)
//                  && !node.dbClusterParameterGroupName.match(/^default\.aurora\-.*$/))) {

//               if (node.dbClusterParameterGroupName !== undefined) {
//                 let dbClusterParamGroup = this.tryFindResource(node.node.root, 'AWS::RDS::DBClusterParameterGroup') as CfnDBClusterParameterGroup;
//                 if (dbClusterParamGroup !== undefined) {
//                   dbClusterParamGroup.addPropertyOverride('Parameters.binlog_format', 'MIXED');
//                   dbClusterParamGroup.addPropertyOverride('Parameters.max_connections', '16000');
//                   dbClusterParamGroup.addPropertyOverride('Parameters.server_audit_logging', 'ON');
//                   dbClusterParamGroup.addPropertyOverride('Parameters.server_audit_events', 'CONNECT,QUERY_DDL');
//                   Annotations.of(node).addInfo('Non-default ParameterGroup detected, it was modified to set our desired binlog_format, and max_connections.')
//                 } else {
//                   Annotations.of(node).addError('Aspect was unable to find the custom parameter group used by this database cluster.')
//                 }
//               } else {
//                 Annotations.of(node).addError('Aspect was unable to find the reference to the custom parameter group used by this database cluster.')
//               }
//             }

//             console.log(`${node}`);
//           } // end of CfnDBCluster node.engine === 'aurora-mysql' settings
//       }

//       // Verify any DatabaseInstance settings
//       if (node instanceof CfnDBInstance) {


//         if (this.nodeExistsConditional(node, 'caCertificateIdentifier', node.caCertificateIdentifier !== 'rds-ca-rsa4096-g1')) {
//           Annotations.of(node).addWarning('Instance CaCertificate was not set to RDS_CA_RDS4096_G1');
//           node.caCertificateIdentifier = 'rds-ca-rsa4096-g1';
//         }

//         if (this.nodeExists(node, 'caCertificateIdentifier', node => node.caCertificateIdentifier !== 'rds-ca-rsa4096-g1')) {
//           Annotations.of(node).addWarning('Instance CaCertificate was not set to RDS_CA_RDS4096_G1');
//           node.caCertificateIdentifier = 'rds-ca-rsa4096-g1';
//         }

//         if (!node.caCertificateIdentifier
//           || (!Tokenization.isResolvable(node.caCertificateIdentifier)
//               && node.caCertificateIdentifier !== 'rds-ca-rsa4096-g1')) {
//           Annotations.of(node).addWarning('Instance CaCertificate was not set to RDS_CA_RDS4096_G1');
//           node.caCertificateIdentifier = 'rds-ca-rsa4096-g1';
//         }

//         // Aurora-MySQL specific settings
//         if (!node.engine
//           || (!Tokenization.isResolvable(node.engine)
//               && node.engine === 'aurora-mysql')) {

//           let engine = node.engine as string;
//           if (!node.optionGroupName
//             || (!Tokenization.isResolvable(node.optionGroupName)
//                 && node.optionGroupName === undefined)) {

//             // Annotations.of(node).addError('Please add an OptionGroup and associate it with all ClusterInstance(s).')

//           } else if (!node.optionGroupName
//             || (!Tokenization.isResolvable(node.optionGroupName)
//                 && node.optionGroupName !== undefined)) {

//             Annotations.of(node).addInfo('Custom OptionGroup detected, modifying OptionGroup to set our desired server_audit_events.')

//             let dbInstanceOptionGroup = this.tryFindResource(node.node.root, 'AWS::RDS::OptionGroup') as CfnOptionGroup;
//             if (dbInstanceOptionGroup !== undefined) {
//               // dbInstanceOptionGroup.optionConfigurations = [{
//               //   optionName: "MARIADB_AUDIT_PLUGIN",
//               //   optionSettings: [{
//               //     name: "SERVER_AUDIT_EVENTS",
//               //     value: "CONNECT,QUERY_DDL"
//               //   }]
//               // }];
//             } else {
//               Annotations.of(node).addError('Aspect was unable to find the option group used by this database instance.')
//             }
//           }
//         }
//       }

//     }

//     /**
//      * nodeExistsConditional
//      * 
//      * @param node: any - The node that is being checked
//      */
//     private nodeExistsConditional(node: any, nodeName: string, conditional: boolean) {
//       return !node[nodeName] || (!Tokenization.isResolvable(node[nodeName]) && conditional)
//     }
  

//     private nodeExists(node: CfnDBClusterParameterGroup|CfnDBInstance|CfnDBCluster, nodeName: string, conditional: Function) {
//       return !(node as any)[nodeName] || (!Tokenization.isResolvable) && conditional(node)
//     }
  


//     /**
//      * Return the requested object if it can be found otherwise return undefined
//      * 
//      * @param root: IConstruct - The root construct to traverse
//      * @param cfnResourceType: string - The cloudformation represenation of the object to find
//      * 
//      * @returns CfnResource|CfnDBClusterParameterGroup|CfnOptionGroup|undefined
//      */
//     private tryFindResource(root: IConstruct, cfnResourceType: string ): CfnResource | CfnDBClusterParameterGroup | CfnOptionGroup | undefined {

//       let result: CfnResource | CfnOptionGroup | CfnDBClusterParameterGroup | undefined = undefined;

//       for (let child of root.node.children) {
//         if (child instanceof Stack) {

//           for (let resource of child.node.children) {
//             if (resource.node.defaultChild !== undefined) {
//               if ((resource.node.defaultChild as CfnResource).cfnResourceType === cfnResourceType) {
//                 switch (cfnResourceType) {
//                   case 'AWS::RDS::OptionGroup': {
//                     result = resource.node.defaultChild as CfnOptionGroup;
//                     break;
//                   }
//                   case 'AWS::RDS::DBClusterParameterGroup': {
//                     result = resource.node.defaultChild as CfnDBClusterParameterGroup;
//                     break;
//                   }
//                   default: {
//                     result = resource.node.defaultChild as CfnResource;
//                     break;
//                   }
//                 }
//               }
//             } else {
//               // The resource was created as a CfnResource and is the defaultChild
//               if (resource instanceof CfnOptionGroup && cfnResourceType === 'AWS::RDS::OptionGroup') {
//                 return resource;
//               }
//             }
//           }
//         }
//         if (result) break;
//       }

//       return result;
//     }
// }