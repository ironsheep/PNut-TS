/* eslint-disable no-console */
import * as ts from 'typescript';

function analyzeFile(fileName: string) {
  const program = ts.createProgram([fileName], {});
  const sourceFile = program.getSourceFile(fileName);

  if (!sourceFile) {
    throw new Error(`File ${fileName} not found`);
  }

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isClassDeclaration(node) && node.name) {
      console.log(`Class: ${node.name.text}`);
      node.members.forEach((member) => {
        if (ts.isMethodDeclaration(member) && member.name) {
          console.log(`  Method: ${member.name.getText()}`);
        } else if (ts.isPropertyDeclaration(member) && member.name) {
          console.log(`  Property: ${member.name.getText()}`);
        }
      });
    }
    ts.forEachChild(node, visit);
  });
}

analyzeFile('path/to/your/file.ts');
