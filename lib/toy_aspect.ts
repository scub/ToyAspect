#!/usr/bin/env node

import { Annotations, IAspect, Tokenization } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { CfnDBCluster } from 'aws-cdk-lib/aws-rds';


export class ToyAspect implements IAspect {
    public visit(node: IConstruct): void {
      
      // Because aspects operate on the rendered cloudformation you'll 
      // always be dealing with the L1 Cfn-version of those constructs.
      if (node instanceof CfnBucket) {

        // Check to ensure the property is defined and exclude
        // the case where the property can be a token (IResolvable).
        if (!node.versioningConfiguration
          || (!Tokenization.isResolvable(node.versioningConfiguration)
              && node.versioningConfiguration.status !== 'Enabled')) {
                  Annotations.of(node).addWarning('Bucket versioning was enabled');
                  node.versioningConfiguration = {
                    status: 'Enabled'
                  }
        }
      }

      // Check for database cluster
      if (node instanceof CfnDBCluster) {

        // Verify encrypted storage
        if (!node.storageEncrypted
            || (!Tokenization.isResolvable(node.storageEncrypted)
                && node.storageEncrypted !== true)) {
            Annotations.of(node).addWarning('Storage encryption was not enabled');
            node.storageEncrypted = true;
        }

        // Verify backup retention period
        if (!node.backupRetentionPeriod
            || (!Tokenization.isResolvable(node.backupRetentionPeriod)
                && node.backupRetentionPeriod < 7)) {
            Annotations.of(node).addWarning('Backup retention period was less than 7 days');
            node.backupRetentionPeriod = 7;
        }
      }
    }
}