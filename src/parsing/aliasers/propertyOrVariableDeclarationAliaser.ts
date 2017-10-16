import { PropertyDeclaration, VariableDeclaration } from "typescript";

import { GlsLine } from "../../output/glsLine";
import { RecursiveAliaser } from "./recursiveAliaser";

export class PropertyOrVariableDeclarationAliaser extends RecursiveAliaser {
    public getFriendlyTypeName(node: PropertyDeclaration | VariableDeclaration): string | GlsLine | undefined {
        if (node.type !== undefined) {
            return this.recurseOntoNode(node.type);
        }

        if (node.initializer !== undefined) {
            return this.recurseOntoNode(node.initializer);
        }

        return undefined;
    }
}