"use strict";
/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ast_value_1 = require("../javascript/ast-value");
const class_scanner_1 = require("../javascript/class-scanner");
const esutil = require("../javascript/esutil");
const esutil_1 = require("../javascript/esutil");
const jsdoc = require("../javascript/jsdoc");
const polymer_element_mixin_1 = require("./polymer-element-mixin");
const polymer2_config_1 = require("./polymer2-config");
class MixinVisitor {
    constructor(document) {
        this.mixins = [];
        this._currentMixin = null;
        this._currentMixinNode = null;
        this._currentMixinFunction = null;
        this.warnings = [];
        this._document = document;
    }
    enterAssignmentExpression(node, parent) {
        if (parent.type !== 'ExpressionStatement') {
            return;
        }
        const parentComments = esutil.getAttachedComment(parent) || '';
        const parentJsDocs = jsdoc.parseJsdoc(parentComments);
        if (hasMixinFunctionDocTag(parentJsDocs)) {
            const name = ast_value_1.getIdentifierName(node.left);
            const namespacedName = name ? ast_value_1.getNamespacedIdentifier(name, parentJsDocs) : undefined;
            const sourceRange = this._document.sourceRangeForNode(node);
            const summaryTag = jsdoc.getTag(parentJsDocs, 'summary');
            if (namespacedName) {
                this._currentMixin = new polymer_element_mixin_1.ScannedPolymerElementMixin({
                    name: namespacedName,
                    sourceRange,
                    astNode: node,
                    description: parentJsDocs.description,
                    summary: (summaryTag && summaryTag.description) || '',
                    privacy: esutil_1.getOrInferPrivacy(namespacedName, parentJsDocs),
                    jsdoc: parentJsDocs,
                    mixins: jsdoc.getMixinApplications(this._document, node, parentJsDocs, this.warnings),
                });
                this._currentMixinNode = node;
                this.mixins.push(this._currentMixin);
            }
            else {
                // TODO(rictic): warn for a mixin whose name we can't determine.
            }
        }
    }
    enterFunctionDeclaration(node, _parent) {
        const nodeComments = esutil.getAttachedComment(node) || '';
        const nodeJsDocs = jsdoc.parseJsdoc(nodeComments);
        if (hasMixinFunctionDocTag(nodeJsDocs)) {
            const name = node.id.name;
            const namespacedName = name ? ast_value_1.getNamespacedIdentifier(name, nodeJsDocs) : undefined;
            const sourceRange = this._document.sourceRangeForNode(node);
            this._currentMixinFunction = node;
            const summaryTag = jsdoc.getTag(nodeJsDocs, 'summary');
            if (namespacedName) {
                this._currentMixin = new polymer_element_mixin_1.ScannedPolymerElementMixin({
                    name: namespacedName,
                    sourceRange,
                    astNode: node,
                    description: nodeJsDocs.description,
                    summary: (summaryTag && summaryTag.description) || '',
                    privacy: esutil_1.getOrInferPrivacy(namespacedName, nodeJsDocs),
                    jsdoc: nodeJsDocs,
                    mixins: jsdoc.getMixinApplications(this._document, node, nodeJsDocs, this.warnings)
                });
                this._currentMixinNode = node;
                this.mixins.push(this._currentMixin);
            }
            else {
                // Warn about a mixin whose name we can't infer.
            }
        }
    }
    leaveFunctionDeclaration(node, _parent) {
        if (this._currentMixinNode === node) {
            this._currentMixin = null;
            this._currentMixinNode = null;
            this._currentMixinFunction = null;
        }
    }
    enterVariableDeclaration(node, _parent) {
        const comment = esutil.getAttachedComment(node) || '';
        const docs = jsdoc.parseJsdoc(comment);
        const isMixin = hasMixinFunctionDocTag(docs);
        const sourceRange = this._document.sourceRangeForNode(node);
        const summaryTag = jsdoc.getTag(docs, 'summary');
        if (isMixin) {
            let mixin = undefined;
            if (node.declarations.length === 1) {
                const declaration = node.declarations[0];
                const name = ast_value_1.getIdentifierName(declaration.id);
                if (name) {
                    const namespacedName = ast_value_1.getNamespacedIdentifier(name, docs);
                    mixin = new polymer_element_mixin_1.ScannedPolymerElementMixin({
                        name: namespacedName,
                        sourceRange,
                        astNode: node,
                        description: docs.description,
                        summary: (summaryTag && summaryTag.description) || '',
                        privacy: esutil_1.getOrInferPrivacy(namespacedName, docs),
                        jsdoc: docs,
                        mixins: jsdoc.getMixinApplications(this._document, declaration, docs, this.warnings)
                    });
                }
            }
            if (mixin) {
                this._currentMixin = mixin;
                this._currentMixinNode = node;
                this.mixins.push(this._currentMixin);
            }
            else {
                // TODO(rictic); warn about being unable to determine mixin name.
            }
        }
    }
    leaveVariableDeclaration(node, _parent) {
        if (this._currentMixinNode === node) {
            this._currentMixin = null;
            this._currentMixinNode = null;
            this._currentMixinFunction = null;
        }
    }
    enterFunctionExpression(node, _parent) {
        if (this._currentMixin != null && this._currentMixinFunction == null) {
            this._currentMixinFunction = node;
        }
    }
    enterArrowFunctionExpression(node, _parent) {
        if (this._currentMixin != null && this._currentMixinFunction == null) {
            this._currentMixinFunction = node;
        }
    }
    enterClassExpression(node, parent) {
        if (parent.type !== 'ReturnStatement' &&
            parent.type !== 'ArrowFunctionExpression') {
            return;
        }
        this._handleClass(node);
    }
    enterClassDeclaration(node, _parent) {
        const comment = esutil.getAttachedComment(node) || '';
        const docs = jsdoc.parseJsdoc(comment);
        const isMixinClass = hasMixinClassDocTag(docs);
        if (isMixinClass) {
            this._handleClass(node);
        }
    }
    _handleClass(node) {
        const mixin = this._currentMixin;
        if (mixin == null) {
            return;
        }
        mixin.classAstNode = node;
        const constructorProperties = class_scanner_1.extractPropertiesFromConstructor(node, this._document);
        for (const prop of constructorProperties.values()) {
            mixin.addProperty(prop);
        }
        polymer2_config_1.getPolymerProperties(node, this._document)
            .forEach((p) => mixin.addProperty(p));
        esutil_1.getMethods(node, this._document).forEach((m) => mixin.addMethod(m));
        esutil_1.getStaticMethods(node, this._document)
            .forEach((m) => mixin.staticMethods.set(m.name, m));
        mixin.events = esutil.getEventComments(node);
        // mixin.sourceRange = this._document.sourceRangeForNode(node);
        return mixin;
    }
}
exports.MixinVisitor = MixinVisitor;
function hasMixinFunctionDocTag(docs) {
    // TODO(justinfagnani): remove polymerMixin support
    return (jsdoc.hasTag(docs, 'polymer') &&
        jsdoc.hasTag(docs, 'mixinFunction')) ||
        jsdoc.hasTag(docs, 'polymerMixin');
}
exports.hasMixinFunctionDocTag = hasMixinFunctionDocTag;
function hasMixinClassDocTag(docs) {
    // TODO(justinfagnani): remove polymerMixinClass support
    return (jsdoc.hasTag(docs, 'polymer') && jsdoc.hasTag(docs, 'mixinClass')) ||
        jsdoc.hasTag(docs, 'polymerMixinClass');
}
exports.hasMixinClassDocTag = hasMixinClassDocTag;

//# sourceMappingURL=polymer2-mixin-scanner.js.map
