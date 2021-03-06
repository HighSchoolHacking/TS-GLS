import * as tsutils from "tsutils";
import * as ts from "typescript";

import { INodeAliaser, IPrivacyName, IReturningNode } from "../../nodes/aliaser";
import { BudgieLine } from "../../output/budgieLine";
import { TypeFlagsResolver } from "../flags";
import { parseRawTypeToBudgie } from "../types";

import { ArrayLiteralExpressionAliaser } from "./arrayLiteralExpressionAliaser";
import { ElementAccessExpressionAliaser } from "./elementAccessExpressionAliaser";
import { NewExpressionAliaser } from "./newExpressionAliaser";
import { NumericAliaser } from "./numericAliaser";
import { PropertyOrVariableDeclarationAliaser } from "./propertyOrVariableDeclarationAliaser";
import { TypeLiteralAliaser } from "./typeLiteralAliaser";
import { TypeNameAliaser } from "./typeNameAliaser";

type INodeChildPasser = (node: ts.Node) => ts.Node;

const createChildGetter = (index = 0) => (node: ts.Node) => node.getChildren()[index];

interface IIntrinsicSignatureReturnType extends ts.Type {
    /**
     * @remarks This is private within TypeScript, and might change in the future.
     */
    intrinsicName: string;
}

const recursiveFriendlyValueDeclarationTypes = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.Parameter,
    ts.SyntaxKind.PropertyDeclaration,
    ts.SyntaxKind.VariableDeclaration,
]);

export class RootAliaser implements RootAliaser {
    private readonly flagResolver: TypeFlagsResolver;
    private readonly passThroughTypes: Map<ts.SyntaxKind, INodeChildPasser>;
    private readonly sourceFile: ts.SourceFile;
    private readonly typesWithKnownTypeNames: Map<ts.SyntaxKind, INodeAliaser>;
    private readonly typeChecker: ts.TypeChecker;

    public constructor(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
        this.flagResolver = new TypeFlagsResolver();
        this.sourceFile = sourceFile;
        this.typeChecker = typeChecker;

        this.passThroughTypes = new Map<ts.SyntaxKind, INodeChildPasser>([
            [ts.SyntaxKind.ExpressionStatement, createChildGetter()],
            [ts.SyntaxKind.ParenthesizedExpression, createChildGetter()],
            [ts.SyntaxKind.ParenthesizedType, createChildGetter()],
            [ts.SyntaxKind.SyntaxList, createChildGetter()],
        ]);

        this.typesWithKnownTypeNames = new Map<ts.SyntaxKind, INodeAliaser>([
            [ts.SyntaxKind.ArrayLiteralExpression, new ArrayLiteralExpressionAliaser(typeChecker, this.getFriendlyTypeName)],
            [ts.SyntaxKind.BooleanKeyword, new TypeNameAliaser("boolean")],
            [ts.SyntaxKind.ElementAccessExpression, new ElementAccessExpressionAliaser(typeChecker, this.getFriendlyTypeName)],
            [ts.SyntaxKind.FalseKeyword, new TypeNameAliaser("boolean")],
            [ts.SyntaxKind.NewExpression, new NewExpressionAliaser(this.sourceFile)],
            [ts.SyntaxKind.NumericLiteral, new NumericAliaser(this.sourceFile)],
            [ts.SyntaxKind.TrueKeyword, new TypeNameAliaser("boolean")],
            [ts.SyntaxKind.TypeLiteral, new TypeLiteralAliaser(typeChecker, this.getFriendlyTypeName)],
            [ts.SyntaxKind.StringKeyword, new TypeNameAliaser("string")],
            [ts.SyntaxKind.StringLiteral, new TypeNameAliaser("string")],
            [ts.SyntaxKind.VariableDeclaration, new PropertyOrVariableDeclarationAliaser(typeChecker, this.getFriendlyTypeName)],
        ]);
    }

    public readonly getFriendlyTypeName = (node: ts.Node): string | BudgieLine | undefined => {
        const knownTypeNameConverter = this.typesWithKnownTypeNames.get(node.kind);
        if (knownTypeNameConverter !== undefined) {
            const typeNameConverted = knownTypeNameConverter.getFriendlyTypeName(node);
            if (typeNameConverted !== undefined) {
                return typeNameConverted;
            }
        }

        const passThroughType = this.passThroughTypes.get(node.kind);
        if (passThroughType !== undefined) {
            return this.getFriendlyTypeName(passThroughType(node));
        }

        // We use the real type checker last because our checks can know the difference
        // between seemingly identical types, such as "float" or "int" within "number"
        const typeAtLocation = this.typeChecker.getTypeAtLocation(node);
        const resolvedFlagType = this.flagResolver.resolve(typeAtLocation.flags);
        if (resolvedFlagType !== undefined) {
            return resolvedFlagType;
        }

        // TypeScript won't give up expression nodes' types, but if they have a type symbol
        // we can use it to find their value declaration
        const symbol = this.typeChecker.getSymbolAtLocation(node);

        if (symbol !== undefined && symbol.valueDeclaration !== undefined) {
            const valueDeclaration = symbol.valueDeclaration;

            if (recursiveFriendlyValueDeclarationTypes.has(valueDeclaration.kind)) {
                return this.getFriendlyTypeName(valueDeclaration);
            }
        }

        // By now, this is probably a node with a non-primitive type, such as a class instance.

        if (ts.isParameter(node) || ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) {
            if (node.type !== undefined) {
                return this.getFriendlyTypeName(node.type);
            }
        }

        if (ts.isTypeNode(node)) {
            return parseRawTypeToBudgie(node.getText());
        }

        // This seems to sometimes succeed when directly calling getSymbolAtLocation doesn't
        const typeSymbol = typeAtLocation.symbol;
        if (typeSymbol !== undefined && typeSymbol.name !== "unknown") {
            return typeSymbol.name;
        }

        return undefined;
    };

    public getFriendlyPrivacyName(node: ts.Node): IPrivacyName {
        if (tsutils.hasModifier(node.modifiers, ts.SyntaxKind.PrivateKeyword)) {
            return "private";
        }

        if (tsutils.hasModifier(node.modifiers, ts.SyntaxKind.ProtectedKeyword)) {
            return "protected";
        }

        return "public";
    }

    public getFriendlyReturnTypeName(node: IReturningNode): string | BudgieLine | undefined {
        // If the node explicitly mentions a return type, use that
        if (node.type !== undefined) {
            return this.getFriendlyTypeName(node.type);
        }

        // The rest of this logic attempts to use the type checker to get a computed type symbol
        const typeAtLocation = this.typeChecker.getTypeAtLocation(node);
        const signaturesOfType = this.typeChecker.getSignaturesOfType(typeAtLocation, ts.SignatureKind.Call);
        if (signaturesOfType.length !== 1) {
            return undefined;
        }

        const signatureOfType = signaturesOfType[0];
        const signatureReturnType = signatureOfType.getReturnType();

        const symbol = signatureReturnType.getSymbol();
        if (symbol !== undefined) {
            return symbol.getName();
        }

        return (signatureReturnType as IIntrinsicSignatureReturnType).intrinsicName;
    }
}
