import { CommandNames } from "general-language-syntax";
import * as ts from "typescript";

import { UnsupportedComplaint } from "../../output/complaint";
import { GlsLine } from "../../output/glsLine";
import { Transformation } from "../../output/transformation";
import { NodeVisitor } from "../visitor";

export class EnumDeclarationVisitor extends NodeVisitor {
    public visit(node: ts.EnumDeclaration) {
        const bodyNodes = this.router.recurseIntoNodes(node.members, node);
        if (bodyNodes instanceof UnsupportedComplaint) {
            return bodyNodes;
        }

        const name = node.name.text;

        return [
            Transformation.fromNode(
                node,
                this.sourceFile,
                [
                    new GlsLine(CommandNames.EnumStart, name),
                    ...bodyNodes,
                    new GlsLine(CommandNames.EnumEnd)
                ])
        ];
    }
}