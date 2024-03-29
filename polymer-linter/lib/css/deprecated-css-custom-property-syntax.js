"use strict";
/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const polymer_analyzer_1 = require("polymer-analyzer");
const shady = require("shady-css-parser");
const rule_1 = require("../css/rule");
const registry_1 = require("../registry");
const util_1 = require("../util");
class DeprecatedCustomPropertySyntax extends rule_1.CssRule {
    constructor() {
        super(...arguments);
        this.code = 'deprecated-css-custom-property-syntax';
        this.description = util_1.stripIndentation(`
      Warns when using deprecated css syntax around CSS Custom Properties.
  `);
    }
    checkDocument(parsedDocument, _document) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            for (const node of parsedDocument) {
                this.addAtApplyWarnings(node, parsedDocument, warnings);
                this.addVarSyntaxWarnings(node, parsedDocument, warnings);
            }
            return warnings;
        });
    }
    // Convert `@apply(--foo);` to `@apply foo;`
    addAtApplyWarnings(node, parsedDocument, warnings) {
        if (node.type === shady.nodeType.atRule && node.name === 'apply') {
            if (node.parametersRange && node.parameters.startsWith('(') &&
                node.parameters.endsWith(')')) {
                warnings.push(new polymer_analyzer_1.Warning({
                    code: 'at-apply-with-parens',
                    parsedDocument,
                    severity: polymer_analyzer_1.Severity.ERROR,
                    sourceRange: parsedDocument.sourceRangeForShadyRange(node.parametersRange),
                    message: '@apply with parentheses is deprecated. Prefer: @apply --foo;',
                    fix: [
                        {
                            range: parsedDocument.sourceRangeForShadyRange({
                                start: node.parametersRange.start,
                                end: node.parametersRange.start + 1
                            }),
                            replacementText: ' '
                        },
                        {
                            range: parsedDocument.sourceRangeForShadyRange({
                                start: node.parametersRange.end - 1,
                                end: node.parametersRange.end
                            }),
                            replacementText: ''
                        }
                    ]
                }));
            }
        }
    }
    // Convert `var(--foo, --bar)` to `var(--foo, var(--bar))`
    addVarSyntaxWarnings(node, parsedDocument, warnings) {
        if (node.type === 'expression') {
            const match = node.text.match(/var\s*\(\s*--[a-zA-Z0-9_-]+\s*,\s*(--[a-zA-Z0-9_-]+)\s*\)/);
            if (match) {
                const offsetOfVarInsideExpression = match.index;
                const offsetOfSecondCustomPropWithinVar = match[0].match(/--[a-zA-Z0-9_-]+\s*\)$/).index;
                const secondCustomProp = match[1];
                const newText = `var(${secondCustomProp})`;
                const start = node.range.start + offsetOfVarInsideExpression +
                    offsetOfSecondCustomPropWithinVar;
                const end = start + secondCustomProp.length;
                const sourceRange = parsedDocument.sourceRangeForShadyRange({ start, end });
                warnings.push(new polymer_analyzer_1.Warning({
                    code: 'invalid-second-arg-to-var-expression',
                    severity: polymer_analyzer_1.Severity.WARNING, parsedDocument, sourceRange,
                    message: 'When the second argument to a var() expression is another ' +
                        'custom property, it must also be wrapped in a var().',
                    fix: [{ range: sourceRange, replacementText: newText }]
                }));
            }
        }
    }
}
registry_1.registry.register(new DeprecatedCustomPropertySyntax());
//# sourceMappingURL=deprecated-css-custom-property-syntax.js.map