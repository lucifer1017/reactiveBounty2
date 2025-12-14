/**
 * @title Transaction Hash Logger
 * @notice Utility to log and save transaction hashes to JSON files
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface TransactionRecord {
  testName: string;
  description: string;
  chain: 'sepolia' | 'local' | 'hardhat';
  txHash: string;
  blockNumber?: bigint;
  timestamp?: number;
  explorerUrl?: string;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: bigint;
  gasPrice?: bigint;
}

class TxLogger {
  private transactions: TransactionRecord[] = [];
  private testSuiteName: string;

  constructor(testSuiteName: string) {
    this.testSuiteName = testSuiteName;
  }

  /**
   * Log a transaction hash
   */
  log(record: Omit<TransactionRecord, 'status'> & { status?: TransactionRecord['status'] }): void {
    const fullRecord: TransactionRecord = {
      status: 'success',
      ...record,
    };
    
    this.transactions.push(fullRecord);
    
    // Log to console
    console.log(`\n📝 TX Logged: ${record.description}`);
    console.log(`   Hash: ${record.txHash}`);
    if (record.explorerUrl) {
      console.log(`   Explorer: ${record.explorerUrl}`);
    }
  }

  /**
   * Save all logged transactions to JSON file
   */
  saveToFile(filename?: string): void {
    const outputDir = join(process.cwd(), 'test-results');
    
    // Create directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filepath = join(outputDir, filename || `${this.testSuiteName}-tx-hashes.json`);
    
    const output = {
      testSuite: this.testSuiteName,
      timestamp: new Date().toISOString(),
      totalTransactions: this.transactions.length,
      transactions: this.transactions,
    };

    writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved ${this.transactions.length} transaction hashes to: ${filepath}`);
  }

  /**
   * Get all logged transactions
   */
  getTransactions(): TransactionRecord[] {
    return this.transactions;
  }

  /**
   * Clear all logged transactions
   */
  clear(): void {
    this.transactions = [];
  }
}

export default TxLogger;

