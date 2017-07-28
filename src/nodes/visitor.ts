import { Node, SourceFile, TypeChecker } from "typescript";

import { Transformation } from "../transformation";
import { INodeAliaser } from "./aliaser";
import { VisitorContext } from "./context";
import { NodeVisitRouter } from "./router";

export interface INodeVisitorDependencies {
    aliaser: INodeAliaser;
    router: NodeVisitRouter;
    sourceFile: SourceFile;
    typeChecker: TypeChecker;
    visitorContext: VisitorContext;
}

/**
 * Creates transformations for a node.
 */
export abstract class NodeVisitor {
    /**
     * Creates transformations for a node.
     *
     * @param node   Node to transform.
     * @returns Transformations for the node, if possible.
     */
    public abstract visit(node: Node): Transformation[] | undefined;

    /**
     * Generates GLS-friendly names for nodes.
     */
    protected readonly aliaser: INodeAliaser;

    /**
     * Shared context for visitors in a file.
     */
    protected readonly context: VisitorContext;

    /**
     * Routes visitors for node types.
     */
    protected readonly router: NodeVisitRouter;

    /**
     * Source file for nodes.
     */
    protected readonly sourceFile: SourceFile;

    /**
     * Type checker for the source file.
     */
    protected readonly typeChecker: TypeChecker;

    /**
     * Initializes a new instance of the NodeVisitor class.
     *
     * @param dependencies   Dependencies to be used for initialization.
     */
    public constructor(dependencies: INodeVisitorDependencies) {
        this.aliaser = dependencies.aliaser;
        this.context = dependencies.visitorContext;
        this.router = dependencies.router;
        this.sourceFile = dependencies.sourceFile;
        this.typeChecker = dependencies.typeChecker;
    }
}
