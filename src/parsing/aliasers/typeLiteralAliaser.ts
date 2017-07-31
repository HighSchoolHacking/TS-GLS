import { TypeLiteralNode } from "typescript";

import { GlsLine } from "../../glsLine";
import { getDictionaryTypeNameFromNode } from "../dictionaries";
import { RecursiveAliaser } from "./recursiveAliaser";

export class TypeLiteralAliaser extends RecursiveAliaser {
    public getFriendlyTypeNameForNode(node: TypeLiteralNode): string | GlsLine {
        return getDictionaryTypeNameFromNode(node, this.recurseOntoNode);
    }
}