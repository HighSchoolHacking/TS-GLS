import { CommandNames } from "budgie";
import * as ts from "typescript";

import { BudgieLine } from "../../output/budgieLine";
import { Transformation } from "../../output/transformation";
import { NodeVisitor } from "../visitor";

export class ThisExpressionVisitor extends NodeVisitor {
    public visit(node: ts.ThisExpression) {
        return [Transformation.fromNode(node, this.sourceFile, [new BudgieLine(CommandNames.This)])];
    }
}
