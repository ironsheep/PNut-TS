"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
var ts = require("typescript");
function analyzeFile(fileName) {
    var program = ts.createProgram([fileName], {});
    var sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
        throw new Error("File ".concat(fileName, " not found"));
    }
    ts.forEachChild(sourceFile, function visit(node) {
        if (ts.isClassDeclaration(node) && node.name) {
            console.log("Class: ".concat(node.name.text));
            node.members.forEach(function (member) {
                if (ts.isMethodDeclaration(member) && member.name) {
                    console.log("  Method: ".concat(member.name.getText()));
                }
                else if (ts.isPropertyDeclaration(member) && member.name) {
                    console.log("  Property: ".concat(member.name.getText()));
                }
            });
        }
        ts.forEachChild(node, visit);
    });
}
analyzeFile('path/to/your/file.ts');
