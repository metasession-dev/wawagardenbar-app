#!/usr/bin/env tsx

/**
 * Diagnostic script to check if XLSX module is properly loaded
 * Run this in production to verify the xlsx package is available
 */

console.log('=== XLSX Module Diagnostic ===\n');

try {
  console.log('1. Attempting to import xlsx module...');
  const XLSX = require('xlsx');
  
  console.log('✓ XLSX module imported successfully');
  console.log('   Type:', typeof XLSX);
  console.log('   Has read method:', typeof XLSX.read === 'function');
  console.log('   Has utils:', typeof XLSX.utils === 'object');
  console.log('   Has version:', XLSX.version || 'unknown');
  
  if (typeof XLSX.read === 'function') {
    console.log('\n2. Testing XLSX.read with sample data...');
    
    // Create a minimal test workbook
    const testData = [
      ['Name', 'Age'],
      ['John', 30],
      ['Jane', 25]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(testData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test');
    
    // Write to buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    console.log('✓ Created test Excel buffer:', buffer.length, 'bytes');
    
    // Try to read it back
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    console.log('✓ Successfully read Excel buffer');
    console.log('   Sheets:', readWb.SheetNames.join(', '));
    
    console.log('\n✅ XLSX module is fully functional!');
  } else {
    console.error('\n❌ XLSX.read is not a function!');
    console.error('   Available methods:', Object.keys(XLSX).join(', '));
  }
  
} catch (error) {
  console.error('\n❌ Error loading XLSX module:');
  console.error('   Message:', error instanceof Error ? error.message : String(error));
  console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
  
  console.log('\n3. Checking node_modules...');
  const fs = require('fs');
  const path = require('path');
  
  const xlsxPath = path.join(process.cwd(), 'node_modules', 'xlsx');
  const xlsxExists = fs.existsSync(xlsxPath);
  
  console.log('   xlsx package exists:', xlsxExists);
  
  if (xlsxExists) {
    const packageJsonPath = path.join(xlsxPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log('   xlsx version:', packageJson.version);
      console.log('   main entry:', packageJson.main);
    }
    
    const files = fs.readdirSync(xlsxPath);
    console.log('   xlsx directory contents:', files.slice(0, 10).join(', '));
  }
}

console.log('\n=== End Diagnostic ===');
